/**
 * src/lib/dal/auth.ts
 *
 * Auth wrapper helpers.
 */

import { auth } from "./client";

export async function verifyIdToken(token: string) {
  return auth.verifyIdToken(token);
}

export async function getAuthUser(uid: string) {
  return auth.getUser(uid);
}

export async function getAuthUserByEmail(email: string) {
  return auth.getUserByEmail(email);
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
) {
  await auth.setCustomUserClaims(uid, claims);
}

export async function generatePasswordResetLink(email: string) {
  return auth.generatePasswordResetLink(email);
}

export async function updateAuthUser(
  uid: string,
  properties: Parameters<typeof auth.updateUser>[1]
) {
  return auth.updateUser(uid, properties);
}

export async function deleteAuthUser(uid: string) {
  return auth.deleteUser(uid);
}

export async function createAuthUser(properties: Parameters<typeof auth.createUser>[0]) {
  return auth.createUser(properties);
}
