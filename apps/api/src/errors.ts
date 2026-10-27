// RFC 9457 problem details with a stable `code` (§4.4). Messages never echo user input.
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (code = 'auth.required') => new HttpError(401, code);
export const forbidden = (code = 'auth.forbidden') => new HttpError(403, code);
export const notFound = () => new HttpError(404, 'not_found');
export const badRequest = (code = 'validation.failed') => new HttpError(400, code);

/** Database function errors carry codes like "workflow.same_person" as their message. */
export function fromDatabase(message: string | undefined): HttpError {
  const code = (message ?? '').match(/^[a-z_]+\.[a-z_]+/)?.[0];
  if (!code) return new HttpError(500, 'internal');
  if (code.startsWith('auth.')) return new HttpError(403, code);
  return new HttpError(409, code);
}

const TITLES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorised',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
  413: 'Too large',
  429: 'Too many requests',
  500: 'Internal error',
  502: 'Upstream unavailable',
};

export function problem(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  code: string,
) {
  return reply
    .status(status)
    .type('application/problem+json')
    .send({
      type: 'about:blank',
      title: TITLES[status] ?? 'Error',
      status,
      code,
      instance: request.id,
    });
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof HttpError) return problem(reply, request, error.status, error.code);
  if (hasZodFastifySchemaValidationErrors(error))
    return problem(reply, request, 400, 'validation.failed');
  if (error.statusCode === 429) return problem(reply, request, 429, 'rate_limited');
  if (error.statusCode === 413) return problem(reply, request, 413, 'too_large');
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return problem(reply, request, error.statusCode, 'request.invalid');
  }
  request.log.error({ err: error }, 'unhandled error');
  return problem(reply, request, 500, 'internal');
}

/**
 * SQL NULL for a workflow-function argument. The generated argument types don't mark nullable
 * parameters, but these functions accept NULL (for example "no jurisdiction" means all areas).
 */
export const sqlNull = null as unknown as string;
