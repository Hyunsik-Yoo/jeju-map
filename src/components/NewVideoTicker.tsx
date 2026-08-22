'use client';

// 필터 바 바로 아래 — 새로 올라온 영상을 한 편씩 세로로 롤링해서 보여주는 배너.
// 누르면 새로 올라온 영상만 모은 바텀시트(NewVideosSheet)가 뜬다.
import { useEffect, useRef, useState } from 'react';
import { channelOf } from '@/lib/data';
import type { Video } from '@/types';

const ROLL_INTERVAL_MS = 3000;
const ROLL_TRANSITION_MS = 400;
/** 필터 칩(h-34px)과 같은 높이 = 롤링 한 줄의 높이. */
const ITEM_HEIGHT = 34;

interface NewVideoTickerProps {
  videos: Video[];
  onClick: () => void;
}

export default function NewVideoTicker({ videos, onClick }: NewVideoTickerProps) {
  // 끝에 첫 항목을 복제해 붙이고, 복제까지 굴러간 순간 트랜지션 없이 0으로 되감아
  // 무한 루프처럼 보이게 한다. index === videos.length 가 복제 칸이다.
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const rewindTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (videos.length < 2) return;
    const timer = setInterval(() => setIndex((i) => i + 1), ROLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [videos.length]);

  useEffect(() => {
    if (index !== videos.length) return;
    rewindTimer.current = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, ROLL_TRANSITION_MS);
    return () => {
      if (rewindTimer.current) clearTimeout(rewindTimer.current);
    };
  }, [index, videos.length]);

  // 되감은 transform:0 이 그려진 다음 프레임에 트랜지션을 다시 켠다.
  useEffect(() => {
    if (animate) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  if (videos.length === 0) return null;

  const rows = videos.length >= 2 ? [...videos, videos[0]] : videos;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`새로 올라온 영상 ${videos.length}편 보기`}
      className="flex h-[34px] w-full items-center gap-2 rounded-[17px] bg-white pl-2.5 pr-3 text-left shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      style={{ border: '1px solid #E2E2E2' }}
    >
      <span className="shrink-0 rounded-[8px] bg-[#FF5C43] px-1.5 text-[10px] font-extrabold leading-[16px] text-white">
        NEW
      </span>

      <span className="min-w-0 flex-1 overflow-hidden" style={{ height: ITEM_HEIGHT }}>
        <span
          className="flex flex-col"
          style={{
            transform: `translateY(-${index * ITEM_HEIGHT}px)`,
            transition: animate ? `transform ${ROLL_TRANSITION_MS}ms ease` : 'none',
          }}
        >
          {rows.map((video, i) => {
            const channel = channelOf(video);
            return (
              <span
                key={`${video.id}-${i}`}
                className="flex items-center gap-1.5"
                style={{ height: ITEM_HEIGHT }}
              >
                {channel?.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.avatar}
                    alt=""
                    className="h-[20px] w-[20px] shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="min-w-0 truncate text-[12px] font-medium text-[#0F0F0F]">
                  {video.title}
                </span>
              </span>
            );
          })}
        </span>
      </span>

      <span className="shrink-0 text-[11px] font-semibold text-[#8E8E8E]">
        {videos.length}편
      </span>
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8E8E8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}
