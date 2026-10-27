"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function NumberTicker({
  value,
  prefix = "",
  suffix = "",
  duration = 1.1,
  className = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const motionVal = useMotionValue(0);

  const displayVal = useTransform(motionVal, (current) => {
    return `${prefix}${formatNumber(Math.round(current))}${suffix}`;
  });

  useEffect(() => {
    if (!isInView) return;

    // Fluid single-pass easeOutExpo timing
    const startTime = performance.now();
    const durationMs = duration * 1000;

    let animId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutExpo: 1 - 2^(-10 * progress)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      motionVal.set(ease * value);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        motionVal.set(value);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isInView, value, duration, motionVal]);

  return (
    <span ref={ref} className={className}>
      {/* Server render / initial fallback before hydration to avoid layout shift */}
      <span className="tabular-nums">
        {isInView ? (
          <motion.span>{displayVal}</motion.span>
        ) : (
          `${prefix}${formatNumber(value)}${suffix}`
        )}
      </span>
    </span>
  );
}
