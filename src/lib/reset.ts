import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const RESET_TTL_MS = 60 * 60 * 1000;
export const RESET_TOKEN_BYTES = 32;

/** Solo el hash del token se persiste: una fuga de la BD no expone tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea un token de recuperación de un solo uso para el usuario, invalidando
 * los anteriores. Devuelve el token en claro (se entrega por email); en la BD
 * solo queda el hash.
 */
export async function createPasswordReset(userId: string): Promise<string> {
  const raw = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    }),
  ]);
  return raw;
}

/**
 * Consume un token de recuperación: lo marca como usado, descarta los demás
 * tokens del usuario y devuelve su userId. null si el token no existe, venció
 * o ya fue usado.
 */
export async function consumePasswordReset(rawToken: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record) return null;

  if (record.usedAt || record.expiresAt <= new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return null;
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, NOT: { id: record.id } },
    }),
  ]);

  return record.userId;
}