// Error de negocio con código HTTP. Lo comparten el frontend, el mock y el API con base de datos.
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
