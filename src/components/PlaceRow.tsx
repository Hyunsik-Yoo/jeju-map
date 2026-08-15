'use client';

// 장소 한 줄. 가슴속 3천원 웹 StoreListItem의 타이포·간격을 따른다.
import { PLACE_TYPE_LABEL, formatOpeningHours } from '@/lib/data';
import type { Place, PlaceAppearance } from '@/types';

interface PlaceRowProps {
  place: Place;
  /** 특정 영상 맥락에서 볼 때, 그 영상에서의 등장 정보. */
  appearance?: PlaceAppearance;
  /** 리스트 순번(영상 상세에서 코스 순서로 읽힌다). */
  index?: number;
  selected?: boolean;
  onClick: () => void;
}

export default function PlaceRow({
  place,
  appearance,
  index,
  selected = false,
  onClick,
}: PlaceRowProps) {
  const hours = formatOpeningHours(place);

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
      {index !== undefined && (
        <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F4F4F4] text-[11px] font-bold text-[#787878]">
          {index + 1}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate text-[16px] font-bold leading-[24px] text-[#0F0F0F]">
            {place.name}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[14px] leading-[20px] text-[#787878]">
          <span className="shrink-0">{place.category || PLACE_TYPE_LABEL[place.type]}</span>
          <Dot />
          <span className="min-w-0 truncate">{place.region}</span>
          {hours && (
            <>
              <Dot />
              <span className="shrink-0">{hours}</span>
            </>
          )}
        </div>

        <p className="mt-0.5 truncate text-[13px] leading-[18px] text-[#B7B7B7]">{place.address}</p>

        {appearance?.featuredMenu && (
          <p className="mt-2 inline-block rounded-[8px] bg-[#FFF3F4] px-2 py-1 text-[13px] font-semibold leading-[18px] text-[#FF5C43]">
            {appearance.featuredMenu}
          </p>
        )}

        {appearance?.context && (
          <p
            className="mt-2 rounded-[12px] bg-[#F7F7F7] px-3 py-2.5 text-[13px] font-medium leading-[18px] text-[#4B4B4B]"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {appearance.context}
          </p>
        )}
      </div>
    </button>
  );
}

function Dot() {
  return <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#C4C4C4]" />;
}
