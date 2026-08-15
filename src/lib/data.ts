// 정적 스냅샷 로더 + 화면에서 반복해서 쓰는 포맷터.
// 시트가 비공개라 런타임 fetch가 불가능해서 빌드에 JSON을 그대로 물린다.
import raw from '@/data/jeju.json';
import type { Channel, JejuData, Place, PlaceType, Video } from '@/types';

export const data = raw as unknown as JejuData;

export const channelById = new Map<string, Channel>(
  data.channels.map((channel) => [channel.id, channel])
);

export const placeByKey = new Map<string, Place>(
  data.places.map((place) => [place.key, place])
);

export const videoById = new Map<string, Video>(
  data.videos.map((video) => [video.id, video])
);

/** 제주 전체가 화면에 들어오는 기본 중심/줌. */
export const JEJU_CENTER = { lat: 33.38, lng: 126.55 };
export const JEJU_ZOOM = 10;

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  RESTAURANT: '음식점',
  CAFE: '카페',
  BAKERY: '베이커리',
  BAR: '바',
};

/** 카테고리 필터 항목. 카카오 업종 원문 기준으로 집계하고, 많이 속한 타입으로 섹션을 정한다. */
export interface CategoryStat {
  name: string;
  count: number;
  type: PlaceType;
}

/** 필터에서 쓰는 장소의 카테고리 이름. 업종 원문이 비면 타입 라벨로 떨어뜨린다. */
export function categoryOf(place: Place): string {
  return place.category || PLACE_TYPE_LABEL[place.type];
}

/** 주어진 장소들 기준의 카테고리 집계. 필터가 걸린 상태의 픽커에서도 쓴다. */
export function categoryStatsOf(places: Place[]): CategoryStat[] {
  const acc = new Map<string, { count: number; byType: Map<PlaceType, number> }>();
  for (const place of places) {
    const name = categoryOf(place);
    const entry = acc.get(name) ?? { count: 0, byType: new Map<PlaceType, number>() };
    entry.count += 1;
    entry.byType.set(place.type, (entry.byType.get(place.type) ?? 0) + 1);
    acc.set(name, entry);
  }
  return [...acc.entries()]
    .map(([name, { count, byType }]) => ({
      name,
      count,
      type: [...byType.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function channelOf(video: Video): Channel | undefined {
  return channelById.get(video.channelId);
}

export function placesOf(video: Video): Place[] {
  return video.placeKeys
    .map((key) => placeByKey.get(key))
    .filter((place): place is Place => Boolean(place));
}

export function videosOf(place: Place): Video[] {
  return place.videos
    .map((appearance) => videoById.get(appearance.videoId))
    .filter((video): video is Video => Boolean(video));
}

export function thumbnailOf(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function formatCount(value: number | null): string {
  if (value === null) return '-';
  if (value >= 10_000) {
    const man = value / 10_000;
    return `${man >= 100 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, '')}만`;
  }
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}천`;
  return value.toLocaleString('ko-KR');
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** "3일 전" 형태. 오래된 것은 날짜로 떨어뜨린다. */
export function formatRelativeDate(iso: string, now = new Date()): string {
  const date = new Date(`${iso}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return iso;

  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return iso.replace(/-/g, '.');
}

export function formatOpeningHours(place: Place): string | null {
  if (!place.openStart || !place.openEnd) return null;
  return `${place.openStart} - ${place.openEnd}`;
}

/** 카카오맵 장소 상세. kakaoId(confirmid)가 있으면 정확한 상세로 보낸다. */
export function kakaoMapUrl(place: Place): string {
  return place.kakaoId
    ? `https://place.map.kakao.com/${place.kakaoId}`
    : `https://map.kakao.com/?q=${encodeURIComponent(place.name)}`;
}
