import "server-only";
import { getUserByEmail } from "./userService";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/auth/rateLimit";
import { logEvent } from "@/lib/logger";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super("This account has been deactivated.");
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Too many failed login attempts. Try again later.");
  }
}

export async function login(
  email: string,
  password: string,
  clientKey: string,
): Promise<{ id: string; email: string; role: string }> {
  const rateLimitKey = `${clientKey}:${email}`;
  if (isRateLimited(rateLimitKey)) {
    await logEvent("warn", "Login rate-limited", { email, clientKey });
    throw new TooManyAttemptsError();
  }

  const user = await getUserByEmail(email);
  if (!user) {
    recordFailedAttempt(rateLimitKey);
    await logEvent("warn", "Failed login: unknown email", { email });
    throw new InvalidCredentialsError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    recordFailedAttempt(rateLimitKey);
    await logEvent("warn", "Failed login: invalid password", { email });
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    await logEvent("warn", "Login blocked: inactive account", { email });
    throw new AccountInactiveError();
  }

  clearAttempts(rateLimitKey);
  await createSession(user.id);

  return { id: user.id, email: user.email, role: user.role };
}
