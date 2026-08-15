'use client';

// 마커를 누르면 지도 위로 뜨는 장소 상세.
// 가슴속 3천원 웹의 StorePreviewSheet 자리에 대응한다.
import { useEffect, useRef } from 'react';
import {
  PLACE_TYPE_LABEL,
  channelById,
  formatOpeningHours,
  formatRelativeDate,
  kakaoMapUrl,
  thumbnailOf,
  videoById,
  videosOf,
} from '@/lib/data';
import type { Channel, Place } from '@/types';

interface PlaceDetailSheetProps {
  place: Place | null;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
  /** 시트 실제 높이를 부모에 알린다 — 지도가 보이는 영역 기준으로 센터를 잡는 데 쓴다. */
  onHeightChange?: (height: number) => void;
}

export default function PlaceDetailSheet({
  place,
  onClose,
  onSelectVideo,
  onHeightChange,
}: PlaceDetailSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onHeightChangeRef = useRef(onHeightChange);

  useEffect(() => {
    onHeightChangeRef.current = onHeightChange;
  }, [onHeightChange]);

  // 내용에 따라 높이가 달라지므로 실측해서 알린다. 닫히면 0.
  useEffect(() => {
    const element = rootRef.current;
    if (!place || !element) {
      onHeightChangeRef.current?.(0);
      return;
    }
    const report = () => onHeightChangeRef.current?.(element.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [place]);

  if (!place) return null;

  const hours = formatOpeningHours(place);

  // 이 가게를 소개한 채널 목록(중복 제거, 영상 순서 유지).
  const featuredChannels: Channel[] = [];
  for (const video of videosOf(place)) {
    const channel = channelById.get(video.channelId);
    if (channel && !featuredChannels.some((item) => item.id === channel.id)) {
      featuredChannels.push(channel);
    }
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-x-0 bottom-0 z-30 min-h-[282px] max-h-[75%] overflow-y-auto rounded-t-[20px] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.16)]"
    >
      <div className="flex items-start gap-2 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-bold leading-[28px] text-[#0F0F0F]">
            {place.name}
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-[14px] leading-[20px] text-[#787878]">
            <span className="shrink-0">{place.category || PLACE_TYPE_LABEL[place.type]}</span>
            <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
            <span className="truncate">{place.region}</span>
          </div>

          {/* 유튜브 노출 요약 — 몇 번, 어느 채널에 나왔는지 */}
          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <span className="flex shrink-0 -space-x-1.5">
              {featuredChannels.slice(0, 3).map((channel) =>
                channel.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={channel.id}
                    src={channel.avatar}
                    alt=""
                    className="h-[22px] w-[22px] rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <span
                    key={channel.id}
                    className="h-[22px] w-[22px] rounded-full border-2 border-white bg-[#F4F4F4]"
                  />
                )
              )}
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-[#FF5C43]">
              유튜브 {place.videos.length}회 소개
            </span>
            <span className="min-w-0 truncate text-[13px] text-[#8E8E8E]">
              {featuredChannels.map((channel) => channel.name).join(' · ')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F4F4] text-[#787878]"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <dl className="px-5 pb-4 text-[14px] leading-[20px]">
        <div className="flex gap-2 py-1">
          <dt className="w-14 shrink-0 text-[#B7B7B7]">주소</dt>
          <dd className="min-w-0 flex-1 text-[#4B4B4B]">{place.address}</dd>
        </div>
        {hours && (
          <div className="flex gap-2 py-1">
            <dt className="w-14 shrink-0 text-[#B7B7B7]">영업시간</dt>
            <dd className="min-w-0 flex-1 text-[#4B4B4B]">{hours}</dd>
          </div>
        )}
      </dl>

      <div className="px-5 pb-4">
        <a
          href={kakaoMapUrl(place)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#FF5C43] text-[15px] font-bold text-white active:opacity-90"
        >
          카카오맵에서 열기
        </a>
      </div>

      <div style={{ borderTop: '1px solid #F4F4F4' }}>
        <p className="px-5 pb-2 pt-4 text-[13px] font-bold text-[#8E8E8E]">
          이 가게가 나온 영상 {place.videos.length}
        </p>

        {place.videos.map((appearance) => {
          const video = videoById.get(appearance.videoId);
          if (!video) return null;
          const channel = channelById.get(video.channelId);

          return (
            <button
              key={appearance.videoId}
              type="button"
              onClick={() => onSelectVideo(appearance.videoId)}
              className="flex w-full gap-3 px-5 py-3 text-left active:bg-[#F7F7F7]"
            >
              <div className="h-[54px] w-[96px] shrink-0 overflow-hidden rounded-[8px] bg-[#F4F4F4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailOf(video.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[14px] font-bold leading-[19px] text-[#0F0F0F]"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {video.title}
                </p>
                <p className="mt-1 truncate text-[12px] text-[#8E8E8E]">
                  {channel?.name} · {formatRelativeDate(video.publishedAt)}
                </p>
                {appearance.featuredMenu && (
                  <p className="mt-1 truncate text-[12px] font-semibold text-[#FF5C43]">
                    {appearance.featuredMenu}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
