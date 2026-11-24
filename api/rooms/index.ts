import { handleCreateRoom, handleListPublicRooms } from '../../server/roomsService';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const result = await handleListPublicRooms();
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms] GET failed:', err);
    return Response.json(
      { error: 'Unable to load live rooms right now.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleCreateRoom(body);
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms] POST failed:', err);
    return Response.json(
      { error: 'Unable to create live match room.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
