'use client';

// 제주 맛집지도 — 유튜브 영상에 나온 제주 카페·음식점을 영상 단위로 본다.
//
// 화면 구성
//  · 지도: 마커 = 장소, 마커 이미지 = 그 장소를 소개한 채널의 프로필
//  · 바텀시트: (기본) 영상 리스트 → (영상 선택) 썸네일(유튜브 링크) + 그 영상의 장소 리스트
//  · 마커 탭: 장소 상세가 지도 위로 뜨고, 거기서 다시 영상으로 들어갈 수 있다
//  · 상단 필터: 채널/카테고리 칩 → 각각 선택 바텀시트
import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import BottomSheet from '@/components/BottomSheet';
import CategoryPickerSheet from '@/components/CategoryPickerSheet';
import ChannelPickerSheet from '@/components/ChannelPickerSheet';
import FilterBar from '@/components/FilterBar';
import NewVideosSheet from '@/components/NewVideosSheet';
import NewVideoTicker from '@/components/NewVideoTicker';
import PlaceDetailSheet from '@/components/PlaceDetailSheet';
import PlaceRow from '@/components/PlaceRow';
import Top10PlaceRow from '@/components/Top10PlaceRow';
import VideoCard from '@/components/VideoCard';
import VideoRequestModal from '@/components/VideoRequestModal';
import {
  categoryOf,
  categoryStatsOf,
  channelById,
  data,
  formatCount,
  formatDuration,
  formatRelativeDate,
  placeByKey,
  placesOf,
  recentlyAddedVideos,
  thumbnailOf,
  videoById,
} from '@/lib/data';
import type { MapMarker } from '@/types';

// 네이버 SDK는 window에 붙기 때문에 서버 렌더에서 제외한다.
const NaverMap = dynamic(() => import('@/components/NaverMap'), { ssr: false });

const COLLAPSED_HEIGHT = 282;
const EXPANDED_TOP_OFFSET = 132;
/** 상단 오버레이(로고 + 필터 바) 높이 — 지도 "보이는 영역" 계산용. */
const TOP_OVERLAY_HEIGHT = 96;
/** 새 영상 롤링 배너가 떠 있을 때 오버레이에 더해지는 높이(배너 34px + 여백). */
const NEW_VIDEO_TICKER_HEIGHT = 40;

