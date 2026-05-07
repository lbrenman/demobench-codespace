'use strict';

const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Returns a map of { containerName → containerInfo } for all containers.
 */
async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  const result = {};
  for (const c of containers) {
    // Docker container names start with '/'
    const name = (c.Names[0] || '').replace(/^\//, '');
    result[name] = {
      id:      c.Id.slice(0, 12),
      name,
      image:   c.Image,
      status:  c.Status,   // e.g. "Up 2 hours"
      state:   c.State,    // "running" | "exited" | "paused" etc.
      ports:   c.Ports,
      labels:  c.Labels,
      created: c.Created,
    };
  }
  return result;
}

/**
 * Streams recent logs for a named container.
 * Returns a readable stream.
 */
async function getContainerLogs(containerName, { tail = 200 } = {}) {
  const containers = await docker.listContainers({ all: true });
  const match = containers.find(c =>
    c.Names.some(n => n.replace(/^\//, '') === containerName)
  );
  if (!match) throw new Error(`Container not found: ${containerName}`);

  const container = docker.getContainer(match.Id);
  return container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
    follow: false,
  });
}

/**
 * Starts a follow stream for container logs.
 * Calls onData(line) for each log line, onEnd() when done.
 */
async function followContainerLogs(containerName, onData, onEnd) {
  const containers = await docker.listContainers({ all: true });
  const match = containers.find(c =>
    c.Names.some(n => n.replace(/^\//, '') === containerName)
  );
  if (!match) throw new Error(`Container not found: ${containerName}`);

  const container = docker.getContainer(match.Id);
  const stream = await container.logs({
    stdout: true,
    stderr: true,
    tail: 100,
    timestamps: true,
    follow: true,
  });

  container.modem.demuxStream(stream, {
    write: (chunk) => onData(chunk.toString()),
  }, {
    write: (chunk) => onData(chunk.toString()),
  });

  stream.on('end', onEnd);
  return stream;
}

/**
 * Runs a docker compose command in the project root.
 * Returns { stdout, stderr, code }.
 */
const { execFile } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../../');

function composeCommand(args) {
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', ...args], { cwd: PROJECT_ROOT }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, code: err ? err.code : 0 });
    });
  });
}

module.exports = { listContainers, getContainerLogs, followContainerLogs, composeCommand };
