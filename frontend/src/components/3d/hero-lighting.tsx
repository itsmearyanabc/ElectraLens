"use client";

import { useRef } from "react";
import * as THREE from "three";

export function HeroLighting() {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      {/* Ambient Fill */}
      <ambientLight intensity={0.65} color="#FAF5EE" />

      {/* Hemisphere Light: Warm skylight and slate ground bounce */}
      <hemisphereLight
        args={["#FFF8F0", "#1E293B", 0.75]}
      />

      {/* Primary Key Light: Broad warm architectural sunlight */}
      <directionalLight
        ref={keyLightRef}
        position={[3.5, 5.5, 4.5]}
        intensity={2.2}
        color="#FFEED9"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-2.5, 2.5, 2.5, -2.5, 0.5, 12]}
        />
      </directionalLight>

      {/* Secondary Fill Light: Cool analytical sky blue */}
      <directionalLight
        position={[-4.5, 3.0, -2.0]}
        intensity={1.1}
        color="#CFE2FE"
      />

      {/* Saffron / Amber Rim Light: Highlights the back-to-back manes and silhouette */}
      <directionalLight
        position={[0.0, 4.0, -4.5]}
        intensity={1.6}
        color="#F07824"
      />

      {/* Low front specular booster */}
      <pointLight
        position={[0, 0.5, 3.2]}
        intensity={0.6}
        color="#FFE4C4"
        distance={6}
      />
    </>
  );
}
