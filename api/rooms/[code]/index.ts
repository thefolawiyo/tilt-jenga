import { handleGetRoom } from '../../../server/roomsService';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function extractCodeFromUrl(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  // ['api', 'rooms', code]
  return parts[2] || '';
}

export async function GET(request: Request) {
  try {
    const code = extractCodeFromUrl(request.url);
    const result = await handleGetRoom(code);
    return Response.json(result.data, { status: result.status, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/rooms/[code]] GET failed:', err);
    return Response.json(
      { error: 'Unable to fetch room state.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
