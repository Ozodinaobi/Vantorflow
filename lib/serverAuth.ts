// SERVER ONLY. Reads the signed session cookie and returns the signed-in user.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";

export type AuthResult = { userId: string; email: string } | { error: string };

export async function requireUser(): Promise<AuthResult> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return { error: "You need to be signed in to do this." };
  }
  return { userId: session.uid, email: session.email };
}
