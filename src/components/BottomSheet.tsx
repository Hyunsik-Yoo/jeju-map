'use client';

// 가슴속 3천원 웹의 HomeBottomSheet를 이 앱에 맞게 줄인 버전.
// 스냅 포인트 2개(접힘/펼침) + 핸들 드래그 + 리스트 스크롤 연동.
//  · 접힘 상태에서 리스트를 위로 스크롤/스와이프하면 먼저 시트가 펼쳐지고,
//  · 펼침 상태에서 리스트 최상단에서 아래로 스크롤/스와이프하면 시트가 접힌다.
// 펼칠수록 상단 라운드를 줄여 배경과 이음새 없이 붙는 것도 동일하게 맞췄다.
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface BottomSheetProps {
  children: ReactNode;
  collapsedHeight: number;
  expandedTopOffset: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** 시트 상단에 고정으로 붙는 영역(헤더). 스크롤되지 않는다. */
  header?: ReactNode;
  /** 리스트 스크롤을 맨 위로 되돌리는 트리거. */
  resetKey?: string | number;
}

const DRAG_THRESHOLD = 6;
/** 제스처 방향을 판정하기 전까지 무시하는 이동량. */
const GESTURE_INTENT = 3;
/** 이만큼 이상 움직였으면 이동 방향으로 스냅한다(중간점 무관). */
const DIRECTIONAL_SNAP_DISTANCE = 24;
/** 리스트 "최상단" 판정 여유. */
const TOP_EDGE_TOLERANCE = 8;

