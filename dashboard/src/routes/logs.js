'use strict';

const express = require('express');
const router  = express.Router();
const { getContainerLogs, followContainerLogs } = require('../lib/docker');
const { loadServices } = require('../lib/manifest');

// GET /api/logs/:serviceId?tail=200
// Returns recent (non-streaming) logs for a service
router.get('/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const tail = parseInt(req.query.tail || '200');

  const svc = loadServices().find(s => s.id === serviceId);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  const containerName = svc.composeService || svc.id;

  try {
    const logBuffer = await getContainerLogs(containerName, { tail });
    // Docker multiplexes stdout/stderr — strip the 8-byte header from each frame
    const lines = demuxDockerLogs(logBuffer);
    res.json({ serviceId, lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:serviceId/stream
// Server-Sent Events stream of live container logs
router.get('/:serviceId/stream', async (req, res) => {
  const { serviceId } = req.params;
  const svc = loadServices().find(s => s.id === serviceId);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  const containerName = svc.composeService || svc.id;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify({ line: data })}\n\n`);
  };

  let stream;
  try {
    stream = await followContainerLogs(containerName, send, () => {
      res.write('event: end\ndata: {}\n\n');
      res.end();
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
    return;
  }

  req.on('close', () => {
    if (stream && stream.destroy) stream.destroy();
  });
});

/**
 * Docker log streams prefix each frame with an 8-byte header.
 * This strips it and returns clean log lines.
 */
function demuxDockerLogs(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  const lines = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (buffer.length < offset + 8) break;
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (size > 0 && offset + size <= buffer.length) {
      lines.push(buffer.slice(offset, offset + size).toString('utf8').trimEnd());
    }
    offset += size;
  }
  return lines;
}

module.exports = router;
