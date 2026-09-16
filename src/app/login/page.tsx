import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">File Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
