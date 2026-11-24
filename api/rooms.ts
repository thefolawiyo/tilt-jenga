import {
  handleCollapseRoom,
  handleCreateRoom,
  handleGetRoom,
  handleJoinRoom,
  handleListPublicRooms,
  handleNextRoundRoom,
  handleStartRoom,
  handleSubmitMove,
} from './_lib/roomsService.js';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function extractRoomRoute(url: string): { code: string; action: string } {
  const parsed = new URL(url);
  const pathParam = parsed.searchParams.get('path');
  if (pathParam) {
    const segs = pathParam.split('/').filter(Boolean);
    return {
      code: segs[0] || '',
      action: (segs[1] || '').toLowerCase(),
    };
  }
  const parts = parsed.pathname.split('/').filter(Boolean);
  // ['api', 'rooms', code?, action?]
  return {
    code: parts[2] || '',
    action: (parts[3] || '').toLowerCase(),
  };
}

export async function GET(request: Request) {
  try {
    const { code } = extractRoomRoute(request.url);
    const result = code ? await handleGetRoom(code) : await handleListPublicRooms();
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms] GET failed:', err);
    return Response.json(
      { error: 'Unable to load live room data.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { code, action } = extractRoomRoute(request.url);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // POST /api/rooms — create a new live room
    if (!code) {
      const result = await handleCreateRoom(body);
      return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
    }

    // POST /api/rooms/:code/:action
    let result;
    switch (action) {
      case 'join':
        result = await handleJoinRoom(code, body);
        break;
      case 'start':
        result = await handleStartRoom(code, body);
        break;
      case 'move':
        result = await handleSubmitMove(code, body);
        break;
      case 'collapse':
        result = await handleCollapseRoom(code, body);
        break;
      case 'next-round':
        result = await handleNextRoundRoom(code);
        break;
      default:
        return Response.json(
          { error: `Unknown room action: ${action || '(missing)'}` },
          { status: 404, headers: NO_STORE_HEADERS }
        );
    }

    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms] POST failed:', err);
    return Response.json(
      { error: 'Live match action failed.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
}
