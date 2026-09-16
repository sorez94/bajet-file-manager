import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** For use in server components/layouts/pages. Redirects to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For use in server components/layouts/pages. Redirects to /dashboard when not a super admin. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return user;
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For use in API route handlers. Throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** For use in API route handlers. Throws instead of redirecting. */
export async function requireApiSuperAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== "SUPER_ADMIN") throw new ForbiddenError();
  return user;
}
