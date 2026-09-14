/** Error de aplicación con status HTTP asociado. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = (msg = "No autenticado") => new ApiError(401, msg, "UNAUTHORIZED");
export const forbidden = (msg = "No autorizado") => new ApiError(403, msg, "FORBIDDEN");
export const notFound = (msg = "Recurso no encontrado") => new ApiError(404, msg, "NOT_FOUND");
export const badRequest = (msg = "Petición inválida") => new ApiError(400, msg, "BAD_REQUEST");
export const conflict = (msg = "Conflicto") => new ApiError(409, msg, "CONFLICT");
export const tooMany = (msg = "Demasiadas solicitudes. Intenta de nuevo más tarde") =>
  new ApiError(429, msg, "RATE_LIMITED");
