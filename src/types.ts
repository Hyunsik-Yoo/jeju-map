// 시트(제주맛집데이터) 스냅샷을 앱에서 쓰는 형태로 옮긴 모델.
// 원본 컬럼과의 대응은 scripts/build-data.py 를 참고.

export interface Channel {
  id: string;
  name: string;
  handle: string;
  /** 크롤 시드 채널만 값이 있다. 검색 모드로 주워온 채널은 null. */
  category: string | null;
  /** public/channels/{id}.jpg — 마커에 쓰는 채널 프로필. */
  avatar: string | null;
}

/** 장소가 어떤 영상에 어떻게 등장했는지. */
export interface PlaceAppearance {
  videoId: string;
  featuredMenu: string | null;
  context: string | null;
  /** 영상에서 이 가게가 나오는 시점 ("3:34" / "1:02:15"). 미확보면 null. */
  timestamp: string | null;
}

export interface PlaceMenu {
  name: string;
  count: number | null;
  price: number | null;
  category: string | null;
}

export type PlaceType = 'RESTAURANT' | 'CAFE' | 'BAKERY' | 'BAR';

export interface Place {
  key: string;
  name: string;
  type: PlaceType;
  /** 카카오 업종 원문(한식·회·테마카페 …). */
  category: string;
  address: string;
  region: string;
  lat: number;
  lng: number;
  kakaoId: string | null;
  openStart: string | null;
  openEnd: string | null;
  videos: PlaceAppearance[];
  menus?: PlaceMenu[];
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  url: string;
  publishedAt: string;
  /** 이 영상이 지도에 처음 반영된 날짜(스냅샷 기준) — "새로 올라온 영상" 판별용. */
  addedAt: string;
  durationSec: number | null;
  viewCount: number | null;
  likeCount: number | null;
  placeKeys: string[];
}

export interface JejuData {
  fetchedAt: string;
  channels: Channel[];
  videos: Video[];
  places: Place[];
}

/** 지도에 찍는 마커 하나. 아바타는 그 장소를 소개한 영상의 채널 것을 쓴다. */
export interface MapMarker {
  placeKey: string;
  lat: number;
  lng: number;
  avatar: string | null;
  channelName: string;
  /** 이 장소가 등장한 영상 수. 2 이상이면 뱃지를 단다. */
  videoCount: number;
  selected: boolean;
  /** 출연 TOP10 모드의 순위(1부터). 값이 있으면 프로필 대신 순위 마커로 그린다. */
  rank?: number | null;
}
