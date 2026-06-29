/**
 * Story section accent: field → home journey (not wallpaper).
 */
export default function StoryJourneyScene() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[min(340px,42vw)] overflow-hidden md:block" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-l from-[#f3ede0]/90 via-[#f3ede0]/35 to-transparent" />
      <svg
        className="absolute bottom-8 right-0 h-[220px] w-full opacity-[0.38]"
        viewBox="0 0 340 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 170 C90 130 150 108 210 92 S300 56 316 36"
          stroke="#8B6B3A"
          strokeWidth="1.5"
          strokeDasharray="7 9"
          strokeOpacity="0.45"
        />
        <g transform="translate(18 158)">
          <path d="M0 14 C6 4 18 0 26 4 L24 16 C20 20 6 20 0 14Z" fill="#62D75F" fillOpacity="0.35" />
          <text x="0" y="36" fill="#1F3D2B" fillOpacity="0.4" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="600">
            Field
          </text>
        </g>
        <g transform="translate(148 108)">
          <circle cx="0" cy="0" r="10" fill="#C49A4E" fillOpacity="0.3" />
          <text x="-16" y="24" fill="#1F3D2B" fillOpacity="0.4" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="600">
            Harvest
          </text>
        </g>
        <g transform="translate(286 24)">
          <rect x="-12" y="0" width="24" height="18" rx="3" fill="#FAF7EF" stroke="#1F3D2B" strokeOpacity="0.2" strokeWidth="1.2" />
          <path d="M-6 8 H6 M-6 12 H4" stroke="#1F3D2B" strokeOpacity="0.25" strokeWidth="1" />
          <text x="-18" y="34" fill="#1F3D2B" fillOpacity="0.4" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="600">
            Your home
          </text>
        </g>
      </svg>
    </div>
  );
}
