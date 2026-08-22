'use client';

// 홈 바텀시트 맨 위 "새로 올라온 영상" 섹션 — 최근 반영된 영상을 가로 스크롤로 보여준다.
// 카드를 고르면 홈 리스트와 같은 흐름(그 영상의 가게만 지도에 표시)으로 이어진다.
import { channelOf, formatDuration, formatRelativeDate, thumbnailOf } from '@/lib/data';
import type { Video } from '@/types';

interface NewVideosRailProps {
  videos: Video[];
  onSelect: (videoId: string) => void;
}

export default function NewVideosRail({ videos, onSelect }: NewVideosRailProps) {
  return (
    <section style={{ borderBottom: '8px solid #F7F7F7' }}>
      <div className="flex items-center gap-1.5 px-5 pb-2 pt-4">
        <span className="rounded-[8px] bg-[#FF5C43] px-1.5 text-[10px] font-extrabold leading-[16px] text-white">
          NEW
        </span>
        <h2 className="text-[15px] font-bold leading-[20px] text-[#0F0F0F]">새로 올라온 영상</h2>
        <span className="text-[13px] font-semibold text-[#B7B7B7]">{videos.length}</span>
      </div>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-5 pb-4">
        {videos.map((video) => {
          const channel = channelOf(video);
          const duration = formatDuration(video.durationSec);
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelect(video.id)}
              className="w-[148px] shrink-0 text-left active:opacity-80"
            >
              <span className="relative block h-[83px] w-[148px] overflow-hidden rounded-[10px] bg-[#F4F4F4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailOf(video.id)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {duration && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold leading-[15px] text-white">
                    {duration}
                  </span>
                )}
              </span>

              <span className="mt-1.5 flex items-center gap-1">
                {channel?.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.avatar}
                    alt=""
                    className="h-[16px] w-[16px] shrink-0 rounded-full"
                  />
                )}
                <span className="min-w-0 truncate text-[11px] font-medium text-[#787878]">
                  {channel?.name ?? '알 수 없는 채널'}
                </span>
              </span>

              <span
                className="mt-0.5 block text-[13px] font-bold leading-[17px] text-[#0F0F0F]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {video.title}
              </span>

              {/* 홈 리스트(VideoCard) 메타 줄과 같은 형태 — N곳 · 업로드 날짜 */}
              <span className="mt-0.5 flex items-center gap-1 text-[11px] leading-[15px]">
                <span className="shrink-0 font-semibold text-[#FF5C43]">
                  {video.placeKeys.length}곳
                </span>
                <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
                <span className="shrink-0 text-[#8E8E8E]">
                  {formatRelativeDate(video.publishedAt)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
