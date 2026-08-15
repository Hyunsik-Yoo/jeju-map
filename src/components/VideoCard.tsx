'use client';

// 영상 리스트의 한 줄. 이 앱의 1차 축은 "영상"이라 홈 리스트가 영상 카드다.
import { channelOf, formatCount, formatDuration, formatRelativeDate, thumbnailOf } from '@/lib/data';
import type { Video } from '@/types';

interface VideoCardProps {
  video: Video;
  selected?: boolean;
  onClick: () => void;
}

export default function VideoCard({ video, selected = false, onClick }: VideoCardProps) {
  const channel = channelOf(video);
  const duration = formatDuration(video.durationSec);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 px-5 py-4 text-left active:bg-[#F7F7F7]"
      style={{
        borderBottom: '1px solid #F4F4F4',
        backgroundColor: selected ? '#FFF3F4' : '#FFFFFF',
      }}
    >
      <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-[10px] bg-[#F4F4F4]">
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
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-1.5">
          {channel?.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.avatar} alt="" className="h-[18px] w-[18px] shrink-0 rounded-full" />
          )}
          <span className="min-w-0 truncate text-[13px] font-medium text-[#787878]">
            {channel?.name ?? '알 수 없는 채널'}
          </span>
        </div>

        <p
          className="mt-1 text-[15px] font-bold leading-[20px] text-[#0F0F0F]"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {video.title}
        </p>

        <div className="mt-1 flex items-center gap-1.5 text-[13px] leading-[18px] text-[#8E8E8E]">
          <span className="shrink-0 font-semibold text-[#FF5C43]">
            {video.placeKeys.length}곳
          </span>
          <Dot />
          <span className="shrink-0">영상 조회수 {formatCount(video.viewCount)}</span>
          <Dot />
          <span className="shrink-0">{formatRelativeDate(video.publishedAt)}</span>
        </div>
      </div>
    </button>
  );
}

function Dot() {
  return <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />;
}
