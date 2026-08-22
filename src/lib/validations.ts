import { z } from "zod";

// ─────────────────────────── Auth ───────────────────────────

export const deviceIdSchema = z
  .string()
  .min(6, "Identificador de dispositivo inválido")
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Identificador de dispositivo inválido");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(60).optional(),
  email: z.string().trim().toLowerCase().email("Email inválido").max(120),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña").max(72),
  deviceId: deviceIdSchema,
});

// ─────────────────────────── Wallet ───────────────────────────

export const walletPatchSchema = z.object({
  salary: z.number().min(0).max(1e12),
  cycleStartDay: z.number().int().min(1).max(28),
});

// ─────────────────────────── Cuentas ──────────────────────────

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  balance: z.number().min(-1e12).default(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido")
    .optional()
    .nullable(),
});

export const accountUpdateSchema = accountCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

// ─────────────────────────── Categorías ───────────────────────

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  icon: z.string().trim().max(30).optional().nullable(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ───────────────────────── Transacciones ──────────────────────

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/))
  .transform((v) => new Date(v));

export const transactionCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("El monto debe ser mayor a 0").max(1e12),
  note: z.string().trim().max(200).optional().nullable(),
  accountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  date: isoDate.optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

// ───────────────────────── Transferencias ─────────────────────

export const transferCreateSchema = z
  .object({
    fromAccountId: z.string().cuid(),
    toAccountId: z.string().cuid(),
    amount: z.number().positive("El monto debe ser mayor a 0").max(1e12),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "Las cuentas de origen y destino deben ser distintas",
    path: ["toAccountId"],
  });

// ─────────────────────────── Deudas ───────────────────────────

export const debtCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  totalAmount: z.number().positive("El monto debe ser mayor a 0").max(1e12),
  paidAmount: z.number().min(0).max(1e12).default(0),
  dueDate: isoDate.nullable().optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

export const debtUpdateSchema = debtCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "PAID"]).optional(),
});

// ──────────────────────── Suscripciones ───────────────────────

export const subscriptionCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  amount: z.number().positive("El monto debe ser mayor a 0").max(1e12),
  billingDay: z.number().int().min(1, "Día entre 1 y 31").max(31, "Día entre 1 y 31"),
  accountId: z.string().cuid().optional().nullable(),
  active: z.boolean().default(true),
  note: z.string().trim().max(200).optional().nullable(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial();

// ─────────────────────────── Metas ────────────────────────────

export const goalCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  targetAmount: z.number().positive("La meta debe ser mayor a 0").max(1e12),
  savedAmount: z.number().min(0).max(1e12).default(0),
  deadline: isoDate.nullable().optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

export const goalUpdateSchema = goalCreateSchema.partial();

// ───────────────────────── Dispositivos ───────────────────────

export const deviceRegisterSchema = z.object({
  deviceId: deviceIdSchema,
  label: z.string().trim().max(80).optional(),
});

// ─────────────────────────── Admin ────────────────────────────

export const adminUserPatchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  active: z.boolean().optional(),
});
