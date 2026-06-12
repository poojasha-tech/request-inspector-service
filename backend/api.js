import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from './prisma/db.js';
import { generateSignedId, validateSignedId } from './helper.js';
import { HttpProblem } from './problems.js';

const router = express.Router();

const slugSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+\.[0-9a-f]{6}$/, 'slug must look like "id.signature"');

function parseSlug(raw) {
  const slug = slugSchema.parse(raw);
  if (!validateSignedId(slug)) {
    throw new HttpProblem({
      type: 'invalid-slug',
      title: 'Invalid slug',
      status: 400,
      detail: 'The slug signature did not verify.',
    });
  }
  return slug;
}

export const strictEndpointLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_ENDPOINT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).type('application/problem+json').json({
      type: 'https://inspector.poojadev.de/problems/rate-limited',
      title: 'Too many requests',
      status: options.statusCode,
      detail: 'Slug creation is limited; please wait before creating more.',
      instance: req.originalUrl,
    });
  },
});

router.post('/endpoint', async (req, res) => {
  res.json({
    url: `/q/${generateSignedId()}`,
  });
});

router.all('/q/:slug', async (req, res, next) => {
  try {
    const slug = parseSlug(req.params.slug);

    const requestData = {
      url: slug,
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: req.body ? JSON.stringify(req.body) : null,
      ip: req.ip,
    };

    req.log.info({ slug, method: req.method }, 'capturing request');

    await prisma.request.create({ data: requestData });
    res.status(200).send('request received!');
  } catch (error) {
    next(error);
  }
});

router.get('/endpoint/:slug/request', async (req, res, next) => {
  try {
    const slug = parseSlug(req.params.slug);
    const requests = await prisma.request.findMany({ where: { url: slug } });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

export default router;
