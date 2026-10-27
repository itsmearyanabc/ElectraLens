'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState } from 'react';

const SPRING = { damping: 20, stiffness: 200, mass: 0.5 };

/** Tilts towards the pointer with a soft sheen, like a laminated card. Still for reduced motion. */
export function TiltCard({
  children,
  className = '',
  maxTilt = 7,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const smoothX = useSpring(x, SPRING);
  const smoothY = useSpring(y, SPRING);
  const rotateX = useTransform(smoothY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [0, 1], [-maxTilt, maxTilt]);
  const sheen = useTransform(
    [smoothX, smoothY],
    ([sx, sy]) =>
      `radial-gradient(circle 340px at ${Number(sx) * 100}% ${Number(sy) * 100}%, rgba(255,255,255,0.5) 0%, rgba(240,120,36,0.06) 40%, transparent 75%)`,
  );

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width);
        y.set((e.clientY - rect.top) / rect.height);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        x.set(0.5);
        y.set(0.5);
      }}
      style={{ transformStyle: 'preserve-3d', rotateX, rotateY }}
      animate={{ scale: hovered ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative motion-reduce:!transform-none ${className}`}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit] transition-opacity duration-300"
        style={{ opacity: hovered ? 1 : 0, background: sheen }}
      />
    </motion.div>
  );
}
