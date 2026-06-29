/**
 * Original panoramic scene: Indian paddy fields at dawn.
 * Farmer and oxen ploughing — field to family table narrative.
 * Styled to blend with Yasvik monsoon tokens (not a repeating tile).
 */
export default function IndianFarmingLandscape() {
  return (
    <div className="yasvik-farming-landscape pointer-events-none absolute inset-x-0 bottom-0 h-[min(300px,40vh)] overflow-hidden">
      {/* Fade art under headline copy on the left */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-r from-[#faf7ef] via-[#faf7ef]/96 to-[#faf7ef]/35 md:from-[#faf7ef] md:via-[#faf7ef]/78 md:to-[#faf7ef]/20"
        aria-hidden="true"
      />
      {/* Fade art upward so CTAs stay crisp */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-t from-[#faf7ef]/15 via-[#faf7ef]/55 to-[#faf7ef]"
        aria-hidden="true"
      />

      <svg
        className="yasvik-farming-landscape-svg absolute bottom-0 left-1/2 h-full w-[min(1180px,165%)] max-w-none"
        viewBox="0 0 960 320"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="yfSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5E6C4" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FAF7EF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FAF7EF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="yfHillFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8A9586" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#5C6B58" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="yfHillMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8B89E" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#8A9586" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="yfPaddyNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8D4BC" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#A8C99A" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="yfPaddyDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8A9586" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#5C6B58" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="yfSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5E6C4" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#E8D4A8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#C49A4E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="960" height="320" fill="url(#yfSky)" />

        <circle className="yasvik-hero-sun" cx="780" cy="58" r="52" fill="url(#yfSun)" />

        {/* Distant hills */}
        <path
          d="M0 168 C120 132 220 148 340 126 C460 104 560 138 680 118 C780 102 860 126 960 112 L960 320 L0 320 Z"
          fill="url(#yfHillFar)"
        />
        <path
          d="M0 198 C160 172 280 188 420 168 C560 148 700 176 860 158 L960 168 L960 320 L0 320 Z"
          fill="url(#yfHillMid)"
        />

        {/* Terraced paddy bands */}
        <path
          d="M0 232 C140 218 260 226 400 214 C540 202 680 220 820 208 C880 202 920 210 960 206 L960 320 L0 320 Z"
          fill="url(#yfPaddyNear)"
        />
        <path
          d="M0 252 C120 244 240 248 380 242 C520 236 660 246 800 238 C880 234 920 240 960 236 L960 320 L0 320 Z"
          fill="url(#yfPaddyDeep)"
        />
        <path
          d="M0 268 C180 262 360 266 540 260 C720 254 840 262 960 256"
          stroke="#1F3D2B"
          strokeOpacity="0.04"
          strokeWidth="1.2"
        />
        <path
          d="M0 278 C200 274 400 276 600 272 C760 268 880 272 960 268"
          stroke="#8B6B3A"
          strokeOpacity="0.06"
          strokeWidth="1"
        />

        {/* Palm silhouette — distant village memory */}
        <g fill="#4B2D22" fillOpacity="0.08">
          <path d="M872 198c8-22 18-34 28-38-2 14-8 26-16 36 10-4 18-2 24 6-12 2-24 0-36-4z" />
          <path d="M900 206 V248" stroke="#4B2D22" strokeWidth="2" strokeOpacity="0.06" />
        </g>

        {/* Farmer ploughing with oxen */}
        <g transform="translate(118 228)" fill="#4B2D22" fillOpacity="0.1">
          {/* Oxen */}
          <ellipse cx="34" cy="18" rx="16" ry="9" />
          <ellipse cx="68" cy="18" rx="16" ry="9" />
          <path d="M18 18 H84" stroke="#4B2D22" strokeOpacity="0.14" strokeWidth="1.2" />
          {/* Plough */}
          <path d="M84 18 L98 28 L98 34" stroke="#6B4E2E" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
          {/* Farmer */}
          <circle cx="102" cy="10" r="5" />
          <path d="M102 15 V28" strokeWidth="2.2" stroke="#4B2D22" strokeOpacity="0.2" />
          <path d="M96 22 H108 M102 28 L98 36 M102 28 L106 36" strokeWidth="1.8" stroke="#4B2D22" strokeOpacity="0.2" strokeLinecap="round" />
        </g>

        {/* Ripples in flooded paddy */}
        <g stroke="#1F3D2B" strokeOpacity="0.03" strokeWidth="1">
          <path d="M220 248 C260 244 300 248 340 244" />
          <path d="M480 252 C520 248 560 252 600 248" />
          <path d="M640 246 C680 242 720 246 760 242" />
        </g>

        {/* Harvest basket near path — food journey hint */}
        <g transform="translate(248 236)" fill="#C49A4E" fillOpacity="0.12" stroke="#8B6B3A" strokeOpacity="0.14" strokeWidth="1">
          <path d="M0 14 C4 6 20 4 28 6 C36 4 48 6 52 14 L48 24 C44 28 8 28 4 24 Z" />
          <path d="M6 10 C10 4 20 2 26 4" strokeWidth="1" fill="none" />
        </g>
      </svg>
    </div>
  );
}