export default function Home() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<'channel' | 'category' | null>(null);
  const [top10Active, setTop10Active] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newVideosOpen, setNewVideosOpen] = useState(false);
  // 장소 상세 시트의 실측 높이. 열려 있으면 지도 하단 inset으로 쓴다.
  const [detailSheetHeight, setDetailSheetHeight] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const selectedVideo = selectedVideoId ? videoById.get(selectedVideoId) ?? null : null;
  const selectedPlace = selectedPlaceKey ? placeByKey.get(selectedPlaceKey) ?? null : null;
  const selectedChannel = selectedChannelId ? channelById.get(selectedChannelId) ?? null : null;

  // 최근 일주일 사이 지도에 반영된 영상 — 롤링 배너와 전용 시트에서 쓴다.
  const newVideos = useMemo(() => recentlyAddedVideos(), []);

  const videoCountByChannel = useMemo(() => {
    const counts = new Map<string, number>();
    data.videos.forEach((video) => {
      counts.set(video.channelId, (counts.get(video.channelId) ?? 0) + 1);
    });
    return counts;
  }, []);

  const channels = useMemo(
    () =>
      [...data.channels]
        .filter((channel) => videoCountByChannel.has(channel.id))
        .sort(
          (a, b) =>
            (videoCountByChannel.get(b.id) ?? 0) - (videoCountByChannel.get(a.id) ?? 0) ||
            a.name.localeCompare(b.name, 'ko')
        ),
    [videoCountByChannel]
  );

  // 채널·카테고리 필터를 함께(AND) 적용한다.
  const matchesCategory = useCallback(
    (placeKey: string) => {
      if (!selectedCategory) return true;
      const place = placeByKey.get(placeKey);
      return place ? categoryOf(place) === selectedCategory : false;
    },
    [selectedCategory]
  );

  // 채널 필터만 반영한 장소 — 카테고리 픽커는 이 안에 있는 카테고리만 보여준다.
  const channelPlaces = useMemo(
    () =>
      selectedChannelId
        ? data.places.filter((place) =>
            place.videos.some(
              (appearance) => videoById.get(appearance.videoId)?.channelId === selectedChannelId
            )
          )
        : data.places,
    [selectedChannelId]
  );

  const categoryStatsForPicker = useMemo(() => categoryStatsOf(channelPlaces), [channelPlaces]);

  // 카테고리 필터를 반영한 채널별 영상 수 — 채널 픽커는 이 카테고리가 나온 채널만 보여준다.
  const pickerVideoCountByChannel = useMemo(() => {
    if (!selectedCategory) return videoCountByChannel;
    const counts = new Map<string, number>();
    data.videos.forEach((video) => {
      if (!video.placeKeys.some(matchesCategory)) return;
      counts.set(video.channelId, (counts.get(video.channelId) ?? 0) + 1);
    });
    return counts;
  }, [selectedCategory, matchesCategory, videoCountByChannel]);

  const channelsForPicker = useMemo(
    () => channels.filter((channel) => pickerVideoCountByChannel.has(channel.id)),
    [channels, pickerVideoCountByChannel]
  );

  // 채널·카테고리 필터를 통과한 장소.
  const filteredPlaces = useMemo(
    () =>
      channelPlaces.filter(
        (place) => !selectedCategory || categoryOf(place) === selectedCategory
      ),
    [channelPlaces, selectedCategory]
  );

  // 유튜브 출연 TOP10 — 현재 필터 범위 안에서 많이 나온 순. 동률이면 조회수 합으로 가른다.
  const top10Places = useMemo(() => {
    if (!top10Active) return null;
    const totalViews = (placeVideos: typeof data.places[number]['videos']) =>
      placeVideos.reduce(
        (sum, appearance) => sum + (videoById.get(appearance.videoId)?.viewCount ?? 0),
        0
      );
    return [...filteredPlaces]
      .sort(
        (a, b) =>
          b.videos.length - a.videos.length || totalViews(b.videos) - totalViews(a.videos)
      )
      .slice(0, 10);
  }, [top10Active, filteredPlaces]);

  const visibleVideos = useMemo(() => {
    const topKeys = top10Places ? new Set(top10Places.map((place) => place.key)) : null;
    return data.videos.filter(
      (video) =>
        (!selectedChannelId || video.channelId === selectedChannelId) &&
        (!selectedCategory || video.placeKeys.some(matchesCategory)) &&
        (!topKeys || video.placeKeys.some((key) => topKeys.has(key)))
    );
  }, [selectedChannelId, selectedCategory, matchesCategory, top10Places]);

  // 영상을 고르면 그 영상의 장소만, 아니면 필터를 반영한 전체 장소.
  const visiblePlaces = useMemo(() => {
    if (selectedVideo) return placesOf(selectedVideo);
    return top10Places ?? filteredPlaces;
  }, [selectedVideo, top10Places, filteredPlaces]);

  // TOP10 모드에서는 프로필 대신 순위 마커를 그린다.
  const rankByPlaceKey = useMemo(() => {
    if (!top10Places || selectedVideo) return null;
    return new Map(top10Places.map((place, index) => [place.key, index + 1]));
  }, [top10Places, selectedVideo]);

  const markers = useMemo<MapMarker[]>(
    () =>
      visiblePlaces.map((place) => {
        // 마커 프로필은 "지금 보고 있는 맥락"의 채널을 쓴다.
        // 영상을 고른 상태면 그 영상의 채널, 아니면 가장 최근 영상의 채널.
        const appearance =
          (selectedVideoId &&
            place.videos.find((item) => item.videoId === selectedVideoId)) ||
          place.videos[0];
        const video = appearance ? videoById.get(appearance.videoId) : undefined;
        const channel = video ? channelById.get(video.channelId) : undefined;

        return {
          placeKey: place.key,
          lat: place.lat,
          lng: place.lng,
          avatar: channel?.avatar ?? null,
          channelName: channel?.name ?? place.name,
          videoCount: place.videos.length,
          selected: place.key === selectedPlaceKey,
          rank: rankByPlaceKey?.get(place.key) ?? null,
        };
      }),
    [visiblePlaces, selectedPlaceKey, selectedVideoId, rankByPlaceKey]
  );

  // 영상 선택 → 그 영상의 장소가 모두 보이게. 장소 선택 → 그 장소로.
  // 필터(채널·카테고리·TOP10)만 걸린 상태에서도 결과 장소가 모두 들어오게 맞춘다.
  const filtersActive = selectedChannelId !== null || selectedCategory !== null || top10Active;
  const fitTo = useMemo(() => {
    if (selectedPlace) return [{ lat: selectedPlace.lat, lng: selectedPlace.lng }];
    if (selectedVideo) {
      return placesOf(selectedVideo).map((place) => ({ lat: place.lat, lng: place.lng }));
    }
    if (filtersActive) {
      return visiblePlaces.map((place) => ({ lat: place.lat, lng: place.lng }));
    }
    return null;
  }, [selectedPlace, selectedVideo, filtersActive, visiblePlaces]);

  const handleSelectVideo = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    setSelectedPlaceKey(null);
    setSheetExpanded(false);
  }, []);

  const handleBackToVideos = useCallback(() => {
    setSelectedVideoId(null);
    setSelectedPlaceKey(null);
  }, []);

  // 장소 상세가 지도 위로 올라오므로 시트는 접어둔다.
  const handleSelectPlace = useCallback((placeKey: string) => {
    setSelectedPlaceKey(placeKey);
    setSheetExpanded(false);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedPlaceKey(null);
  }, []);

  // 필터를 바꾸면 영상 선택은 풀어준다(다른 조건의 영상이 남아 있으면 혼란스럽다).
  const handleSelectChannel = useCallback((channelId: string | null) => {
    setSelectedChannelId(channelId);
    setSelectedVideoId(null);
    setSelectedPlaceKey(null);
    setOpenPicker(null);
  }, []);

  const handleSelectCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setSelectedVideoId(null);
    setSelectedPlaceKey(null);
    setOpenPicker(null);
  }, []);

  // TOP10은 끄고 켤 때마다 다른 필터를 초기화한다 — 전체 기준의 순위로 시작한다.
  const handleToggleTop10 = useCallback(() => {
    setTop10Active((active) => !active);
    setSelectedChannelId(null);
    setSelectedCategory(null);
    setSelectedVideoId(null);
    setSelectedPlaceKey(null);
  }, []);

  const selectedVideoChannel = selectedVideo
    ? channelById.get(selectedVideo.channelId) ?? null
    : null;
  const selectedVideoDuration = selectedVideo ? formatDuration(selectedVideo.durationSec) : null;

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <NaverMap
          markers={markers}
          fitTo={fitTo}
          onMarkerClick={handleSelectPlace}
          onMapClick={handleMapClick}
          // 상세 시트가 열려 있으면 그 실측 높이, 아니면 접힌 바텀시트 높이만큼이 가려진다.
          bottomInset={selectedPlace ? detailSheetHeight || COLLAPSED_HEIGHT : COLLAPSED_HEIGHT}
          topInset={
            TOP_OVERLAY_HEIGHT + (newVideos.length > 0 ? NEW_VIDEO_TICKER_HEIGHT : 0)
          }
        />
      </div>

      {/* 상단 오버레이 — 로고 + 필터 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto flex items-center gap-2 px-4 pt-3">
          <span className="flex h-[38px] items-center rounded-[19px] bg-white px-3.5 text-[15px] font-bold text-[#0F0F0F] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <span className="mr-1 text-[#FF5C43]">제주</span> 맛집지도
          </span>
          <span className="flex h-[38px] items-center rounded-[19px] bg-white px-3 text-[12px] font-medium text-[#787878] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            영상 {data.videos.length} · 가게 {data.places.length}
          </span>
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="ml-auto flex h-[38px] items-center gap-1 rounded-[19px] bg-[#FF5C43] px-3.5 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:opacity-90"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            영상 추가 요청
          </button>
        </div>
        <div className="pointer-events-auto">
          <FilterBar
            selectedChannel={selectedChannel}
            selectedCategory={selectedCategory}
            top10Active={top10Active}
            onOpenChannelPicker={() => setOpenPicker('channel')}
            onOpenCategoryPicker={() => setOpenPicker('category')}
            onClearChannel={() => handleSelectChannel(null)}
            onClearCategory={() => handleSelectCategory(null)}
            onToggleTop10={handleToggleTop10}
          />
        </div>
        {newVideos.length > 0 && (
          <div className="pointer-events-auto px-4 pt-0.5">
            <NewVideoTicker videos={newVideos} onClick={() => setNewVideosOpen(true)} />
          </div>
        )}
      </div>

      <BottomSheet
        collapsedHeight={COLLAPSED_HEIGHT}
        expandedTopOffset={EXPANDED_TOP_OFFSET}
        expanded={sheetExpanded}
        onExpandedChange={setSheetExpanded}
        resetKey={`${selectedVideoId ?? ''}/${selectedChannelId ?? ''}/${selectedCategory ?? ''}/${top10Active}`}
        header={
          selectedVideo ? (
            <div style={{ borderBottom: '1px solid #F4F4F4' }}>
              <div className="flex items-center gap-2 px-5 pb-2">
                <button
                  type="button"
                  onClick={handleBackToVideos}
                  className="flex h-8 items-center gap-1 rounded-full bg-[#F4F4F4] pl-2 pr-3 text-[13px] font-semibold text-[#4B4B4B] active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  전체 영상
                </button>
              </div>

              {/* 웹에서 직접 재생하지 않는다 — 작은 썸네일을 누르면 유튜브로 이동. */}
              <a
                href={selectedVideo.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-5 pb-3 active:opacity-80"
              >
                <span className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-[10px] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailOf(selectedVideo.id)}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5C43] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="#FFFFFF" aria-hidden="true">
                        <path d="M8 5.5v13l11-6.5-11-6.5z" />
                      </svg>
                    </span>
                  </span>
                  {selectedVideoDuration && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold leading-[15px] text-white">
                      {selectedVideoDuration}
                    </span>
                  )}
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {selectedVideoChannel?.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedVideoChannel.avatar}
                        alt=""
                        className="h-[18px] w-[18px] shrink-0 rounded-full"
                      />
                    )}
                    <span className="min-w-0 truncate text-[13px] font-medium text-[#787878]">
                      {selectedVideoChannel?.name}
                    </span>
                    <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
                    <span className="shrink-0 text-[13px] text-[#8E8E8E]">
                      영상 조회수 {formatCount(selectedVideo.viewCount)}
                    </span>
                    <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
                    <span className="shrink-0 text-[13px] text-[#8E8E8E]">
                      {formatRelativeDate(selectedVideo.publishedAt)}
                    </span>
                  </span>
                  <span
                    className="mt-1 text-[15px] font-bold leading-[20px] text-[#0F0F0F]"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {selectedVideo.title}
                  </span>
                  <span className="mt-1 flex items-center gap-0.5 text-[12px] font-semibold text-[#FF5C43]">
                    YouTube에서 보기
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </span>
                </span>
              </a>
            </div>
          ) : top10Active ? (
            <div className="px-5 pb-3" style={{ borderBottom: '1px solid #F4F4F4' }}>
              <h1 className="text-[18px] font-bold leading-[26px] text-[#0F0F0F]">
                유튜브 출연 TOP10
              </h1>
              <p className="mt-0.5 text-[13px] text-[#8E8E8E]">
                유튜브에 많이 소개된 순서대로 보여드려요
              </p>
            </div>
          ) : (
            <div className="px-5 pb-3" style={{ borderBottom: '1px solid #F4F4F4' }}>
              <h1 className="text-[18px] font-bold leading-[26px] text-[#0F0F0F]">
                유튜브에 나온 제주 맛집
              </h1>
              <p className="mt-0.5 text-[13px] text-[#8E8E8E]">
                영상을 고르면 그 영상에 나온 가게만 지도에 표시돼요
              </p>
            </div>
          )
        }
      >
        {selectedVideo ? (
          <>
            <p className="px-5 pb-1 pt-3 text-[13px] font-bold text-[#8E8E8E]">
              이 영상에 나온 곳 {selectedVideo.placeKeys.length}
            </p>
            {placesOf(selectedVideo).map((place, index) => (
              <PlaceRow
                key={place.key}
                place={place}
                index={index}
                appearance={place.videos.find((item) => item.videoId === selectedVideo.id)}
                selected={place.key === selectedPlaceKey}
                onClick={() => handleSelectPlace(place.key)}
              />
            ))}
          </>
        ) : top10Active ? (
          <>
            {(top10Places ?? []).map((place, index) => (
              <Top10PlaceRow
                key={place.key}
                place={place}
                rank={index + 1}
                selected={place.key === selectedPlaceKey}
                onClick={() => handleSelectPlace(place.key)}
              />
            ))}
          </>
        ) : (
          <>
            {visibleVideos.map((video) => (
              <VideoCard key={video.id} video={video} onClick={() => handleSelectVideo(video.id)} />
            ))}
            {visibleVideos.length === 0 && (
              <p className="px-5 py-10 text-center text-[14px] text-[#8E8E8E]">
                이 조건으로 수집된 영상이 없어요
              </p>
            )}
          </>
        )}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </BottomSheet>

      <PlaceDetailSheet
        place={selectedPlace}
        onClose={() => setSelectedPlaceKey(null)}
        onSelectVideo={handleSelectVideo}
        onHeightChange={setDetailSheetHeight}
      />

      <ChannelPickerSheet
        isOpen={openPicker === 'channel'}
        channels={channelsForPicker}
        videoCountByChannel={pickerVideoCountByChannel}
        selectedChannelId={selectedChannelId}
        onSelect={handleSelectChannel}
        onClose={() => setOpenPicker(null)}
      />
      <CategoryPickerSheet
        isOpen={openPicker === 'category'}
        stats={categoryStatsForPicker}
        selectedCategory={selectedCategory}
        onSelect={handleSelectCategory}
        onClose={() => setOpenPicker(null)}
      />
      <NewVideosSheet
        isOpen={newVideosOpen}
        videos={newVideos}
        onSelect={(videoId) => {
          handleSelectVideo(videoId);
          setNewVideosOpen(false);
        }}
        onClose={() => setNewVideosOpen(false)}
      />
      <VideoRequestModal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} />
    </main>
  );
}
