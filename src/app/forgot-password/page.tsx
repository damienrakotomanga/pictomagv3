import { Suspense } from "react";
import { AuthEntryPage } from "@/components/auth-entry-page";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AuthEntryPage mode="forgot-password" />
    </Suspense>
  );
}
