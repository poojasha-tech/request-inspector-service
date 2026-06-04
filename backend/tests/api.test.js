import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../prisma/db.js';

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

  test('rejects a tampered slug with 400', async () => {
    const [id] = validSlug.split('.');
    const tampered = `${id}.000000`;
    const res = await request(app).post(`/api/q/${tampered}`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.text).toBe('Invalid slug!');
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

  test('rejects a tampered slug with 400', async () => {
    const res = await request(app).get('/api/endpoint/abc.000000/request');
    expect(res.status).toBe(400);
  });
});
