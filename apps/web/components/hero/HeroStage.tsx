import { TiltCard } from './TiltCard';

/** The hero: the server-rendered intro beside the roll passport on a tilting card. */
export function HeroStage({
  intro,
  passport,
}: {
  intro: React.ReactNode;
  passport: React.ReactNode;
}) {
  return (
    <div className="container-page relative grid items-center gap-14 pt-16 pb-20 lg:grid-cols-[1.15fr_1fr] lg:pt-24 lg:pb-28">
      <div>{intro}</div>
      <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-6 h-56 w-56 rounded-full bg-peach"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-10 -left-8 h-48 w-48 rounded-full bg-blue-tint"
        />
        <div
          aria-hidden="true"
          className="absolute top-8 -left-4 h-16 w-16 rotate-12 rounded-2xl bg-saffron"
        />
        <TiltCard className="rounded-[28px]">{passport}</TiltCard>
      </div>
    </div>
  );
}
