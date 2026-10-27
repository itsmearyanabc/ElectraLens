'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { PointerTracking } from './usePointerTracking';

const MODEL = '/models/four_lion_capital.glb';

/** The Four-Lion Capital: follows the pointer, sways gently at rest, and turns when dragged. */
export function LionCapitalModel({
  trackingRef,
}: {
  trackingRef: React.RefObject<PointerTracking>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const drag = useRef({ active: false, lastX: 0, rotation: 0 });
  const { scene } = useGLTF(MODEL);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.72,
        metalness: 0.08,
      });
      mesh.geometry?.computeVertexNormals();
    });
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const tracking = trackingRef.current;
    if (tracking?.reducedMotion) {
      group.rotation.set(0, 0.25, 0);
      group.position.set(0, -1.35, 0);
      return;
    }
    const t = state.clock.getElapsedTime();
    const factor = Math.min(1, delta * 4.5);
    const yaw = (tracking?.targetX ?? 0) * 0.28 + Math.sin(t * 0.5) * 0.1 + drag.current.rotation;
    const pitch = -(tracking?.targetY ?? 0) * 0.12;
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, yaw, factor);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, pitch, factor);
    group.position.y = THREE.MathUtils.lerp(
      group.position.y,
      -1.35 + Math.sin(t * 1.4) * 0.025,
      factor,
    );
  });

  return (
    <group
      ref={groupRef}
      position={[0, -1.35, 0]}
      onPointerDown={(e) => {
        drag.current.active = true;
        drag.current.lastX = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!drag.current.active) return;
        drag.current.rotation += (e.clientX - drag.current.lastX) * 0.008;
        drag.current.lastX = e.clientX;
      }}
      onPointerUp={() => (drag.current.active = false)}
      onPointerCancel={() => (drag.current.active = false)}
      onPointerLeave={() => (drag.current.active = false)}
    >
      <primitive object={model} />
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.65, 48]} />
        <meshBasicMaterial color="#101828" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL);
