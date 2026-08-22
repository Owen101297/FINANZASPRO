import { notFound } from "@/lib/errors";

/** Helper para extraer y validar el id dinámico de un route handler. */
export async function paramId(ctx: { params: Promise<Record<string, string>> }): Promise<string> {
  const params = await ctx.params;
  const id = params.id;
  if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw notFound();
  return id;
}
