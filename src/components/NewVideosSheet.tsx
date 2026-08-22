'use client';

// 새로 올라온 영상만 모은 바텀시트 — NewVideoTicker(롤링 배너)를 누르면 뜬다.
// 영상을 고르면 홈과 같은 흐름(그 영상의 가게만 지도에 표시)으로 이어진다.
import PickerSheet from '@/components/PickerSheet';
import VideoCard from '@/components/VideoCard';
import type { Video } from '@/types';

interface NewVideosSheetProps {
  isOpen: boolean;
  videos: Video[];
  onSelect: (videoId: string) => void;
  onClose: () => void;
}

export default function NewVideosSheet({ isOpen, videos, onSelect, onClose }: NewVideosSheetProps) {
  return (
    <PickerSheet isOpen={isOpen} title="새로 올라온 영상" onClose={onClose}>
      <p className="pb-2 text-[13px] text-[#8E8E8E]">
        최근 일주일 사이 지도에 새로 반영된 영상이에요
      </p>
      {/* VideoCard가 자체 좌우 패딩(px-5)을 가져서 시트 패딩을 상쇄한다. */}
      <div className="-mx-5">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} onClick={() => onSelect(video.id)} />
        ))}
      </div>
    </PickerSheet>
  );
}
