import express from 'express';
import prisma from './prisma/db.js';
import { generateSignedId, validateSignedId } from './helper.js';

const router = express.Router();

router.post('/endpoint', async (req, res) => {
  res.json({
    url: `/q/${generateSignedId()}`,
  });
});

router.all('/q/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    if (!validateSignedId(slug)) {
      return res.status(400).send('Invalid slug!');
    }

    const requestData = {
      url: slug,
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: req.body ? JSON.stringify(req.body) : null,
      ip: req.ip,
    };

    req.log.info({ slug, method: req.method }, 'capturing request');

    await prisma.request.create({
      data: requestData,
    });
    return res.status(200).send('request received!');
  } catch (error) {
    req.log.error({ err: error }, 'failed to save captured request');
    res.status(500).send('something went wrong!');
  }
});

router.get('/endpoint/:slug/request', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (validateSignedId(slug) === false) {
      return res.status(400).send('Invalid slug!');
    }
    const requests = await prisma.request.findMany({
      where: {
        url: slug,
      },
    });
    res.json({ requests });
  } catch (error) {
    req.log.error({ err: error }, 'failed to list captured requests');
    res.status(500).send('Something went wrong!');
  }
});
export default router;
