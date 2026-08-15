'use client';

// 네이버 지도 + 채널 프로필 마커.
// 마커 아이콘은 이미지 URL이 아니라 HtmlIcon(content)으로 그린다 —
// 원형 프로필·선택 링·등장 횟수 뱃지를 CSS로 처리하는 게 훨씬 단순하다.
import { useEffect, useRef, useState } from 'react';
import type { MapMarker } from '@/types';
import { JEJU_CENTER, JEJU_ZOOM } from '@/lib/data';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapProps {
  markers: MapMarker[];
  /** 이 좌표들이 모두 보이도록 지도를 맞춘다(영상 선택 시). null이면 그대로 둔다. */
  fitTo: { lat: number; lng: number }[] | null;
  onMarkerClick: (placeKey: string) => void;
  onMapClick: () => void;
  /** 화면 아래를 덮는 오버레이(바텀시트·상세 시트) 높이(px). 보이는 영역 기준으로 센터·핏을 잡는다. */
  bottomInset: number;
  /** 화면 위를 덮는 오버레이(로고·필터 바) 높이(px). */
  topInset?: number;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

function markerContent(marker: MapMarker): string {
  const selected = marker.selected ? ' jm-marker--selected' : '';

  // 출연 TOP10 — 채널 프로필 대신 시그니처 순위 마커.
  if (marker.rank) {
    const top3 = marker.rank <= 3 ? ' jm-marker__rank--top3' : '';
    return `<div class="jm-marker${selected}"><span class="jm-marker__tail"></span><div class="jm-marker__rank${top3}"><span class="jm-marker__rank-label">TOP</span><span class="jm-marker__rank-number">${marker.rank}</span></div></div>`;
  }

  const size = marker.selected ? 58 : 44;
  const image = marker.avatar
    ? `<img class="jm-marker__avatar" src="${marker.avatar}" alt="" width="${size}" height="${size}" />`
    : `<div class="jm-marker__avatar"></div>`;
  const badge =
    marker.videoCount > 1 ? `<span class="jm-marker__badge">${marker.videoCount}</span>` : '';

  return `<div class="jm-marker${selected}"><span class="jm-marker__tail"></span>${image}${badge}</div>`;
}

export default function NaverMap({
  markers,
  fitTo,
  onMarkerClick,
  onMapClick,
  bottomInset,
  topInset = 0,
}: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markerObjectsRef = useRef<any[]>([]);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    onMapClickRef.current = onMapClick;
  }, [onMarkerClick, onMapClick]);

  // ---- 지도 초기화 ----
  useEffect(() => {
    const initialize = () => {
      // 인증 실패 시 SDK가 로드되어도 하위 모듈(Map/Event)이 비어 있어 가드가 필요하다.
      if (!containerRef.current || !window.naver?.maps?.Map || !window.naver.maps.Event) return;

      const instance = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
        zoom: JEJU_ZOOM,
        minZoom: 9,
        mapTypeControl: false,
        logoControl: false,
        mapDataControl: false,
        scaleControl: false,
        tileDuration: 200,
      });

      // SDK가 비동기로 기본 컨트롤을 다시 붙일 수 있어 init 이후에도 한 번 더 끈다.
      const hideControls = () =>
        instance.setOptions({ logoControl: false, mapDataControl: false, scaleControl: false });
      hideControls();
      window.naver.maps.Event.addListener(instance, 'init', hideControls);
      window.naver.maps.Event.addListener(instance, 'click', () => onMapClickRef.current());

      setMap(instance);
    };

    if (window.naver?.maps) {
      initialize();
      return;
    }

    const existing = document.getElementById('naver-maps-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', initialize);
      return () => existing.removeEventListener('load', initialize);
    }

    const script = document.createElement('script');
    script.id = 'naver-maps-sdk';
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}`;
    script.async = true;
    script.onload = initialize;
    document.head.appendChild(script);
  }, []);

  // ---- 마커 렌더 ----
  useEffect(() => {
    if (!map || !window.naver?.maps) return;

    const objects = markers.map((marker) => {
      const size = marker.selected ? 58 : 44;
      const instance = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(marker.lat, marker.lng),
        title: marker.channelName,
        zIndex: marker.selected ? 1000 : 1,
        icon: {
          content: markerContent(marker),
          size: new window.naver.maps.Size(size, size),
          anchor: new window.naver.maps.Point(size / 2, size + 5),
        },
      });
      window.naver.maps.Event.addListener(instance, 'click', () =>
        onMarkerClickRef.current(marker.placeKey)
      );
      return instance;
    });

    objects.forEach((instance) => instance.setMap(map));
    markerObjectsRef.current = objects;

    return () => {
      objects.forEach((instance) => instance.setMap(null));
    };
  }, [map, markers]);

  // ---- 선택 영역 맞추기 ----
  // 지도는 전체 화면을 채우지만 실제로 "보이는" 영역은 상·하단 오버레이 사이다.
  // 단일 좌표는 보이는 영역의 세로 중앙에 오도록 센터를 남쪽으로 보정해 이동한다
  // (보정 없이 화면 중앙에 두면 시트에 가려 아래로 치우쳐 보인다).
  useEffect(() => {
    if (!map || !window.naver?.maps || !fitTo || fitTo.length === 0) return;

    if (fitTo.length === 1) {
      const { lat, lng } = fitTo[0];
      const zoom = 15;
      // 화면 중앙과 보이는 영역 중앙의 차이(px) → 위도 보정값.
      // 줌 z에서 1px ≈ 156543.03392 * cos(lat) / 2^z 미터, 위도 1도 ≈ 111,320m.
      const pixelShift = (bottomInset - topInset) / 2;
      const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
      const latShift = (pixelShift * metersPerPixel) / 111_320;
      map.morph(new window.naver.maps.LatLng(lat - latShift, lng), zoom);
      return;
    }

    const bounds = new window.naver.maps.LatLngBounds();
    fitTo.forEach((point) =>
      bounds.extend(new window.naver.maps.LatLng(point.lat, point.lng))
    );
    map.fitBounds(bounds, {
      top: topInset + 48,
      right: 48,
      bottom: bottomInset + 24,
      left: 48,
    });
  }, [map, fitTo, bottomInset, topInset]);

  // ---- 시트 높이 변화로 지도 크기가 바뀌면 viewport를 다시 계산 ----
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !map || typeof ResizeObserver === 'undefined') return;

    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.naver.maps.Event.trigger(map, 'resize'));
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [map]);

  return <div ref={containerRef} className="naver-map-container h-full w-full" />;
}
