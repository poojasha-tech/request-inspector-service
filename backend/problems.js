import { ZodError } from 'zod';

const PROBLEM_BASE = process.env.PROBLEM_BASE_URL || 'https://inspector.poojadev.de/problems';

export class HttpProblem extends Error {
  constructor({ type, title, status, detail }) {
    super(detail || title);
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
  }
}

export function problem(req, { type, title, status, detail, extensions = {} }) {
  return {
    type: type.startsWith('http') ? type : `${PROBLEM_BASE}/${type}`,
    title,
    status,
    detail,
    instance: req.originalUrl,
    ...extensions,
  };
}

export function sendProblem(req, res, body) {
  res.status(body.status).type('application/problem+json').json(body);
}

export function notFoundHandler(req, res) {
  sendProblem(
    req,
    res,
    problem(req, {
      type: 'not-found',
      title: 'Resource not found',
      status: 404,
      detail: `No route matches ${req.method} ${req.originalUrl}`,
    }),
  );
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof ZodError) {
    return sendProblem(
      req,
      res,
      problem(req, {
        type: 'validation-error',
        title: 'Validation failed',
        status: 400,
        detail: 'One or more fields did not pass validation.',
        extensions: {
          errors: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      }),
    );
  }

  if (err instanceof HttpProblem) {
    return sendProblem(
      req,
      res,
      problem(req, {
        type: err.type,
        title: err.title,
        status: err.status,
        detail: err.detail,
      }),
    );
  }

  req.log?.error({ err }, 'unhandled error');
  return sendProblem(
    req,
    res,
    problem(req, {
      type: 'internal-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred.',
    }),
  );
}
