import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "wishlist_session";
const MAX_AGE = 60 * 60 * 24 * 180; // half a year

type AppUser = { name: string; password: string };

// APP_USERS looks like "Rasmus:secret,Tereza:other-secret".
export function getUsers(): AppUser[] {
  return (process.env.APP_USERS ?? "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(":");
      return { name: pair.slice(0, i).trim(), password: pair.slice(i + 1) };
    })
    .filter((u) => u.name && u.password);
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set to a long random string.");
  return new TextEncoder().encode(s);
}

// Compare HMACs so the check takes the same time whatever the input.
function samePassword(a: string, b: string) {
  const key = "wishlist-compare";
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkLogin(name: string, password: string): string | null {
  const user = getUsers().find((u) => u.name.toLowerCase() === name.trim().toLowerCase());
  if (!user || !samePassword(user.password, password)) return null;
  return user.name;
}

export async function startSession(name: string) {
  const token = await new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const name = typeof payload.name === "string" ? payload.name : null;
    // A user removed from APP_USERS loses access straight away.
    return name && getUsers().some((u) => u.name === name) ? name : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<string> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
