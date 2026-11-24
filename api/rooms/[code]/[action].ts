import {
  handleCollapseRoom,
  handleJoinRoom,
  handleNextRoundRoom,
  handleStartRoom,
  handleSubmitMove,
} from '../../../server/roomsService';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function extractParamsFromUrl(url: string): { code: string; action: string } {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  // ['api', 'rooms', code, action]
  return {
    code: parts[2] || '',
    action: (parts[3] || '').toLowerCase(),
  };
}

export async function POST(request: Request) {
  try {
    const { code, action } = extractParamsFromUrl(request.url);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

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
          { error: `Unknown room action: ${action}` },
          { status: 404, headers: NO_STORE_HEADERS }
        );
    }

    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms/[code]/[action]] POST failed:', err);
    return Response.json(
      { error: 'Live match action failed.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
