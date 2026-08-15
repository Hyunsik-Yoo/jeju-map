'use client';

// 카테고리 선택 바텀시트 — 카카오 업종(카페, 한식, 육류,고기 …)을
// 장소 타입(음식점/카페/베이커리/바) 섹션으로 묶어 칩 그리드로 보여준다.
// 이미 선택된 카테고리를 다시 누르면 해제(=전체).
import { useMemo } from 'react';
import PickerSheet from '@/components/PickerSheet';
import { PLACE_TYPE_LABEL } from '@/lib/data';
import type { CategoryStat } from '@/lib/data';
import type { PlaceType } from '@/types';

interface CategoryPickerSheetProps {
  isOpen: boolean;
  /** 현재 다른 필터(채널)를 반영한 카테고리 집계. */
  stats: CategoryStat[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
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
      SECTION_ORDER.map((type) => ({
        type,
        title: PLACE_TYPE_LABEL[type],
        items: stats.filter((stat) => stat.type === type),
      })).filter((section) => section.items.length > 0),
    [stats]
  );

  return (
    <PickerSheet isOpen={isOpen} title="오늘 제주에서 뭐 먹지?" onClose={onClose}>
      {sections.map((section) => (
        <div key={section.type} className="mt-4 first:mt-1">
          <p className="mb-3 text-[15px] font-semibold leading-[22px] text-[#232323]">
            {section.title}
          </p>
          <div className="flex flex-wrap gap-2">
            {section.items.map((stat: CategoryStat) => {
              const selected = stat.name === selectedCategory;
              return (
                <button
                  key={stat.name}
                  type="button"
                  onClick={() => onSelect(selected ? null : stat.name)}
                  className="flex h-[36px] items-center gap-1 rounded-[18px] px-3.5 text-[13px] font-medium"
                  style={{
                    backgroundColor: selected ? '#FFF3F4' : '#F7F7F7',
                    border: `2px solid ${selected ? '#FF5C43' : 'transparent'}`,
                    color: selected ? '#FF5C43' : '#4B4B4B',
                    fontWeight: selected ? 700 : 500,
                  }}
                >
                  {stat.name}
                  <span style={{ color: selected ? '#FF858F' : '#B7B7B7' }}>{stat.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </PickerSheet>
  );
}
