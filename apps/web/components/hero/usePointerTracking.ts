'use client';

import { useEffect, useRef } from 'react';

export interface PointerTracking {
  /** Pointer position over the hero, each axis in [-1, 1]. */
  targetX: number;
  targetY: number;
  reducedMotion: boolean;
}

/** Tracks the pointer over the hero without re-rendering; the 3D scene reads it every frame. */
export function usePointerTracking(containerRef: React.RefObject<HTMLElement | null>) {
  const trackingRef = useRef<PointerTracking>({ targetX: 0, targetY: 0, reducedMotion: false });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    trackingRef.current.reducedMotion = media.matches;
    const onMedia = (e: MediaQueryListEvent) => {
      trackingRef.current.reducedMotion = e.matches;
    };
    media.addEventListener('change', onMedia);

    const container = containerRef.current;
    if (!container) return () => media.removeEventListener('change', onMedia);

    const onMove = (e: PointerEvent) => {
      if (trackingRef.current.reducedMotion) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const clamp = (v: number) => Math.max(0, Math.min(1, v)) * 2 - 1;
      trackingRef.current.targetX = clamp((e.clientX - rect.left) / rect.width);
      trackingRef.current.targetY = clamp((e.clientY - rect.top) / rect.height);
    };
    const onLeave = () => {
      trackingRef.current.targetX = 0;
      trackingRef.current.targetY = 0;
    };
    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      media.removeEventListener('change', onMedia);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, [containerRef]);

  return trackingRef;
}
