'use client';

// 필터 선택용 모달 바텀시트 껍데기 — 가슴속 3천원 웹 CategoryPickerModal의 뼈대.
// 딤 배경 + 하단 시트, ESC/배경 탭으로 닫기.
import { ReactNode, useEffect, useRef } from 'react';

interface PickerSheetProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function PickerSheet({ isOpen, title, onClose, children }: PickerSheetProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[80%] w-full flex-col rounded-t-[20px] bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <span className="text-[18px] font-bold leading-[26px] text-[#0F0F0F]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F4F4] text-[#787878]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="scrollbar-hide min-h-0 overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
