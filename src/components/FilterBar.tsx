'use client';

// 상단 필터 바 — 가슴속 3천원 웹 HomeFilterBar 대응.
// 칩은 "채널"과 "카테고리" 둘뿐이고, 누르면 각각 선택 바텀시트가 뜬다.
// 선택된 상태면 칩이 선택값(아바타·이름)으로 바뀌고 ×로 해제한다.
import type { Channel } from '@/types';

interface FilterBarProps {
  selectedChannel: Channel | null;
  /** 선택된 카테고리 필터의 표시 라벨("한식", "카페 전체" …). 미선택이면 null. */
  selectedCategoryLabel: string | null;
  top10Active: boolean;
  onOpenChannelPicker: () => void;
  onOpenCategoryPicker: () => void;
  onClearChannel: () => void;
  onClearCategory: () => void;
  onToggleTop10: () => void;
}

export default function FilterBar({
  selectedChannel,
  selectedCategoryLabel,
  top10Active,
  onOpenChannelPicker,
  onOpenCategoryPicker,
  onClearChannel,
  onClearCategory,
  onToggleTop10,
}: FilterBarProps) {
  return (
    <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 py-2">
      <Chip
        label={selectedChannel ? selectedChannel.name : '채널'}
        avatar={selectedChannel?.avatar}
        active={selectedChannel !== null}
        onClick={onOpenChannelPicker}
        onClear={selectedChannel ? onClearChannel : undefined}
      />
      <Chip
        label={selectedCategoryLabel ?? '카테고리'}
        active={selectedCategoryLabel !== null}
        onClick={onOpenCategoryPicker}
        onClear={selectedCategoryLabel ? onClearCategory : undefined}
      />
      {/* 픽커 없이 켜고 끄는 토글 필터 — 유튜브에 많이 나온 가게 TOP10 */}
      <Chip label="출연 TOP10" active={top10Active} onClick={onToggleTop10} toggle />
    </div>
  );
}

function Chip({
  label,
  avatar,
  active,
  onClick,
  onClear,
  toggle = false,
}: {
  label: string;
  avatar?: string | null;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  /** 픽커 없이 자체적으로 켜고 끄는 칩 — 캐럿(▾)을 그리지 않는다. */
  toggle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[17px] px-3 text-[12px] font-medium shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      style={{
        backgroundColor: active ? '#FFF3F4' : '#FFFFFF',
        border: `1px solid ${active ? '#FF858F' : '#E2E2E2'}`,
        color: active ? '#FF5C43' : '#5A5A5A',
      }}
    >
      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="-ml-1 h-[22px] w-[22px] rounded-full object-cover" />
      )}
      <span className="max-w-[130px] truncate">{label}</span>
      {onClear ? (
        <span
          role="button"
          aria-label={`${label} 필터 해제`}
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="-mr-0.5 text-[14px] leading-none"
        >
          ×
        </span>
      ) : toggle ? null : (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </button>
  );
}
