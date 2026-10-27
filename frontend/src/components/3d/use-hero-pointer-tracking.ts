"use client";

import { useEffect, useRef } from "react";

export interface PointerTracking {
  /** Target normalized coordinates [-1, 1] */
  targetX: number;
  targetY: number;
  /** Smoothed damped coordinates [-1, 1] */
  currentX: number;
  currentY: number;
  /** Whether the pointer is currently interacting */
  isHovered: boolean;
  /** Whether user prefers reduced motion */
  reducedMotion: boolean;
}

export function useHeroPointerTracking(containerRef: React.RefObject<HTMLElement | null>) {
  const trackingRef = useRef<PointerTracking>({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    isHovered: false,
    reducedMotion: false,
  });

  useEffect(() => {
    // Detect reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    trackingRef.current.reducedMotion = mediaQuery.matches;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      trackingRef.current.reducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (trackingRef.current.reducedMotion) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Calculate normalized [-1, 1] relative to the hero container
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      // Bound strictly to [-1, 1]
      const clampedX = Math.max(0, Math.min(1, relX)) * 2 - 1;
      const clampedY = Math.max(0, Math.min(1, relY)) * 2 - 1;

      trackingRef.current.targetX = clampedX;
      trackingRef.current.targetY = clampedY;
      trackingRef.current.isHovered = true;
    };

    const handlePointerLeave = () => {
      // Gently return to neutral position
      trackingRef.current.targetX = 0;
      trackingRef.current.targetY = 0;
      trackingRef.current.isHovered = false;
    };

    container.addEventListener("pointermove", handlePointerMove, { passive: true });
    container.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [containerRef]);

  return trackingRef;
}
