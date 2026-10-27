'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';

import { HeroFallback } from './HeroFallback';
import { TiltCard } from './TiltCard';
import { usePointerTracking } from './usePointerTracking';

/** Three.js stays out of the server bundle and loads after the page is interactive. */
const LionCapitalScene = dynamic(
  () => import('./LionCapitalScene').then((mod) => mod.LionCapitalScene),
  { ssr: false, loading: () => <HeroFallback label="" /> },
);

/**
 * The hero's interactive half: the 3D Four-Lion Capital in the middle and the roll passport
 * (rendered on the server, passed in) on a tilting card. The text column stays server-rendered.
 */
export function HeroStage({
  intro,
  passport,
  sceneLabel,
  sceneHint,
}: {
  intro: React.ReactNode;
  passport: React.ReactNode;
  sceneLabel: string;
  sceneHint: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const trackingRef = usePointerTracking(stageRef);

  return (
    <div
      ref={stageRef}
      className="container-page relative grid items-center gap-8 pt-10 pb-16 lg:grid-cols-12 lg:gap-6 lg:pt-16 lg:pb-24"
    >
      <div className="lg:col-span-5 xl:col-span-4">{intro}</div>
      <div className="relative flex items-center justify-center lg:col-span-3 xl:col-span-4">
        <div
          aria-hidden="true"
          className="absolute h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-saffron-tint via-blue-tint to-saffron-tint opacity-75 blur-2xl sm:h-[420px] sm:w-[420px]"
        />
        <div className="relative h-[380px] w-full sm:h-[460px] lg:h-[520px]">
          <LionCapitalScene trackingRef={trackingRef} label={sceneLabel} hint={sceneHint} />
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-md lg:col-span-4 lg:max-w-none">
        <div
          aria-hidden="true"
          className="absolute -top-6 -right-6 h-56 w-56 rounded-full bg-blue-tint"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-8 -left-6 h-44 w-44 rounded-full bg-saffron-tint"
        />
        <TiltCard className="rounded-[28px]">{passport}</TiltCard>
      </div>
    </div>
  );
}
