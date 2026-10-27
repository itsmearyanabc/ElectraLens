'use client';

import { Canvas } from '@react-three/fiber';
import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import * as THREE from 'three';

import { HeroFallback } from './HeroFallback';
import { LionCapitalModel } from './LionCapitalModel';
import type { PointerTracking } from './usePointerTracking';

class WebGLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.65} color="#FAF5EE" />
      <hemisphereLight args={['#FFF8F0', '#1E293B', 0.75]} />
      <directionalLight
        position={[3.5, 5.5, 4.5]}
        intensity={2.2}
        color="#FFEED9"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-2.5, 2.5, 2.5, -2.5, 0.5, 12]} />
      </directionalLight>
      <directionalLight position={[-4.5, 3, -2]} intensity={1.1} color="#CFE2FE" />
      <directionalLight position={[0, 4, -4.5]} intensity={1.6} color="#F07824" />
      <pointLight position={[0, 0.5, 3.2]} intensity={0.6} color="#FFE4C4" distance={6} />
    </>
  );
}

export function LionCapitalScene({
  trackingRef,
  label,
  hint,
}: {
  trackingRef: React.RefObject<PointerTracking>;
  label: string;
  hint: string;
}) {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    // Detected once on mount: WebGL support is only known in the browser.
    setWebgl(hasWebGL());
  }, []);

  const fallback = <HeroFallback label={label} />;
  if (webgl !== true) return fallback;

  return (
    <div className="relative h-full w-full">
      <WebGLBoundary fallback={fallback}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0.4, 4.4], fov: 42, near: 0.1, far: 20 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.18,
          }}
          className="cursor-grab active:cursor-grabbing"
          aria-label={label}
          role="img"
        >
          <Lighting />
          <Suspense fallback={null}>
            <LionCapitalModel trackingRef={trackingRef} />
          </Suspense>
        </Canvas>
      </WebGLBoundary>
      <p className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-white/95 px-3 py-1 font-mono text-[10px] font-bold whitespace-nowrap text-muted uppercase shadow-xs">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue" />
        {hint}
      </p>
    </div>
  );
}
