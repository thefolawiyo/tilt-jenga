import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  handleCollapseRoom,
  handleCreateRoom,
  handleGetRoom,
  handleJoinRoom,
  handleListPublicRooms,
  handleNextRoundRoom,
  handleStartRoom,
  handleSubmitMove,
} from './api/_lib/roomsService';
import { handleGetLeaderboard, handleUpsertLeaderboard } from './api/_lib/leaderboardService';

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function createApiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';
    if (!url.startsWith('/api/rooms') && !url.startsWith('/api/leaderboard')) {
      return next();
    }

    const pathOnly = url.split('?')[0];
    const parts = pathOnly.split('/').filter(Boolean);

    try {
      // /api/leaderboard
      if (parts[1] === 'leaderboard' && parts.length === 2) {
        if (req.method === 'GET') {
          const r = await handleGetLeaderboard();
          return sendJson(res, r.status, r.data);
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const r = await handleUpsertLeaderboard(body);
          return sendJson(res, r.status, r.data);
        }
      }

      // /api/rooms
      if (parts[1] === 'rooms') {
        if (req.method === 'GET' && parts.length === 2) {
          const r = await handleListPublicRooms();
          return sendJson(res, r.status, r.data);
        }
        if (req.method === 'POST' && parts.length === 2) {
          const body = await readJsonBody(req);
          const r = await handleCreateRoom(body);
          return sendJson(res, r.status, r.data);
        }

        const code = parts[2] || '';
        const action = (parts[3] || '').toLowerCase();

        if (req.method === 'GET' && parts.length === 3) {
          const r = await handleGetRoom(code);
          return sendJson(res, r.status, r.data);
        }

        if (req.method === 'POST' && parts.length === 4) {
          const body = await readJsonBody(req);
          let r;
          if (action === 'join') r = await handleJoinRoom(code, body);
          else if (action === 'start') r = await handleStartRoom(code, body);
          else if (action === 'move') r = await handleSubmitMove(code, body);
          else if (action === 'collapse') r = await handleCollapseRoom(code, body);
          else if (action === 'next-round') r = await handleNextRoundRoom(code);
          if (r) return sendJson(res, r.status, r.data);
        }
      }

      return next();
    } catch (err) {
      console.error('[vite-api] request failed:', err);
      return sendJson(res, 500, { error: 'Internal API error.' });
    }
  };
}

function tiltLocalApiPlugin(): Plugin {
  return {
    name: 'tilt-local-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), tiltLocalApiPlugin()],
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
