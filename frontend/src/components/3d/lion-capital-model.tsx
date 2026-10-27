"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { PointerTracking } from "./use-hero-pointer-tracking";

interface ModelProps {
  trackingRef: React.RefObject<PointerTracking>;
  onLoaded?: () => void;
}

export function LionCapitalModel({ trackingRef, onLoaded }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dragRotationRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerXRef = useRef<number>(0);

  // Load GLB
  const { scene } = useGLTF("/models/four_lion_capital.glb");

  // Clone scene and configure PBR materials
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Ensure museum sandstone material
        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.72,
          metalness: 0.08,
          envMapIntensity: 0.85,
          flatShading: false,
        });

        // Compute smooth vertex normals for soft organic shading
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }
      }
    });

    return clone;
  }, [scene]);

  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
  }, [onLoaded]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const tracking = trackingRef.current;
    const reducedMotion = tracking?.reducedMotion ?? false;

    if (reducedMotion) {
      groupRef.current.rotation.set(0, 0.25, 0);
      groupRef.current.position.set(0, -1.35, 0);
      return;
    }

    const t = state.clock.getElapsedTime();

    // Damping factor (smooth response)
    const factor = Math.min(1.0, delta * 4.5);

    // Target rotations from pointer tracking
    const targetYaw = (tracking?.targetX ?? 0) * 0.28; // ~16 degrees max pointer yaw
    const targetPitch = -(tracking?.targetY ?? 0) * 0.12; // ~7 degrees max pointer pitch

    // Subtle majestic idle motion when not vigorously hovered
    const idleYaw = Math.sin(t * 0.5) * 0.10; // Gentle ~6 degree periodic inspection sway
    const idleBob = Math.sin(t * 1.4) * 0.025; // Gentle breathing motion

    // Current combined targets
    const finalTargetYaw = targetYaw + idleYaw + dragRotationRef.current;
    const finalTargetPitch = targetPitch;

    // Smoothly interpolate current rotation towards target
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      finalTargetYaw,
      factor
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      finalTargetPitch,
      factor
    );

    // Smoothly apply breathing height
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      -1.35 + idleBob,
      factor
    );
  });

  return (
    <group
      ref={groupRef}
      position={[0, -1.35, 0]}
      onPointerDown={(e) => {
        isDraggingRef.current = true;
        lastPointerXRef.current = e.clientX;
        // Capture pointer to allow seamless 360-degree inspection drag
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - lastPointerXRef.current;
        lastPointerXRef.current = e.clientX;
        dragRotationRef.current += deltaX * 0.008;
      }}
      onPointerUp={(e) => {
        isDraggingRef.current = false;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      }}
      onPointerCancel={() => {
        isDraggingRef.current = false;
      }}
    >
      <primitive object={clonedScene} />

      {/* Architectural Plinth Ground Shadow Disc */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.65, 48]} />
        <meshBasicMaterial
          color="#101828"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Preload the model asset so it loads instantaneously
useGLTF.preload("/models/four_lion_capital.glb");
