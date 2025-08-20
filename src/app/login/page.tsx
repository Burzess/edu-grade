import { Suspense } from "react";
import { AuthRedirectGuard } from "@/components/auth/role-guard";
import LoginForm from "./login-form";

export default function LoginPage() {
    return (
        <AuthRedirectGuard>
            <Suspense fallback={<div>Loading form...</div>}>
                <LoginForm />
            </Suspense>
        </AuthRedirectGuard>
    );
}
