import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { resolveAllowedHosts } from '../../build/allowedHosts.js';
import { createBrowserViteConfig } from '../../build/vite.js';
import { localProviderPlugins } from '../providers/local.js';
import { localMcpPlugin } from '../mcp/plugin.js';
import { apiNotFoundPlugin } from './api-not-found.js';
import { standaloneVoiceTools } from './voiceTools.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Load this checkout's configuration and attach its local provider middleware. */
export default defineConfig(({ command, mode }) => {
  const loaded = loadEnv(mode, root, '');
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  const base = process.env.VITE_BASE || '/2244/';
  const subpathApiMiddleware = () => ({
    name: 'subpath-api-middleware',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/2244/api/client-log' || req.url === '/api/client-log') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            console.error('[BROWSER CLIENT LOG]', body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }
        if (req.url && req.url.startsWith('/2244/api/')) {
          req.url = req.url.slice(5);
        }
        next();
      });
    },
  });

  const corsAndCesiumMiddleware = () => ({
    name: 'cors-and-cesium-middleware',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const origin = req.headers.origin;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const effectiveOrigin = origin || (host ? `https://${host}` : 'https://sorpodstack.com');

        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Vary', 'Origin');
        }

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', origin || effectiveOrigin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH',
          );
          res.setHeader(
            'Access-Control-Allow-Headers',
            req.headers['access-control-request-headers'] || '*',
          );
          res.setHeader('Access-Control-Max-Age', '86400');
          res.statusCode = 204;
          res.end();
          return;
        }

        // Prevent vite-plugin-cesium or any other static middleware from emitting
        // Access-Control-Allow-Origin: * which breaks browsers when credentials/cookies are present.
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name, value) {
          if (
            typeof name === 'string' &&
            name.toLowerCase() === 'access-control-allow-origin' &&
            value === '*'
          ) {
            origSetHeader('Access-Control-Allow-Credentials', 'true');
            return origSetHeader(name, effectiveOrigin);
          }
          return origSetHeader(name, value);
        };

        next();
      });
    },
  });

  const config = createBrowserViteConfig({
    plugins: [
      ...(mode !== 'test' ? [subpathApiMiddleware(), corsAndCesiumMiddleware()] : []),
      ...localProviderPlugins({ realtime: { tools: standaloneVoiceTools() } }),
      localMcpPlugin(),
      apiNotFoundPlugin(),
    ],
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    cesiumToken: process.env.CESIUM_ION_TOKEN,
    mapillaryToken: process.env.MAPILLARY_CLIENT_TOKEN,
    host: process.env.HOST,
    port: process.env.PORT,
    allowedHosts: resolveAllowedHosts(process.env.GEV_ALLOWED_HOSTS || 'sorpodstack.com,www.sorpodstack.com,notestack.cam,localhost,127.0.0.1'),
    command,
  });

  config.base = base;
  return config;
});
