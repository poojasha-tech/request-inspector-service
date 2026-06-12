import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import api, { strictEndpointLimiter } from './api.js';
import logger from './logger.js';
import prisma from './prisma/db.js';
import { errorHandler, notFoundHandler } from './problems.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = YAML.parse(readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));

app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

app.use(pinoHttp({ logger }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: 'text/*', limit: '10mb' }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).type('application/problem+json').json({
      type: 'https://inspector.poojadev.de/problems/rate-limited',
      title: 'Too many requests',
      status: options.statusCode,
      detail: 'You have exceeded the global request limit. Please slow down.',
      instance: req.originalUrl,
    });
  },
});

app.use(globalLimiter);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'ok' });
  } catch (error) {
    req.log.error({ err: error }, 'readiness check failed');
    res.status(503).json({ status: 'not ready', db: 'unreachable' });
  }
});

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Request Inspector API Docs',
  }),
);

app.get('/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

app.post('/api/endpoint', strictEndpointLimiter);
app.use('/api', api);

app.set('timeout', 30 * 1000);

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});
app.get('/page', (req, res) => {
  res.send('<h1>Hello</h1>');
});

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'server listening');
  });
}

export default app;
