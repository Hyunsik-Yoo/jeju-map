'use client';

// 채널 선택 바텀시트 — 카테고리 픽커와 같은 4열 그리드에 채널 프로필을 얹는다.
// 이미 선택된 채널을 다시 누르면 해제(=전체).
import PickerSheet from '@/components/PickerSheet';
import type { Channel } from '@/types';

interface ChannelPickerSheetProps {
  isOpen: boolean;
  channels: Channel[];
  videoCountByChannel: Map<string, number>;
  selectedChannelId: string | null;
  onSelect: (channelId: string | null) => void;
  onClose: () => void;
}

export default function ChannelPickerSheet({
  isOpen,
  channels,
  videoCountByChannel,
  selectedChannelId,
  onSelect,
  onClose,
}: ChannelPickerSheetProps) {
  return (
    <PickerSheet isOpen={isOpen} title="어떤 유튜버 픽이 궁금해요?" onClose={onClose}>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4 pt-1">
        {channels.map((channel) => {
          const selected = channel.id === selectedChannelId;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(selected ? null : channel.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="relative flex h-[58px] w-[58px] items-center justify-center">
                {selected && (
                  <span className="absolute inset-0 rounded-full border-2 border-[#FF5C43] bg-[#FFF3F4]" />
                )}
                {channel.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.avatar}
                    alt=""
                    className="relative z-[1] h-[52px] w-[52px] rounded-full object-cover"
                  />
                ) : (
                  <span className="relative z-[1] h-[52px] w-[52px] rounded-full bg-[#F4F4F4]" />
                )}
              </span>
              <span
                className="text-center text-[12px] leading-[16px]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'keep-all',
                  color: selected ? '#FF5C43' : '#5A5A5A',
                  fontWeight: selected ? 700 : 500,
                }}
              >
                {channel.name}
                <span className="text-[#B7B7B7]"> {videoCountByChannel.get(channel.id)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </PickerSheet>
  );
}
