"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, initialLoginState } from "./actions";

/**
 * Its own component so `useFormStatus` can read the pending state of the
 * <form> above it — the hook returns nothing when called from the component
 * that renders the form itself.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      <span lang="lo" className="font-lao">
        ເຂົ້າ ສູ່ ລະບົບ
      </span>
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialLoginState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" lang="lo" className="font-lao">
          ອີເມວ
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state.email}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" lang="lo" className="font-lao">
          ລະຫັດຜ່ານ
        </Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      {state.error && (
        // Errors are announced, not just shown — and the red is a real red on a
        // real border, not a tinted whisper.
        <p
          role="alert"
          lang="lo"
          className="border-l-bar border-l-critical bg-critical/10 px-3 py-2 font-lao text-sm leading-lao text-critical-ink"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
