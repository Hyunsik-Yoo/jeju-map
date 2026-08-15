'use client';

// 영상 추가 요청 모달 — URL 입력 → 영상 확인(미리보기) → 요청 저장.
// 요청은 서버의 data/video-requests.json 에 쌓이고, 수집 파이프라인에서 처리한다.
import { useState } from 'react';
import PickerSheet from '@/components/PickerSheet';

interface VideoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preview {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  duplicate: 'registered' | 'requested' | null;
}

type Step = 'input' | 'preview' | 'done';

export default function VideoRequestModal({ isOpen, onClose }: VideoRequestModalProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 닫을 때 입력 상태를 초기화한다 (닫기 경로는 전부 onClose를 거친다).
  const handleClose = () => {
    setUrl('');
    setStep('input');
    setPreview(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const submit = async (confirm: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/video-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, confirm }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '확인에 실패했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setPreview(json);
      setStep(confirm && json.saved ? 'done' : 'preview');
    } catch {
      setError('네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PickerSheet isOpen={isOpen} title="영상 추가 요청" onClose={handleClose}>
      {step === 'done' ? (
        <div className="flex flex-col items-center pb-4 pt-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3F4]">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FF5C43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <p className="mt-3 text-[16px] font-bold text-[#0F0F0F]">요청이 접수됐어요</p>
          <p className="mt-1 text-[13px] leading-[19px] text-[#8E8E8E]">
            영상 속 가게를 확인한 뒤 지도에 추가할게요
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-[12px] bg-[#FF5C43] text-[15px] font-bold text-white active:opacity-90"
          >
            확인
          </button>
        </div>
      ) : (
        <div className="pb-4">
          <p className="text-[13px] leading-[19px] text-[#8E8E8E]">
            제주 맛집이 나온 유튜브 영상 주소를 알려주세요.
            <br />
            영상이 적절한지 확인 후에 지도에 추가됩니다.
          </p>

          <input
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setStep('input');
              setPreview(null);
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-3 h-12 w-full rounded-[12px] bg-[#F7F7F7] px-4 text-[14px] text-[#0F0F0F] outline-none placeholder:text-[#B7B7B7] focus:ring-2 focus:ring-[#FF858F]"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />

          {error && <p className="mt-2 text-[13px] text-[#FF5C43]">{error}</p>}

          {step === 'preview' && preview && (
            <div className="mt-3 flex gap-3 rounded-[12px] bg-[#F7F7F7] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.thumbnail}
                alt=""
                className="h-[54px] w-[96px] shrink-0 rounded-[8px] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[14px] font-bold leading-[19px] text-[#0F0F0F]"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {preview.title}
                </p>
                <p className="mt-1 truncate text-[12px] text-[#8E8E8E]">{preview.channelName}</p>
                {preview.duplicate === 'registered' && (
                  <p className="mt-1 text-[12px] font-semibold text-[#FF5C43]">이미 지도에 있는 영상이에요</p>
                )}
                {preview.duplicate === 'requested' && (
                  <p className="mt-1 text-[12px] font-semibold text-[#FF5C43]">이미 요청된 영상이에요</p>
                )}
              </div>
            </div>
          )}

          {step === 'input' || !preview || preview.duplicate ? (
            <button
              type="button"
              disabled={loading || url.trim() === '' || (step === 'preview' && !!preview?.duplicate)}
              onClick={() => submit(false)}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-[12px] bg-[#FF5C43] text-[15px] font-bold text-white active:opacity-90 disabled:bg-[#E2E2E2]"
            >
              {loading ? '확인 중...' : '영상 확인'}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => submit(true)}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-[12px] bg-[#FF5C43] text-[15px] font-bold text-white active:opacity-90 disabled:bg-[#E2E2E2]"
            >
              {loading ? '요청 중...' : '이 영상 추가 요청'}
            </button>
          )}
        </div>
      )}
    </PickerSheet>
  );
}
