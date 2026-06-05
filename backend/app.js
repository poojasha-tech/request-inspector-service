import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import api from './api.js';
import logger from './logger.js';
import prisma from './prisma/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: 'text/*', limit: '10mb' }));

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

app.use('/api', api);

app.set('timeout', 30 * 1000);

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});
app.get('/page', (req, res) => {
  res.send('<h1>Hello</h1>');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'server listening');
  });
}

export default app;
