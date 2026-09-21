/** Base HTTP error class for typed server failures. */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const BadRequestError = (message: string) => new HttpError(400, message);
export const UnauthorizedError = (message: string) => new HttpError(401, message);
export const ForbiddenError = (message: string) => new HttpError(403, message);
export const NotFoundError = (message: string) => new HttpError(404, message);
