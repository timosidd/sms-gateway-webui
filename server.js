const express = require('express');
const fs = require('fs');
const path = require('path');
// Use global fetch available in Node 18+ (Node 24 has fetch built-in)
const fetch = globalThis.fetch;
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = path.join(__dirname, 'devices.json');

function loadDevices() {
  try {
    const s = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(s || '[]');
  } catch (e) {
    return [];
  }
}

function saveDevices(devices) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(devices, null, 2));
}

app.get('/api/devices', (req, res) => {
  res.json(loadDevices());
});

app.post('/api/devices', (req, res) => {
  const body = req.body;
  const devices = loadDevices();
  const toAdd = Array.isArray(body) ? body : [body];
  const added = toAdd.map(d => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const dev = Object.assign({id}, d);
    devices.push(dev);
    return dev;
  });
  saveDevices(devices);
  res.status(201).json(added.length === 1 ? added[0] : added);
});

app.delete('/api/devices/:id', (req, res) => {
  const id = req.params.id;
  let devices = loadDevices();
  const before = devices.length;
  devices = devices.filter(d => d.id !== id);
  saveDevices(devices);
  res.json({deleted: before - devices.length});
});

function getDeviceOr404(id, res) {
  const devices = loadDevices();
  const dev = devices.find(d => d.id === id);
  if (!dev) {
    res.status(404).json({error: 'device not found'});
    return null;
  }
  return dev;
}

// Proxy any path to the device. Example: GET /api/proxy/:id/sms -> forward to http://host:port/basePath/sms
app.all('/api/proxy/:id/*', async (req, res) => {
  const id = req.params.id;
  const dev = getDeviceOr404(id, res);
  if (!dev) return;

  const extraPath = req.params[0] || '';
  const base = (dev.basePath || '').replace(/\/$/, '');
  const host = dev.host || dev.ip || '127.0.0.1';
  const port = dev.port ? (':' + dev.port) : '';
  const url = `http://${host}${port}/${base}/${extraPath}`.replace(/([^:]\/)\/+/g, '$1');

  const headers = Object.assign({}, req.headers);
  // Remove host header to let fetch set it properly
  delete headers.host;

  if (dev.apiKey) {
    headers['x-api-key'] = dev.apiKey;
  }

  const opts = {
    method: req.method,
    headers,
    redirect: 'follow'
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    opts.body = JSON.stringify(req.body || {});
    opts.headers['content-type'] = 'application/json';
  }

  try {
    const r = await fetch(url, opts);
    const contentType = r.headers.get('content-type') || '';
    res.status(r.status);
    r.headers.forEach((v, k) => res.setHeader(k, v));
    if (contentType.includes('application/json')) {
      const json = await r.json();
      res.json(json);
    } else {
      const text = await r.text();
      res.send(text);
    }
  } catch (err) {
    res.status(502).json({error: 'bad gateway', details: err.message});
  }
});

// Serve static UI
app.use('/', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`sms-gateway-webui listening on ${PORT}`));
