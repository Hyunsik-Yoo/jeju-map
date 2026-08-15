import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '제주 맛집지도 · 유튜브에 나온 제주 맛집·카페',
  description:
    '유튜브 영상에 소개된 제주도 맛집·카페를 영상별로 지도에서 확인하세요. 마커를 누르면 그 가게가 나온 영상을 바로 볼 수 있습니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FF5C43',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
