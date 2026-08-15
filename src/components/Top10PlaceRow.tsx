'use client';

// 출연 TOP10 리스트의 한 줄 — 가게가 주인공이라 순위·가게 정보에
// "어떤 유튜브에 나왔는지"를 함께 나열한다.
import { PLACE_TYPE_LABEL, channelById, formatCount, videosOf } from '@/lib/data';
import type { Place } from '@/types';

interface Top10PlaceRowProps {
  place: Place;
  /** 1부터 시작하는 순위. */
  rank: number;
  selected?: boolean;
  onClick: () => void;
}

export default function Top10PlaceRow({ place, rank, selected = false, onClick }: Top10PlaceRowProps) {
  const videos = videosOf(place);

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
      {/* 순위 뱃지 — 마커와 같은 시그니처 그라데이션, 1~3위는 골드 링 */}
      <span
        className="mt-[2px] flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full text-white"
        style={{
          background: 'linear-gradient(140deg, #ff8f43 0%, #ff5c43 55%, #f43b4e 100%)',
          border: rank <= 3 ? '2px solid #FFD66B' : '2px solid #FFFFFF',
          boxShadow: '0 2px 6px rgba(244, 59, 78, 0.35)',
        }}
      >
        <span className="text-[13px] font-extrabold leading-[14px]">{rank}</span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold leading-[22px] text-[#0F0F0F]">{place.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-[18px] text-[#8E8E8E]">
          <span className="shrink-0">{place.category || PLACE_TYPE_LABEL[place.type]}</span>
          <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
          <span className="truncate">{place.region}</span>
          <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />
          <span className="shrink-0 font-semibold text-[#FF5C43]">영상 {videos.length}</span>
        </div>

        {/* 이 가게가 나온 유튜브 나열 */}
        <div className="mt-1.5 flex flex-col gap-1">
          {videos.map((video) => {
            const channel = channelById.get(video.channelId);
            return (
              <div key={video.id} className="flex min-w-0 items-center gap-1.5">
                {channel?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.avatar}
                    alt=""
                    className="h-[16px] w-[16px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-[16px] w-[16px] shrink-0 rounded-full bg-[#F4F4F4]" />
                )}
                <span className="shrink-0 text-[12px] font-semibold text-[#5A5A5A]">
                  {channel?.name ?? '알 수 없는 채널'}
                </span>
                <span className="min-w-0 truncate text-[12px] text-[#8E8E8E]">{video.title}</span>
                {video.viewCount !== null && (
                  <span className="shrink-0 text-[12px] text-[#B7B7B7]">
                    영상 조회수 {formatCount(video.viewCount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}
