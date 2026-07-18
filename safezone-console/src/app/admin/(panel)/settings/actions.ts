"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PASSPORT_API_KEYS, setSetting } from "@/lib/settings";

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
