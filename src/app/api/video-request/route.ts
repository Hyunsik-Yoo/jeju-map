// 영상 추가 요청 API.
// 시트가 비공개라 앱에서 직접 데이터를 늘릴 수는 없다 — 대신 요청을
// 제주맛집데이터 시트의 `video_requests` 탭에 쌓아두고, 수집 스킬(단일 영상 모드)로 처리한다.
//
// POST { url }                : 유튜브 oEmbed로 영상 확인 → 미리보기 반환 (저장 안 함)
// POST { url, confirm: true } : 확인 후 요청 저장 (시트 append)
import { appendRow, readRange } from '@/lib/google-sheets';
import { channelById, thumbnailOf, videoById } from '@/lib/data';

const REQUESTS_RANGE = 'video_requests!A2:F';

/** youtu.be / watch?v= / shorts / embed / live 형태에서 11자리 영상 ID를 뽑는다. */
function parseVideoId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const id =
    host === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : host === 'youtube.com'
        ? url.pathname === '/watch'
          ? url.searchParams.get('v') ?? ''
          : (url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? '')
        : '';
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export async function POST(request: Request) {
  let body: { url?: string; confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  const videoId = body.url ? parseVideoId(body.url) : null;
  if (!videoId) {
    return Response.json({ error: '유튜브 영상 주소가 아니에요. 다시 확인해 주세요.' }, { status: 400 });
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const registered = videoById.get(videoId);
  if (registered) {
    return Response.json({
      videoId,
      title: registered.title,
      channelName: channelById.get(registered.channelId)?.name ?? '',
      thumbnail: thumbnailOf(videoId),
      duplicate: 'registered',
    });
  }

  let alreadyRequested = false;
  try {
    const rows = await readRange(REQUESTS_RANGE);
    alreadyRequested = rows.some((row) => row[1] === videoId);
  } catch (error) {
    console.error('video_requests 읽기 실패:', error);
    return Response.json(
      { error: '요청 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }

  // oEmbed로 실재 여부·제목·채널 확인. 비공개/삭제 영상은 여기서 걸러진다.
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`
  );
  if (!oembed.ok) {
    return Response.json(
      { error: '영상을 찾을 수 없어요. 비공개이거나 삭제된 영상일 수 있어요.' },
      { status: 404 }
    );
  }
  const meta = (await oembed.json()) as { title?: string; author_name?: string };
  const preview = {
    videoId,
    title: meta.title ?? '',
    channelName: meta.author_name ?? '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };

  if (alreadyRequested) {
    return Response.json({ ...preview, duplicate: 'requested' });
  }

  if (!body.confirm) {
    return Response.json({ ...preview, duplicate: null });
  }

  try {
    await appendRow('video_requests!A1', [
      new Date().toISOString(),
      videoId,
      canonicalUrl,
      preview.title,
      preview.channelName,
      'pending',
    ]);
  } catch (error) {
    console.error('video_requests 쓰기 실패:', error);
    return Response.json(
      { error: '요청 저장에 실패했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }

  return Response.json({ ...preview, duplicate: null, saved: true });
}
