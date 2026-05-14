# SMS Gateway Web UI

Simple web UI and proxy to manage one or more Android SMS Gateway devices.

Run:

```bash
cd /workspaces/sms-gateway-webui
npm install
npm start
```

Open http://localhost:3000

Usage:
- Add devices (host, port, optional base path and API key).
- Bulk add via CSV lines: `name,host,port,base,apiKey`.
- Select a device, click "Load SMS" to GET `/sms` from device (proxied).
- Use "Send SMS" to POST `{to,message}` to `/sms` on the device (proxied).

Notes:
- The proxy forwards requests to `http://<host>:<port>/<basePath>/...` and adds `x-api-key` header if API key is set.
- If your device uses different endpoint paths, use the UI's proxy by adjusting the path in calls (UI currently uses `/sms`).
# sms-gateway-webui