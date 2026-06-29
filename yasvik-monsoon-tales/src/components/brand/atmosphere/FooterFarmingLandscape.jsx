/** Wide faded field scene — footer illustration carries the visual weight. */
export default function FooterFarmingLandscape() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(300px,42vw)] overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#faf7ef] via-[#faf7ef]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#faf7ef]/90 via-transparent to-[#faf7ef]/90" />

      <svg
        className="yasvik-footer-landscape-svg absolute bottom-0 left-1/2 h-full w-[min(1200px,200%)] max-w-none opacity-[0.55]"
        viewBox="0 0 960 280"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ftSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5E6C4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FAF7EF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ftHillFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8A9586" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#5C6B58" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="ftHillMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8B89E" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8A9586" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="ftPaddyNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8D4BC" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#A8C99A" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="ftPaddyDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8A9586" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#5C6B58" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="ftSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5E6C4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#C49A4E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="960" height="280" fill="url(#ftSky)" />
        <circle cx="800" cy="48" r="44" fill="url(#ftSun)" />

        <path
          d="M0 148 C120 118 220 132 340 114 C460 96 560 124 680 106 C780 92 860 112 960 98 L960 280 L0 280 Z"
          fill="url(#ftHillFar)"
        />
        <path
          d="M0 176 C160 154 280 168 420 150 C560 132 700 158 860 142 L960 150 L960 280 L0 280 Z"
          fill="url(#ftHillMid)"
        />
        <path
          d="M0 206 C140 194 260 202 400 192 C540 182 680 198 820 188 C880 184 920 192 960 188 L960 280 L0 280 Z"
          fill="url(#ftPaddyNear)"
        />
        <path
          d="M0 226 C120 218 240 222 380 216 C520 210 660 220 800 214 C880 210 920 216 960 212 L960 280 L0 280 Z"
          fill="url(#ftPaddyDeep)"
        />

        <path
          d="M0 238 C200 228 400 232 600 226 C760 222 880 228 960 224"
          stroke="#8B6B3A"
          strokeOpacity="0.1"
          strokeWidth="1"
        />

        <g fill="#4B2D22" fillOpacity="0.09">
          <path d="M868 168c8-20 16-30 24-34-2 12-6 22-12 30 8-3 14-2 20 4-10 2-20 0-32-4z" />
        </g>

        <g transform="translate(100 198)" fill="#4B2D22" fillOpacity="0.1">
          <ellipse cx="34" cy="16" rx="15" ry="8" />
          <ellipse cx="66" cy="16" rx="15" ry="8" />
          <path d="M20 16 H80" stroke="#4B2D22" strokeOpacity="0.12" strokeWidth="1.2" />
          <path d="M80 16 L92 24 L92 30" stroke="#6B4E2E" strokeOpacity="0.18" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="96" cy="8" r="4.5" />
          <path d="M96 12.5 V24" strokeWidth="2" stroke="#4B2D22" strokeOpacity="0.18" />
          <path d="M91 18 H101 M96 24 L92 31 M96 24 L100 31" strokeWidth="1.6" stroke="#4B2D22" strokeOpacity="0.18" strokeLinecap="round" />
        </g>

        <g transform="translate(520 212)" fill="#C49A4E" fillOpacity="0.11" stroke="#8B6B3A" strokeOpacity="0.12" strokeWidth="1">
          <path d="M0 12 C4 5 18 3 26 5 C34 3 44 5 48 12 L44 20 C40 24 8 24 4 20 Z" />
        </g>

        <g stroke="#1F3D2B" strokeOpacity="0.04" strokeWidth="1">
          <path d="M300 228 C340 224 380 228 420 224" />
          <path d="M560 232 C600 228 640 232 680 228" />
        </g>
      </svg>
    </div>
  );
}
