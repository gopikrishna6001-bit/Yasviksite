import clsx from 'clsx';

function getCategoryKind(title = '') {
  const value = String(title).toLowerCase();
  if (/oil|ghee|press/.test(value)) return 'oil';
  if (/sweet|honey|jaggery/.test(value)) return 'sweetener';
  if (/flour|chapati|bajra|sorghum flour/.test(value)) return 'flour';
  if (/kid|nutrition|malt|health mix/.test(value)) return 'kids';
  if (/breakfast|dosa|rava|flakes/.test(value)) return 'breakfast';
  if (/instant|noodle|pasta/.test(value)) return 'instant';
  if (/diabetes|diabetic/.test(value)) return 'diabetes';
  if (/dal|grocery|spice|groundnut|essential/.test(value)) return 'essentials';
  if (/traditional|heritage|matta|black rice|red rice|kaikuttal|kattuyanam|karunguruvai/.test(value)) return 'heritage';
  if (/rice|millet|ragi|kodo|foxtail|barnyard|sorghum/.test(value)) return 'grain';
  return 'harvest';
}

function GrainArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="32" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M35 70c10-22 18-34 36-50" stroke="var(--theme-accent)" strokeWidth="5" strokeLinecap="round" fill="none" />
      {[0, 1, 2, 3, 4].map((item) => (
        <ellipse key={item} cx={45 + item * 6} cy={55 - item * 8} rx="6" ry="10" fill="var(--action-primary)" transform={`rotate(${item % 2 ? -28 : 28} ${45 + item * 6} ${55 - item * 8})`} />
      ))}
      <path d="M30 75h48" stroke="var(--text-main)" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function FlourArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="32" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M29 32h42l-5 45H34z" fill="var(--bg-card)" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M35 45h30" stroke="var(--theme-border)" strokeWidth="3" />
      <circle cx="50" cy="58" r="10" fill="var(--action-primary)" opacity=".9" />
      <path d="M42 59c5 4 11 4 16 0" stroke="var(--text-main)" strokeOpacity=".38" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function SweetenerArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="30" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M34 38h32l-3 35H37z" fill="#F5C767" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M38 34h24" stroke="var(--text-main)" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" />
      <path d="M71 43c8 6 7 14-1 21" stroke="var(--action-primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="45" cy="55" r="3" fill="rgba(255,255,255,.65)" />
    </g>
  );
}

function OilArt() {
  return (
    <g>
      <ellipse cx="50" cy="80" rx="26" ry="7" fill="rgba(43,38,33,.12)" />
      <path d="M41 25h18v10l6 9v29c0 5-4 8-8 8H43c-5 0-8-3-8-8V44l6-9z" fill="#E4A83A" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M42 26h16" stroke="var(--text-main)" strokeOpacity=".42" strokeWidth="5" strokeLinecap="round" />
      <rect x="38" y="52" width="24" height="14" rx="4" fill="var(--bg-card)" opacity=".92" />
      <path d="M45 59h10" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function KidsArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="31" ry="8" fill="rgba(43,38,33,.12)" />
      <circle cx="50" cy="39" r="18" fill="var(--action-primary)" opacity=".9" />
      <path d="M32 61c5 12 32 12 37 0" fill="var(--bg-card)" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M41 39h.1M58 39h.1" stroke="var(--text-main)" strokeWidth="4" strokeLinecap="round" />
      <path d="M43 48c5 4 10 4 15 0" stroke="var(--text-main)" strokeOpacity=".5" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function BreakfastArt() {
  return (
    <g>
      <ellipse cx="50" cy="76" rx="34" ry="9" fill="rgba(43,38,33,.12)" />
      <circle cx="46" cy="52" r="23" fill="var(--bg-card)" stroke="var(--theme-accent)" strokeWidth="3" />
      <circle cx="46" cy="52" r="16" fill="#F2D18A" opacity=".85" />
      <path d="M65 55l16 8" stroke="var(--text-main)" strokeOpacity=".36" strokeWidth="5" strokeLinecap="round" />
      <path d="M39 50c6-4 12-3 18 0" stroke="var(--theme-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function InstantArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="30" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M30 43h40l-5 31H35z" fill="var(--bg-card)" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M37 53c7-5 12 5 19 0s10 5 16 0" stroke="#D8953A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M38 61c7-5 12 5 19 0s10 5 16 0" stroke="#D8953A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M36 33h28" stroke="var(--action-primary)" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function DiabetesArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="32" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M50 23l22 14v24c0 13-12 19-22 23-10-4-22-10-22-23V37z" fill="var(--bg-card)" stroke="var(--theme-accent)" strokeWidth="3" />
      <path d="M38 54h24M50 42v24" stroke="var(--action-primary)" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function EssentialsArt() {
  return (
    <g>
      <ellipse cx="50" cy="79" rx="34" ry="8" fill="rgba(43,38,33,.12)" />
      <circle cx="38" cy="54" r="14" fill="#D98B38" />
      <circle cx="56" cy="49" r="16" fill="var(--action-primary)" />
      <circle cx="63" cy="64" r="11" fill="#B15F32" />
      <path d="M32 36c12-7 22-7 36 0" stroke="var(--theme-accent)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function HeritageArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="32" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M29 41c10-13 32-16 45-1-2 20-14 32-31 34-13-7-18-18-14-33z" fill="#B07546" opacity=".9" />
      <path d="M36 48c12 3 22 3 34-1M38 57c9 4 17 5 27 1" stroke="var(--bg-card)" strokeOpacity=".65" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M31 36c8-9 18-13 31-12" stroke="var(--action-primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function HarvestArt() {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="31" ry="8" fill="rgba(43,38,33,.12)" />
      <path d="M50 20c14 16 22 28 22 42 0 12-9 20-22 20s-22-8-22-20c0-14 8-26 22-42z" fill="var(--action-primary)" opacity=".9" />
      <path d="M50 32v38M38 52c6 2 11 7 12 16M62 48c-7 3-11 8-12 17" stroke="var(--text-main)" strokeOpacity=".42" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

const ART_BY_KIND = {
  grain: GrainArt,
  flour: FlourArt,
  sweetener: SweetenerArt,
  oil: OilArt,
  kids: KidsArt,
  breakfast: BreakfastArt,
  instant: InstantArt,
  diabetes: DiabetesArt,
  essentials: EssentialsArt,
  heritage: HeritageArt,
  harvest: HarvestArt,
};

export default function CategoryArtwork({ title, className }) {
  const kind = getCategoryKind(title);
  const Art = ART_BY_KIND[kind] || HarvestArt;

  return (
    <div className={clsx('flex h-full w-full items-center justify-center overflow-hidden bg-[var(--theme-soft)]', className)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${title || 'Yasvik category'} illustration`} className="h-full w-full">
        <rect width="100" height="100" fill="var(--theme-soft)" />
        <circle cx="22" cy="18" r="28" fill="var(--action-primary)" opacity=".16" />
        <circle cx="86" cy="82" r="32" fill="var(--theme-accent)" opacity=".10" />
        <Art />
      </svg>
    </div>
  );
}
