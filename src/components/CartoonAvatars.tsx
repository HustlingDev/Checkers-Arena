import React from 'react';

interface CartoonAvatarProps {
  avatarId: string;
  className?: string;
  size?: number;
}

export const CartoonAvatar: React.FC<CartoonAvatarProps> = ({ avatarId, className = '', size = 64 }) => {
  // Normalize legacy IDs
  let id = avatarId || 'avatar-braids';
  if (id === 'avatar-crown') id = 'avatar-braids';
  else if (id === 'avatar-knight') id = 'avatar-headwrap';
  else if (id === 'avatar-ruby') id = 'avatar-bald-beard';
  else if (id === 'avatar-sapphire') id = 'avatar-cool-shades';
  else if (id === 'avatar-cyber') id = 'avatar-purple-hair';

  switch (id) {
    // 1. Braided cornrows hair, dark skin, determined cartoon face, gold earring/ring (top left in screenshot)
    case 'avatar-braids':
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          <defs>
            <filter id="shadow-braids" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
            </filter>
          </defs>
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />
          
          {/* Neck / base */}
          <path d="M40 76 Q50 82 60 76 L61 88 Q50 92 39 88 Z" fill="#6B3E26" />

          {/* Head base */}
          <path
            d="M26 48 C24 30, 76 30, 74 48 C74 66, 64 80, 50 82 C36 80, 26 66, 26 48 Z"
            fill="#7B492F"
          />

          {/* Ears */}
          <circle cx="25" cy="54" r="5.5" fill="#6B3E26" />
          <circle cx="75" cy="54" r="5.5" fill="#6B3E26" />
          {/* Gold earring on right ear */}
          <circle cx="75" cy="57" r="3" fill="none" stroke="#FBBF24" strokeWidth="1.5" />

          {/* Braided cornrow tracks on top/back */}
          <path
            d="M27 46 C27 24, 73 24, 73 46 C71 36, 62 30, 50 30 C38 30, 29 36, 27 46 Z"
            fill="#1E140F"
          />
          {/* Braids texture lines swept back */}
          <path d="M30 40 Q38 27 50 27 Q62 27 70 40" stroke="#2D1C13" strokeWidth="2.5" fill="none" />
          <path d="M33 34 Q41 24 50 24 Q59 24 67 34" stroke="#2D1C13" strokeWidth="2" fill="none" />
          <path d="M38 28 Q44 21 50 21 Q56 21 62 28" stroke="#3D261A" strokeWidth="2" fill="none" />
          {/* Braid ends ridges */}
          <path d="M26 38 C28 36, 30 38, 30 41" stroke="#1E140F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 32 C30 30, 32 32, 32 35" stroke="#1E140F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 26 C34 24, 36 26, 36 29" stroke="#1E140F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M74 38 C72 36, 70 38, 70 41" stroke="#1E140F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M72 32 C70 30, 68 32, 68 35" stroke="#1E140F" strokeWidth="2.5" strokeLinecap="round" />

          {/* Sharp, determined anime/cartoon eyebrows */}
          <path d="M33 49 L46 53" stroke="#1E140F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M67 49 L54 53" stroke="#1E140F" strokeWidth="3.5" strokeLinecap="round" />

          {/* Cartoon determined eyes */}
          <path d="M34 54 Q40 51 46 55 Q40 61 34 54 Z" fill="#FFFFFF" />
          <path d="M66 54 Q60 51 54 55 Q60 61 66 54 Z" fill="#FFFFFF" />
          {/* Pupils looking slightly forward-right */}
          <circle cx="41" cy="56" r="3.2" fill="#1C1917" />
          <circle cx="42" cy="55" r="1" fill="#FFFFFF" />
          <circle cx="61" cy="56" r="3.2" fill="#1C1917" />
          <circle cx="62" cy="55" r="1" fill="#FFFFFF" />

          {/* Nose */}
          <path d="M48 62 Q50 64 52 62" stroke="#4A2818" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Stern / determined mouth */}
          <path d="M43 71 Q50 72 57 70" stroke="#3D2012" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );

    // 2. Woman with green patterned headwrap/turban, gold hoop earrings, subtle smile (top middle in screenshot)
    case 'avatar-headwrap':
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />

          {/* Big gold hoop earrings */}
          <circle cx="28" cy="65" r="9" fill="none" stroke="#FBBF24" strokeWidth="3" />
          <circle cx="72" cy="65" r="9" fill="none" stroke="#FBBF24" strokeWidth="3" />

          {/* Neck */}
          <path d="M42 75 Q50 82 58 75 L59 88 Q50 92 41 88 Z" fill="#75432B" />

          {/* Face */}
          <path
            d="M32 50 C32 38, 68 38, 68 50 C68 68, 59 79, 50 80 C41 79, 32 68, 32 50 Z"
            fill="#8B5236"
          />

          {/* Green patterned gele / headwrap / turban with folds */}
          <path
            d="M26 48 C24 25, 34 14, 50 14 C66 14, 76 25, 74 48 C70 42, 60 38, 50 38 C40 38, 30 42, 26 48 Z"
            fill="#15803D"
          />
          {/* Turban folds / knots on top */}
          <path
            d="M35 22 C32 12, 45 10, 48 18 C50 12, 65 14, 62 24 C55 20, 42 19, 35 22 Z"
            fill="#16A34A"
          />
          <path
            d="M44 14 C47 9, 54 9, 57 14 C55 17, 46 17, 44 14 Z"
            fill="#22C55E"
          />
          {/* Gold brooch / pin at center of headwrap */}
          <circle cx="50" cy="24" r="2.5" fill="#FBBF24" />

          {/* Turban fold shading lines */}
          <path d="M29 38 Q45 30 71 38" stroke="#166534" strokeWidth="2" fill="none" />
          <path d="M33 30 Q50 23 67 30" stroke="#166534" strokeWidth="2" fill="none" />
          <path d="M38 42 Q50 36 62 42" stroke="#14532D" strokeWidth="2.5" fill="none" />

          {/* Beautiful arched eyebrows */}
          <path d="M36 50 Q43 45 48 50" stroke="#2D1C13" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M54 50 Q59 45 66 50" stroke="#2D1C13" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Expressive cartoon almond eyes looking sideways right */}
          <path d="M37 54 Q43 50 48 54 Q43 60 37 54 Z" fill="#FFFFFF" />
          <path d="M55 54 Q60 50 65 54 Q60 60 55 54 Z" fill="#FFFFFF" />
          {/* Pupils looking right with shine */}
          <circle cx="45" cy="54" r="2.8" fill="#1C1917" />
          <circle cx="46" cy="53" r="0.9" fill="#FFFFFF" />
          <circle cx="63" cy="54" r="2.8" fill="#1C1917" />
          <circle cx="64" cy="53" r="0.9" fill="#FFFFFF" />
          {/* Eyelashes */}
          <path d="M47 51 L49 48" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M64 51 L66 48" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />

          {/* Cute nose */}
          <path d="M48 60 Q50 62 52 60" stroke="#5E3320" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Sweet red smile */}
          <path d="M44 69 Q51 74 58 69" stroke="#DC2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );

    // 3. Bald man with brown skin, goatee beard, angry/intense cartoon eyes (top right in screenshot)
    case 'avatar-bald-beard':
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />

          {/* Neck */}
          <path d="M39 74 Q50 81 61 74 L62 88 Q50 92 38 88 Z" fill="#75472F" />

          {/* Head (Clean Bald dome) */}
          <path
            d="M27 48 C27 25, 73 25, 73 48 C73 66, 63 78, 50 80 C37 78, 27 66, 27 48 Z"
            fill="#8B5539"
          />

          {/* Ears */}
          <circle cx="26" cy="53" r="5" fill="#75472F" />
          <circle cx="74" cy="53" r="5" fill="#75472F" />

          {/* Bald head shine highlight */}
          <path d="M36 32 Q50 26 62 32" stroke="#A66847" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />

          {/* Intense, furrowed, angled dark eyebrows */}
          <path d="M33 46 L47 52" stroke="#1E140F" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M67 46 L53 52" stroke="#1E140F" strokeWidth="4.5" strokeLinecap="round" />
          {/* Brow wrinkle line */}
          <path d="M48 49 L48 45" stroke="#4A291A" strokeWidth="1.8" />
          <path d="M52 49 L52 45" stroke="#4A291A" strokeWidth="1.8" />

          {/* Sharp cartoon eyes */}
          <path d="M35 53 Q41 50 47 54 Q41 60 35 53 Z" fill="#FFFFFF" />
          <path d="M65 53 Q59 50 53 54 Q59 60 65 53 Z" fill="#FFFFFF" />
          {/* Focused pupils */}
          <circle cx="43" cy="55" r="3.2" fill="#1C1917" />
          <circle cx="44" cy="54" r="1" fill="#FFFFFF" />
          <circle cx="57" cy="55" r="3.2" fill="#1C1917" />
          <circle cx="58" cy="54" r="1" fill="#FFFFFF" />

          {/* Nose */}
          <path d="M48 61 Q50 63 52 61" stroke="#4A291A" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Trimmed goatee and pointed beard */}
          <path
            d="M44 68 Q50 67 56 68 L55 77 Q50 83 45 77 Z"
            fill="#261710"
          />
          {/* Mustache strip */}
          <path d="M42 66 Q50 64 58 66" stroke="#261710" strokeWidth="2.5" strokeLinecap="round" />
          {/* Mouth line */}
          <path d="M45 70 Q50 71 55 70" stroke="#150B06" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // 4. Dark skin man wearing green baseball cap and cool black sunglasses (bottom left in screenshot)
    case 'avatar-cool-shades':
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />

          {/* Neck */}
          <path d="M39 75 Q50 82 61 75 L62 88 Q50 92 38 88 Z" fill="#5A341E" />

          {/* Head */}
          <path
            d="M26 50 C26 30, 74 30, 74 50 C74 68, 64 79, 50 81 C36 79, 26 68, 26 50 Z"
            fill="#6B3F25"
          />

          {/* Ears */}
          <circle cx="25" cy="54" r="5.5" fill="#5A341E" />
          <circle cx="75" cy="54" r="5.5" fill="#5A341E" />

          {/* Green baseball cap dome */}
          <path
            d="M26 44 C26 22, 74 22, 74 44 C67 36, 58 33, 50 33 C42 33, 33 36, 26 44 Z"
            fill="#16A34A"
          />
          {/* Cap button on top */}
          <circle cx="50" cy="22" r="2.5" fill="#15803D" />

          {/* Cap visor extending forward */}
          <path
            d="M23 44 C25 39, 75 39, 77 44 C72 49, 28 49, 23 44 Z"
            fill="#15803D"
          />

          {/* Cool Black Sunglasses */}
          {/* Left lens */}
          <path
            d="M30 51 Q41 50 47 52 Q47 62 38 63 Q29 62 30 51 Z"
            fill="#18181B"
            stroke="#09090B"
            strokeWidth="1.5"
          />
          {/* Right lens */}
          <path
            d="M53 52 Q59 50 70 51 Q71 62 62 63 Q53 62 53 52 Z"
            fill="#18181B"
            stroke="#09090B"
            strokeWidth="1.5"
          />
          {/* Glasses bridge */}
          <rect x="46" y="52" width="8" height="3" rx="1.5" fill="#09090B" />
          {/* White shine reflections on lenses */}
          <path d="M33 53 L38 61" stroke="#52525B" strokeWidth="2" strokeLinecap="round" />
          <path d="M56 53 L61 61" stroke="#52525B" strokeWidth="2" strokeLinecap="round" />

          {/* Nose */}
          <path d="M47 66 Q50 68 53 66" stroke="#402313" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Confident mustache & small beard strip */}
          <path d="M42 70 Q50 68 58 70" stroke="#1A1009" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="76" r="2" fill="#1A1009" />
        </svg>
      );

    // 5. Black woman with glasses, short purple-tinted styled hair, purple lipstick, round earring (bottom middle in screenshot)
    case 'avatar-purple-hair':
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />

          {/* Neck */}
          <path d="M41 75 Q50 82 59 75 L60 88 Q50 92 40 88 Z" fill="#6A3B24" />

          {/* Head */}
          <path
            d="M30 48 C30 34, 70 34, 70 48 C70 66, 61 78, 50 80 C39 78, 30 66, 30 48 Z"
            fill="#7C462C"
          />

          {/* Ears with round gold stud earring */}
          <circle cx="28" cy="55" r="4.5" fill="#6A3B24" />
          <circle cx="28" cy="58" r="2.5" fill="#FBBF24" />
          <circle cx="72" cy="55" r="4.5" fill="#6A3B24" />
          <circle cx="72" cy="58" r="2.5" fill="#FBBF24" />

          {/* Short cropped hair with vibrant purple spikes/highlights */}
          <path
            d="M28 44 C26 26, 38 18, 50 18 C62 18, 74 26, 72 44 C67 36, 60 32, 50 32 C40 32, 33 36, 28 44 Z"
            fill="#1E140F"
          />
          {/* Purple stylized spiky tufts on top */}
          <path
            d="M34 26 C36 17, 43 14, 46 20 C48 13, 56 12, 59 19 C61 14, 68 18, 66 26 C60 21, 44 20, 34 26 Z"
            fill="#9333EA"
          />
          <path
            d="M45 16 C48 10, 54 10, 57 16 C53 14, 48 14, 45 16 Z"
            fill="#C084FC"
          />

          {/* Sleek black eyeglass frames */}
          {/* Left frame */}
          <rect
            x="32"
            y="49"
            width="15"
            height="11"
            rx="3"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="2.5"
          />
          {/* Right frame */}
          <rect
            x="53"
            y="49"
            width="15"
            height="11"
            rx="3"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="2.5"
          />
          {/* Glasses bridge & sides */}
          <line x1="47" y1="53" x2="53" y2="53" stroke="#18181B" strokeWidth="2.5" />
          <line x1="28" y1="52" x2="32" y2="52" stroke="#18181B" strokeWidth="2.5" />
          <line x1="68" y1="52" x2="72" y2="52" stroke="#18181B" strokeWidth="2.5" />

          {/* Expressive eyes behind glasses */}
          <circle cx="39" cy="54.5" r="2.8" fill="#1C1917" />
          <circle cx="40" cy="53.5" r="0.9" fill="#FFFFFF" />
          <circle cx="60" cy="54.5" r="2.8" fill="#1C1917" />
          <circle cx="61" cy="53.5" r="0.9" fill="#FFFFFF" />

          {/* Delicate nose */}
          <path d="M48 62 Q50 64 52 62" stroke="#4C2514" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Purple lipstick smile */}
          <path d="M43 70 Q50 75 57 70" stroke="#A855F7" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </svg>
      );

    // 6. Close-cropped buzz cut dark skin man with sharp determined eyes (bottom right in screenshot)
    case 'avatar-buzzcut':
    default:
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 overflow-visible ${className}`}
        >
          {/* Gold bottom accent ring */}
          <ellipse cx="50" cy="88" rx="34" ry="10" fill="none" stroke="#EAB308" strokeWidth="2.5" />

          {/* Neck */}
          <path d="M39 75 Q50 82 61 75 L62 88 Q50 92 38 88 Z" fill="#5F3820" />

          {/* Head */}
          <path
            d="M27 48 C27 26, 73 26, 73 48 C73 66, 63 78, 50 80 C37 78, 27 66, 27 48 Z"
            fill="#724427"
          />

          {/* Ears */}
          <circle cx="26" cy="53" r="5" fill="#5F3820" />
          <circle cx="74" cy="53" r="5" fill="#5F3820" />

          {/* Close-cropped buzz cut fade hairline */}
          <path
            d="M27 46 C27 25, 73 25, 73 46 C67 36, 58 32, 50 32 C42 32, 33 36, 27 46 Z"
            fill="#271810"
          />
          {/* Subtle forehead hairline line */}
          <path d="M32 37 Q50 33 68 37" stroke="#1B100B" strokeWidth="1.5" fill="none" />

          {/* Determined angled eyebrows */}
          <path d="M33 48 L46 53" stroke="#1B100B" strokeWidth="4" strokeLinecap="round" />
          <path d="M67 48 L54 53" stroke="#1B100B" strokeWidth="4" strokeLinecap="round" />

          {/* Sharp cartoon eyes */}
          <path d="M34 54 Q40 51 46 55 Q40 61 34 54 Z" fill="#FFFFFF" />
          <path d="M66 54 Q60 51 54 55 Q60 61 66 54 Z" fill="#FFFFFF" />
          {/* Pupils */}
          <circle cx="41" cy="56" r="3.2" fill="#1C1917" />
          <circle cx="42" cy="55" r="1" fill="#FFFFFF" />
          <circle cx="61" cy="56" r="3.2" fill="#1C1917" />
          <circle cx="62" cy="55" r="1" fill="#FFFFFF" />

          {/* Nose */}
          <path d="M48 62 Q50 64 52 62" stroke="#432311" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Focused mouth & subtle chin goatee spot */}
          <path d="M44 71 Q50 71 56 71" stroke="#25140A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="76" r="1.5" fill="#25140A" />
        </svg>
      );
  }
};
