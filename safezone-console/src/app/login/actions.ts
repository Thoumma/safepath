"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
  /** Echoed back so a failed attempt does not clear the field the user typed. */
  email: string;
};

export const initialLoginState: LoginState = { error: null, email: "" };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "ກະລຸນາ ປ້ອນ ອີເມວ ແລະ ລະຫັດຜ່ານ", email };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // One message for both a wrong email and a wrong password, on purpose:
    // distinguishing them tells an attacker which staff emails are real.
    return { error: "ອີເມວ ຫຼື ລະຫັດຜ່ານ ບໍ່ຖືກຕ້ອງ", email };
  }

  // Must stay outside any try/catch — redirect() signals by throwing.
  redirect("/dashboard");
}