export default function BottomSheet({
  children,
  collapsedHeight,
  expandedTopOffset,
  expanded,
  onExpandedChange,
  header,
  resetKey,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const dragOffsetRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => setSheetHeight(sheetRef.current?.offsetHeight ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [expandedTopOffset]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [resetKey]);

  const collapsedTranslate = Math.max(sheetHeight - collapsedHeight, 0);
  const committedTranslate = expanded ? 0 : collapsedTranslate;
  const translateY = dragOffset ?? committedTranslate;
  const collapseFraction = collapsedTranslate > 0 ? translateY / collapsedTranslate : expanded ? 0 : 1;

  const setOffset = useCallback((value: number | null) => {
    dragOffsetRef.current = value;
    setDragOffset(value);
  }, []);

  // 현재 오프셋 기준 가까운(또는 지정 방향) 스냅 포인트로 커밋.
  const snap = useCallback(
    (direction?: 'expand' | 'collapse') => {
      const current = dragOffsetRef.current ?? committedTranslate;
      const willExpand = direction ? direction === 'expand' : current < collapsedTranslate / 2;
      setOffset(null);
      onExpandedChange(willExpand);
    },
    [committedTranslate, collapsedTranslate, onExpandedChange, setOffset]
  );

  // ---- 핸들 드래그 ----
  const dragState = useRef<{ startY: number; currentY: number; base: number; moved: boolean } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      dragState.current = {
        startY: event.clientY,
        currentY: event.clientY,
        base: committedTranslate,
        moved: false,
      };

      const onMove = (moveEvent: PointerEvent) => {
        const state = dragState.current;
        if (!state) return;
        const delta = moveEvent.clientY - state.startY;
        state.currentY = moveEvent.clientY;
        if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
        state.moved = true;
        setOffset(Math.min(Math.max(state.base + delta, 0), collapsedTranslate));
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);

        const state = dragState.current;
        dragState.current = null;

        // 움직이지 않았으면 탭으로 보고 상태를 뒤집는다.
        if (!state?.moved) {
          setOffset(null);
          onExpandedChange(!expanded);
          return;
        }
        const distance = state.currentY - state.startY;
        snap(
          Math.abs(distance) >= DIRECTIONAL_SNAP_DISTANCE
            ? distance < 0
              ? 'expand'
              : 'collapse'
            : undefined
        );
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [collapsedTranslate, committedTranslate, expanded, onExpandedChange, setOffset, snap]
  );

  // ---- 스크롤 연동 ----
  // 리스트뿐 아니라 헤더 등 시트 어디를 스크롤/스와이프해도 같은 규칙으로 시트가 움직이도록
  // 리스너는 시트 전체에 걸고, 리스트 최상단 판정만 스크롤 영역을 본다.
  // 핸들은 자체 포인터 드래그가 있어 제외한다.
  useEffect(() => {
    const el = sheetRef.current;
    const scrollEl = scrollRef.current;
    if (!el || !scrollEl) return;

    // 터치: 접힘+위로 스와이프, 또는 펼침+최상단+아래로 스와이프면 시트가 손가락을 따라온다.
    let touch: { startY: number; currentY: number; base: number; mode: 'sheet' | 'list' | null } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-sheet-handle]')) return;
      const y = e.touches[0].clientY;
      touch = { startY: y, currentY: y, base: dragOffsetRef.current ?? committedTranslate, mode: null };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touch) return;
      touch.currentY = e.touches[0].clientY;
      const dy = touch.currentY - touch.startY;
      if (touch.mode === null) {
        if (Math.abs(dy) < GESTURE_INTENT) return;
        // 헤더처럼 스크롤 영역 밖에서 시작한 제스처는 리스트 스크롤과 무관하므로 항상 시트를 움직인다.
        const inScroll = scrollEl.contains(e.target as Node);
        if (touch.base >= collapsedTranslate) {
          touch.mode = dy < 0 ? 'sheet' : 'list'; // 접힘: 위로 스와이프 → 시트부터 펼친다
        } else if (!inScroll) {
          touch.mode = 'sheet';
        } else {
          touch.mode = scrollEl.scrollTop <= TOP_EDGE_TOLERANCE && dy > 0 ? 'sheet' : 'list'; // 펼침: 최상단에서 아래로 → 시트를 접는다
        }
      }
      if (touch.mode === 'sheet') {
        const target = Math.min(Math.max(touch.base + dy, 0), collapsedTranslate);
        setOffset(target);
        e.preventDefault();
      }
    };
    const onTouchEnd = () => {
      if (touch && touch.mode === 'sheet') {
        const distance = touch.currentY - touch.startY;
        snap(
          Math.abs(distance) >= DIRECTIONAL_SNAP_DISTANCE
            ? distance < 0
              ? 'expand'
              : 'collapse'
            : undefined
        );
      }
      touch = null;
    };

    // 휠(데스크톱): 스크롤 델타만큼 시트를 이동하고, 멈추면 스냅.
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      const base = dragOffsetRef.current ?? committedTranslate;
      // 헤더 등 스크롤 영역 밖에서의 휠은 리스트 위치와 무관하게 시트를 움직인다.
      const atTop = !scrollEl.contains(e.target as Node) || scrollEl.scrollTop <= 0;
      let drive = false;
      if (e.deltaY > 0 && base > 0) drive = true; // 아래로 스크롤 → 펼침 방향
      else if (e.deltaY < 0 && atTop && base < collapsedTranslate) drive = true; // 최상단에서 위로 → 접힘 방향
      if (!drive) return;
      e.preventDefault();
      const target = Math.min(Math.max(base - e.deltaY, 0), collapsedTranslate);
      setOffset(target);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => snap(), 90);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [committedTranslate, collapsedTranslate, setOffset, snap]);

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.10)]"
      style={{
        top: expandedTopOffset,
        transform: `translateY(${translateY}px)`,
        transition: dragOffset === null ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        borderTopLeftRadius: 20 * collapseFraction,
        borderTopRightRadius: 20 * collapseFraction,
      }}
    >
      <div
        data-sheet-handle
        onPointerDown={handlePointerDown}
        className="flex h-[26px] shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <span className="h-1 w-9 rounded-full" style={{ backgroundColor: '#E2E2E2' }} />
      </div>

      {header}

      <div
        ref={scrollRef}
        className="scrollbar-hide min-h-0 flex-1 overscroll-contain"
        style={{ overflowY: expanded ? 'auto' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}
