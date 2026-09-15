import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { route, requireAdmin, readJson, audit } from "@/lib/server";
import { notFound, badRequest } from "@/lib/errors";

/** Lista usuarios con su wallet y conteo de dispositivos. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { devices: true } },
      wallet: { select: { salary: true } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      deviceCount: u._count.devices,
      salary: Number(u.wallet?.salary ?? 0),
    })),
  });
});

/** Cambia el rol de un usuario. Un admin no puede quitarse su propio rol. */
export const PATCH = route(async (req: NextRequest) => {
  const { user: admin } = await requireAdmin(req);
  const body = (await readJson<{ userId?: string; role?: "USER" | "ADMIN" }>(req));
  if (!body.userId || !body.role) throw badRequest("Faltan datos");
  if (body.userId === admin.id && body.role !== "ADMIN") {
    throw badRequest("No puedes quitarte tu propio rol de administrador");
  }

  const target = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!target) throw notFound("Usuario no encontrado");

  if (target.role === "ADMIN" && body.role === "USER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) throw badRequest("No puedes quitar el rol al último administrador del sistema");
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { role: body.role },
    select: { id: true, email: true, role: true },
  });

  await audit({
    actorId: admin.id,
    action: "ADMIN_ROLE_CHANGED",
    targetId: updated.id,
    meta: { role: updated.role },
  });

  return NextResponse.json({ user: updated });
});

/**
 * Elimina un usuario y todos sus datos (cascade).
 * Las transferencias usan onDelete: Restrict, así que se borran primero por
 * wallet para que la cascada del resto no choque con la FK.
 */
export const DELETE = route(async (req: NextRequest) => {
  const { user: admin } = await requireAdmin(req);
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) throw badRequest("Falta userId");
  if (userId === admin.id) throw badRequest("No puedes eliminar tu propia cuenta");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound("Usuario no encontrado");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) throw badRequest("No puedes eliminar al último administrador del sistema");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const wallets = await tx.wallet.findMany({
        where: { userId },
        select: { id: true },
      });
      const walletIds = wallets.map((w) => w.id);
      if (walletIds.length > 0) {
        await tx.transfer.deleteMany({ where: { walletId: { in: walletIds } } });
      }
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2003" || err.code === "P2025")
    ) {
      throw badRequest("No se pudo eliminar el usuario: tiene datos dependientes");
    }
    throw err;
  }

  await audit({ actorId: admin.id, action: "ADMIN_USER_DELETED", targetId: userId });
  return NextResponse.json({ ok: true });
});
