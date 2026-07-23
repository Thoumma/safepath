"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DONATION_KEYS, PASSPORT_API_KEYS, SMS_KEYS, setSetting } from "@/lib/settings";
import { deleteQr, donationStorageEnabled, uploadQr } from "@/lib/donation-storage";

/** Update the caller's own display name. Self-service: any role. */
export async function updateAccountName(formData: FormData) {
  const staff = await requireStaff();

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) redirect("/admin/settings?account=empty");

  await prisma.staffUser.update({ where: { id: staff.id }, data: { fullName } });
  await prisma.auditLog.create({
    data: {
      actor: staff.email,
      action: "account_update",
      target: staff.email,
      detail: `fullName → ${fullName}`,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/logs");
  redirect("/admin/settings?account=saved");
}

/** Change the caller's own password (Supabase Auth). Self-service: any role.
 *  Validation failures round-trip as ?pw= so the page can show a banner —
 *  the password itself never appears in a URL, log line, or audit row. */
export async function changePassword(formData: FormData) {
  const staff = await requireStaff();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirect("/admin/settings?pw=short");
  if (password !== confirm) redirect("/admin/settings?pw=mismatch");

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/admin/settings?pw=error");

  await prisma.auditLog.create({
    data: {
      actor: staff.email,
      action: "password_change",
      target: staff.email,
    },
  });

  revalidatePath("/logs");
  redirect("/admin/settings?pw=saved");
}

/** Save the ministry passport-API settings. Same authority line as KYC:
 *  an embassy decision, so PARTNER accounts have no say. The API key is
 *  write-only from this form — an empty key field means "keep the saved one",
 *  so the secret never has to round-trip through the browser. */
export async function savePassportApiSettings(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") return;

  const enabled = formData.get("enabled") === "on";
  const url = String(formData.get("url") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const clearKey = formData.get("clearKey") === "on";

  const by = staff.email;
  await setSetting(PASSPORT_API_KEYS.enabled, enabled ? "true" : "false", by);
  await setSetting(PASSPORT_API_KEYS.url, url, by);
  if (clearKey) {
    await setSetting(PASSPORT_API_KEYS.key, "", by);
  } else if (key !== "") {
    await setSetting(PASSPORT_API_KEYS.key, key, by);
  }

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: "settings_update",
      target: "passport_api",
      // Never log the key itself — only what changed about it.
      detail: `enabled=${enabled} url=${url || "—"} key=${
        clearKey ? "cleared" : key !== "" ? "updated" : "unchanged"
      }`,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/kyc");
}

/** Save the SMS-broadcast provider config. Same authority line and secret
 *  handling as the passport API: embassy-only, and the auth token is
 *  write-only — an empty token field means "keep the saved one", so the
 *  secret never round-trips through the browser. Ships disabled; a broadcast
 *  stays in simulate/off until staff fill this in and toggle it on. */
export async function saveSmsSettings(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") return;

  const enabled = formData.get("enabled") === "on";
  const sid = String(formData.get("sid") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const clearToken = formData.get("clearToken") === "on";

  const by = staff.email;
  await setSetting(SMS_KEYS.enabled, enabled ? "true" : "false", by);
  await setSetting(SMS_KEYS.sid, sid, by);
  await setSetting(SMS_KEYS.from, from, by);
  if (clearToken) {
    await setSetting(SMS_KEYS.token, "", by);
  } else if (token !== "") {
    await setSetting(SMS_KEYS.token, token, by);
  }

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: "settings_update",
      target: "sms_provider",
      // Never log the token itself — only what changed about it.
      detail: `enabled=${enabled} sid=${sid || "—"} from=${from || "—"} token=${
        clearToken ? "cleared" : token !== "" ? "updated" : "unchanged"
      }`,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/broadcast");
  redirect("/admin/settings?sms=saved");
}

/** Allowed QR image types + size, mirroring the report-photo ingress. */
const QR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Save the public donation config. Same authority line as the passport API —
 *  an embassy decision, so PARTNER accounts have no say. None of it is secret;
 *  it is meant to be shown publicly, so every field round-trips normally. The
 *  QR image is optional: a new upload replaces (and deletes) the old one, and
 *  the "remove QR" checkbox clears it. Fully audit-logged. */
export async function saveDonationSettings(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") return;

  const enabled = formData.get("enabled") === "on";
  const titleLo = String(formData.get("titleLo") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const blurbLo = String(formData.get("blurbLo") ?? "").trim();
  const blurbEn = String(formData.get("blurbEn") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const bank = String(formData.get("bank") ?? "").trim();
  const removeQr = formData.get("removeQr") === "on";
  const qrFile = formData.get("qr");

  const by = staff.email;

  // Resolve the QR path: keep, replace, or clear. Only touch storage when it is
  // configured; a broken upload never blocks saving the text fields.
  const prevQrPath = String(
    (await prisma.systemSetting.findUnique({ where: { key: DONATION_KEYS.qrPath } }))?.value ?? ""
  );
  let qrPath = prevQrPath;
  let qrChange = "unchanged";

  if (removeQr) {
    if (prevQrPath) await deleteQr(prevQrPath);
    qrPath = "";
    qrChange = "cleared";
  } else if (
    qrFile instanceof File &&
    qrFile.size > 0 &&
    donationStorageEnabled() &&
    QR_TYPES.has(qrFile.type) &&
    qrFile.size <= QR_MAX_BYTES
  ) {
    try {
      const bytes = Buffer.from(await qrFile.arrayBuffer());
      const { path } = await uploadQr(bytes, qrFile.type);
      if (prevQrPath) await deleteQr(prevQrPath);
      qrPath = path;
      qrChange = "updated";
    } catch {
      // Upload failed — keep the previous QR, save the rest.
      qrChange = "upload_failed";
    }
  }

  await setSetting(DONATION_KEYS.enabled, enabled ? "true" : "false", by);
  await setSetting(DONATION_KEYS.titleLo, titleLo, by);
  await setSetting(DONATION_KEYS.titleEn, titleEn, by);
  await setSetting(DONATION_KEYS.blurbLo, blurbLo, by);
  await setSetting(DONATION_KEYS.blurbEn, blurbEn, by);
  await setSetting(DONATION_KEYS.url, url, by);
  await setSetting(DONATION_KEYS.bank, bank, by);
  await setSetting(DONATION_KEYS.qrPath, qrPath, by);

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: "settings_update",
      target: "donation",
      detail: `enabled=${enabled} url=${url || "—"} bank=${bank ? "set" : "—"} qr=${qrChange}`,
    },
  });

  revalidatePath("/settings");
  // Refresh the whole public tree so the nav/footer donate links and the
  // /donate page reflect the new config immediately.
  revalidatePath("/", "layout");
  redirect(`/admin/settings?donation=${qrChange === "upload_failed" ? "qrfail" : "saved"}`);
}
