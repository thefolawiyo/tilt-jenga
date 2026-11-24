import { handleGetLeaderboard, handleUpsertLeaderboard } from '../_lib/leaderboardService.js';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const result = await handleGetLeaderboard();
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/leaderboard] GET failed:', err);
    return Response.json(
      { error: 'Unable to load leaderboard.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleUpsertLeaderboard(body);
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/leaderboard] POST failed:', err);
    return Response.json(
      { error: 'Unable to save leaderboard score.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
