import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../prisma/db.js';

describe('API documentation', () => {
  test('GET /docs/ serves the Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Request Inspector API Docs');
    expect(res.text).toContain('id="swagger-ui"');
  });

  test('GET /openapi.json returns the spec', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('Request Inspector Service API');
    expect(res.body.paths).toHaveProperty('/api/endpoint');
  });
});

describe('GET /healthz', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /readyz', () => {
  test('returns 200 when the database is reachable', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.db).toBe('ok');
  });
});

describe('POST /api/endpoint', () => {
  test('returns a new signed URL', async () => {
    const res = await request(app).post('/api/endpoint');
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/q\/[A-Za-z0-9_-]+\.[0-9a-f]{6}$/);
  });

  test('returns different URLs on each call', async () => {
    const a = await request(app).post('/api/endpoint');
    const b = await request(app).post('/api/endpoint');
    expect(a.body.url).not.toBe(b.body.url);
  });
});

describe('ANY /api/q/:slug', () => {
  let validSlug;

  beforeEach(async () => {
    const res = await request(app).post('/api/endpoint');
    validSlug = res.body.url.replace('/q/', '');
    await prisma.request.deleteMany({ where: { url: validSlug } });
  });

  test('accepts a POST with a valid signed slug', async () => {
    const res = await request(app).post(`/api/q/${validSlug}`).send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('request received!');
  });

  test('persists the captured request in the database', async () => {
    await request(app).post(`/api/q/${validSlug}`).send({ payload: 'data' });
    const saved = await prisma.request.findMany({ where: { url: validSlug } });
    expect(saved).toHaveLength(1);
    expect(saved[0].method).toBe('POST');
    expect(JSON.parse(saved[0].body)).toEqual({ payload: 'data' });
  });

  test('rejects a tampered slug with 400 problem-details', async () => {
    const [id] = validSlug.split('.');
    const tampered = `${id}.000000`;
    const res = await request(app).post(`/api/q/${tampered}`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.title).toBe('Invalid slug');
    expect(res.body.status).toBe(400);
    expect(res.body.instance).toBe(`/api/q/${tampered}`);
  });

  test('rejects a malformed slug shape with 400 validation problem', async () => {
    const res = await request(app).post('/api/q/not-a-real-slug').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.title).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('captures the HTTP method correctly', async () => {
    await request(app).put(`/api/q/${validSlug}`);
    const saved = await prisma.request.findMany({ where: { url: validSlug } });
    expect(saved[0].method).toBe('PUT');
  });
});

describe('GET /api/endpoint/:slug/request', () => {
  test('returns captured requests for a valid slug', async () => {
    const created = await request(app).post('/api/endpoint');
    const slug = created.body.url.replace('/q/', '');

    await request(app).post(`/api/q/${slug}`).send({ foo: 1 });
    await request(app).post(`/api/q/${slug}`).send({ foo: 2 });

    const res = await request(app).get(`/api/endpoint/${slug}/request`);
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(2);
  });

  test('rejects a tampered slug with 400 problem-details', async () => {
    const res = await request(app).get('/api/endpoint/abc.000000/request');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.title).toBe('Invalid slug');
  });
});

describe('Security hardening', () => {
  test('helmet sets X-Content-Type-Options header', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('helmet sets X-Frame-Options header', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('unknown route returns 404 problem-details', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.status).toBe(404);
    expect(res.body.title).toBe('Resource not found');
  });
});
