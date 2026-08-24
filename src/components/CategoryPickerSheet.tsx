'use client';

// 카테고리 선택 바텀시트 — 카카오 업종(카페, 한식, 육류,고기 …)을
// 장소 타입(음식점/카페/베이커리/바) 섹션으로 묶어 칩 그리드로 보여준다.
// 섹션 맨 앞의 "전체" 칩으로 대분류를 통째로 고를 수도 있다.
// 이미 선택된 것을 다시 누르면 해제(=전체).
import { useMemo } from 'react';
import PickerSheet from '@/components/PickerSheet';
import { PLACE_TYPE_LABEL } from '@/lib/data';
import type { CategoryFilter, CategoryStat } from '@/lib/data';
import type { PlaceType } from '@/types';

interface CategoryPickerSheetProps {
  isOpen: boolean;
  /** 현재 다른 필터(채널)를 반영한 카테고리 집계. */
  stats: CategoryStat[];
  selectedCategory: CategoryFilter | null;
  onSelect: (category: CategoryFilter | null) => void;
  onClose: () => void;
}

const SECTION_ORDER: PlaceType[] = ['RESTAURANT', 'CAFE', 'BAKERY', 'BAR'];

export default function CategoryPickerSheet({
  isOpen,
  stats,
  selectedCategory,
  onSelect,
  onClose,
}: CategoryPickerSheetProps) {
  const sections = useMemo(
    () =>
      SECTION_ORDER.map((type) => {
        const items = stats.filter((stat) => stat.type === type);
        return {
          type,
          title: PLACE_TYPE_LABEL[type],
          items,
          total: items.reduce((sum, stat) => sum + stat.count, 0),
        };
      }).filter((section) => section.items.length > 0),
    [stats]
  );

  return (
    <PickerSheet isOpen={isOpen} title="오늘 제주에서 뭐 먹지?" onClose={onClose}>
      {sections.map((section) => {
        const typeSelected =
          selectedCategory?.kind === 'type' && selectedCategory.type === section.type;
        return (
          <div key={section.type} className="mt-4 first:mt-1">
            <p className="mb-3 text-[15px] font-semibold leading-[22px] text-[#232323]">
              {section.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* 대분류 통째 선택 — 세부 업종 칩과 같은 줄의 맨 앞 "전체" 칩 */}
              <Chip
                label="전체"
                count={section.total}
                selected={typeSelected}
                onClick={() =>
                  onSelect(typeSelected ? null : { kind: 'type', type: section.type })
                }
              />
              {section.items.map((stat: CategoryStat) => {
                const selected =
                  selectedCategory?.kind === 'category' && selectedCategory.name === stat.name;
                return (
                  <Chip
                    key={stat.name}
                    label={stat.name}
                    count={stat.count}
                    selected={selected}
                    onClick={() =>
                      onSelect(selected ? null : { kind: 'category', name: stat.name })
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </PickerSheet>
  );
}

function Chip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[36px] items-center gap-1 rounded-[18px] px-3.5 text-[13px] font-medium"
      style={{
        backgroundColor: selected ? '#FFF3F4' : '#F7F7F7',
        border: `2px solid ${selected ? '#FF5C43' : 'transparent'}`,
        color: selected ? '#FF5C43' : '#4B4B4B',
        fontWeight: selected ? 700 : 500,
      }}
    >
      {label}
      <span style={{ color: selected ? '#FF858F' : '#B7B7B7' }}>{count}</span>
    </button>
  );
}
