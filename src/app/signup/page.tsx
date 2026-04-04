import { Suspense } from "react";
import { AuthEntryPage } from "@/components/auth-entry-page";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthEntryPage mode="signup" />
    </Suspense>
  );
}
