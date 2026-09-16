import "server-only";
import { getUserByEmail } from "./userService";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/auth/rateLimit";

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
    throw new TooManyAttemptsError();
  }

  const user = await getUserByEmail(email);
  if (!user) {
    recordFailedAttempt(rateLimitKey);
    throw new InvalidCredentialsError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    recordFailedAttempt(rateLimitKey);
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new AccountInactiveError();
  }

  clearAttempts(rateLimitKey);
  await createSession(user.id);

  return { id: user.id, email: user.email, role: user.role };
}
