import { Suspense } from "react";
import { AuthEntryPage } from "@/components/auth-entry-page";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthEntryPage mode="login" />
    </Suspense>
  );
}
