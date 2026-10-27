"use client";

import { Suspense, useState, useEffect, Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { HeroLighting } from "./hero-lighting";
import { LionCapitalModel } from "./lion-capital-model";
import { HeroFallback } from "./hero-fallback";
import type { PointerTracking } from "./use-hero-pointer-tracking";

interface SceneProps {
  trackingRef: React.RefObject<PointerTracking>;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.warn("WebGL Scene render error caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function LionCapitalScene({ trackingRef }: SceneProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (hasWebGL === false) {
    return <HeroFallback reason="unsupported" />;
  }

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex items-center justify-center">
      <WebGLErrorBoundary fallback={<HeroFallback reason="unsupported" />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{
            position: [0, 0.40, 4.4],
            fov: 42,
            near: 0.1,
            far: 20,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.18,
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D Four-Lion Capital sculpture representing civic vigilance, transparency, and public accountability"
        >
          <HeroLighting />

          <Suspense fallback={null}>
            <LionCapitalModel
              trackingRef={trackingRef}
              onLoaded={() => setIsLoaded(true)}
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* Interactive Micro-Cue Pill */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500">
        <div className="font-mono text-[10px] font-bold text-[#475467] bg-white/95 border border-[#E4E7EC] px-3 py-1 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14663F]" />
          <span>DRAG OR HOVER TO ROTATE</span>
        </div>
      </div>
    </div>
  );
}
