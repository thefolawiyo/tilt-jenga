import React from 'react';
import { SceneId } from '../types/game';

interface SceneArtworkProps {
  sceneId: SceneId;
  className?: string;
}

/**
 * Bespoke, high-contrast vector architectural illustrations for each TILT location.
 * Renders crisp at any DPI with zero external network dependencies.
 */
export const SceneArtwork: React.FC<SceneArtworkProps> = ({ sceneId, className = '' }) => {
  switch (sceneId) {
    case 'boxing-ring':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bg-box" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D1426" />
              <stop offset="65%" stopColor="#1B2846" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <radialGradient id="spot-box" cx="50%" cy="18%" r="55%">
              <stop offset="0%" stopColor="#64E5D2" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#64E5D2" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg-box)" />
          <rect width="320" height="180" fill="url(#spot-box)" />
          {/* Overhead light rig */}
          <rect x="70" y="14" width="180" height="6" rx="2" fill="#2A3A5C" />
          <rect x="92" y="19" width="24" height="4" rx="2" fill="#FFF2DC" />
          <rect x="148" y="19" width="24" height="4" rx="2" fill="#64E5D2" />
          <rect x="204" y="19" width="24" height="4" rx="2" fill="#FFF2DC" />
          {/* Crowd silhouettes */}
          <g fill="#121B30" opacity="0.9">
            {[18, 36, 54, 72, 92, 228, 248, 268, 286, 304].map((x, i) => (
              <g key={i}>
                <circle cx={x} cy={96 + (i % 2) * 4} r="7" />
                <rect x={x - 8} y={104 + (i % 2) * 4} width="16" height="24" rx="5" />
              </g>
            ))}
          </g>
          {/* Ring posts & ropes */}
          <rect x="44" y="76" width="9" height="72" rx="2" fill="#FF9B65" />
          <rect x="267" y="76" width="9" height="72" rx="2" fill="#64E5D2" />
          <line x1="52" y1="88" x2="268" y2="88" stroke="#E5ECF8" strokeWidth="2.2" opacity="0.7" />
          <line x1="52" y1="104" x2="268" y2="104" stroke="#64E5D2" strokeWidth="2.2" opacity="0.8" />
          <line x1="52" y1="120" x2="268" y2="120" stroke="#E5ECF8" strokeWidth="2.2" opacity="0.7" />
          {/* Ring canvas & Jenga tower silhouette */}
          <polygon points="28,144 292,144 316,180 4,180" fill="#1D2942" />
          <ellipse cx="160" cy="148" rx="44" ry="11" fill="#293859" stroke="#64E5D2" strokeWidth="1.5" />
          <rect x="147" y="74" width="26" height="72" rx="2" fill="#D5A168" />
          <g stroke="#7A4E27" strokeWidth="1.2">
            {[84, 94, 104, 114, 124, 134].map((y) => (
              <line key={y} x1="147" y1={y} x2="173" y2={y} />
            ))}
          </g>
        </svg>
      );

    case 'lagos-market':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bg-mkt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#355880" />
              <stop offset="55%" stopColor="#CC7A44" />
              <stop offset="100%" stopColor="#5C3B24" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg-mkt)" />
          <circle cx="255" cy="40" r="24" fill="#FFE0A6" opacity="0.85" />
          {/* Background ochre Lagos shop buildings */}
          <rect x="10" y="54" width="66" height="74" fill="#8C5332" />
          <rect x="242" y="48" width="70" height="80" fill="#7D492C" />
          {/* Left & Right Vibrant Striped Market Canopies */}
          <polygon points="8,92 108,82 116,104 4,108" fill="#E85D3F" />
          <polygon points="28,90 48,88 52,106 26,107" fill="#F5D061" />
          <polygon points="68,86 88,84 92,105 68,106" fill="#2A9D8F" />
          <rect x="16" y="106" width="4" height="44" fill="#4A2B18" />
          <rect x="98" y="103" width="4" height="44" fill="#4A2B18" />

          <polygon points="212,82 312,92 316,108 204,104" fill="#2A9D8F" />
          <polygon points="232,84 254,86 254,106 230,105" fill="#FF9B65" />
          <polygon points="274,88 294,90 294,107 272,106" fill="#F5D061" />
          <rect x="216" y="103" width="4" height="44" fill="#4A2B18" />
          <rect x="300" y="106" width="4" height="44" fill="#4A2B18" />

          {/* Overhead festive bunting */}
          <path d="M 18 72 Q 160 94 302 72" fill="none" stroke="#F5D061" strokeWidth="1.8" strokeDasharray="6 4" />
          {/* Market square ground & timber dais */}
          <rect x="0" y="138" width="320" height="42" fill="#6B5340" />
          <ellipse cx="160" cy="148" rx="46" ry="11" fill="#8E5B34" stroke="#FF9B65" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#DEB078" />
        </svg>
      );

    case 'lagos-island':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bg-isl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16213D" />
              <stop offset="55%" stopColor="#6E4438" />
              <stop offset="100%" stopColor="#232833" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg-isl)" />
          {/* Dense Lagos Island skyline & commercial buildings */}
          <rect x="8" y="26" width="52" height="104" fill="#1F273B" />
          <rect x="64" y="42" width="44" height="88" fill="#2A334A" />
          <rect x="214" y="32" width="48" height="98" fill="#263047" />
          <rect x="266" y="18" width="48" height="112" fill="#1C2438" />
          {/* Glowing shopfront signs */}
          <rect x="14" y="92" width="40" height="10" rx="2" fill="#64E5D2" opacity="0.85" />
          <rect x="220" y="88" width="38" height="10" rx="2" fill="#FF9B65" opacity="0.85" />
          {/* Iconic yellow & black Danfo bus silhouette */}
          <rect x="24" y="110" width="62" height="24" rx="4" fill="#F5C542" />
          <rect x="24" y="122" width="62" height="4" fill="#161922" />
          <rect x="30" y="113" width="14" height="7" rx="1" fill="#1D2A40" />
          <rect x="48" y="113" width="14" height="7" rx="1" fill="#1D2A40" />
          <rect x="66" y="113" width="14" height="7" rx="1" fill="#1D2A40" />
          <circle cx="38" cy="134" r="5" fill="#14171F" />
          <circle cx="72" cy="134" r="5" fill="#14171F" />
          {/* Asphalt road & yellow dashed markings */}
          <rect x="0" y="132" width="320" height="48" fill="#252932" />
          <line x1="12" y1="158" x2="308" y2="158" stroke="#F5D061" strokeWidth="2.4" strokeDasharray="16 12" opacity="0.8" />
          <ellipse cx="160" cy="148" rx="44" ry="11" fill="#3B4250" stroke="#F5D061" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#D9A86C" />
        </svg>
      );

    case 'paris-eiffel':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bg-par" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#28355E" />
              <stop offset="56%" stopColor="#C97E63" />
              <stop offset="100%" stopColor="#5C524B" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg-par)" />
          {/* Golden sunset glow */}
          <circle cx="222" cy="78" r="34" fill="#FFE0A8" opacity="0.45" />
          {/* Recognisable Eiffel Tower silhouette offset gracefully to the right */}
          <g fill="#3E3242" opacity="0.92">
            <polygon points="222,12 228,12 238,118 206,118" />
            <polygon points="194,132 250,132 242,102 202,102" />
            <path d="M 205 132 Q 222 112 239 132 Z" fill="#C97E63" />
            <rect x="206" y="80" width="32" height="5" />
            <rect x="213" y="50" width="18" height="4" />
            <rect x="224" y="4" width="2" height="10" fill="#FFE4A6" />
          </g>
          {/* Clipped Parisian hedges & boulevard lamps */}
          <rect x="12" y="114" width="76" height="18" rx="7" fill="#32523C" />
          <rect x="252" y="116" width="60" height="16" rx="7" fill="#32523C" />
          <line x1="78" y1="78" x2="78" y2="132" stroke="#222830" strokeWidth="3" />
          <circle cx="78" cy="75" r="5" fill="#FFE4A0" />
          {/* Cobblestone plaza & dais */}
          <rect x="0" y="132" width="320" height="48" fill="#8C8073" />
          <ellipse cx="145" cy="148" rx="44" ry="11" fill="#C2B8A8" stroke="#F4C983" strokeWidth="1.5" />
          <rect x="133" y="78" width="24" height="68" rx="2" fill="#E0B57D" />
        </svg>
      );

    case 'indoor-gym':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <rect width="320" height="180" fill="#151C24" />
          {/* Overhead industrial LED strips */}
          <rect x="34" y="16" width="70" height="5" rx="2" fill="#E5F4FF" opacity="0.9" />
          <rect x="125" y="16" width="70" height="5" rx="2" fill="#64E5D2" opacity="0.9" />
          <rect x="216" y="16" width="70" height="5" rx="2" fill="#E5F4FF" opacity="0.9" />
          {/* Wall mirror panels */}
          <rect x="18" y="42" width="84" height="80" rx="3" fill="#202D3A" stroke="#364A5E" strokeWidth="2" />
          <rect x="218" y="42" width="84" height="80" rx="3" fill="#202D3A" stroke="#364A5E" strokeWidth="2" />
          {/* Squat rack & barbell silhouettes */}
          <rect x="38" y="54" width="4" height="76" fill="#4E5D6C" />
          <rect x="82" y="54" width="4" height="76" fill="#4E5D6C" />
          <line x1="28" y1="74" x2="96" y2="74" stroke="#9CB0C4" strokeWidth="3" />
          <circle cx="30" cy="74" r="9" fill="#252E38" stroke="#64E5D2" strokeWidth="1.5" />
          <circle cx="94" cy="74" r="9" fill="#252E38" stroke="#64E5D2" strokeWidth="1.5" />
          {/* Dumbbell rack on right */}
          <rect x="232" y="102" width="60" height="26" rx="2" fill="#2C3744" />
          {[240, 254, 268, 282].map((x) => (
            <circle key={x} cx={x} cy="98" r="5" fill="#7D8FA3" />
          ))}
          {/* Rubber floor & mat */}
          <rect x="0" y="132" width="320" height="48" fill="#1B2129" />
          <ellipse cx="160" cy="148" rx="46" ry="11" fill="#27303A" stroke="#64E5D2" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#D5A168" />
        </svg>
      );

    case 'office-lounge':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <rect width="320" height="180" fill="#1D2230" />
          {/* Glass partitions */}
          <rect x="16" y="34" width="110" height="98" fill="#2A3348" opacity="0.7" stroke="#5D6B8C" strokeWidth="1.5" />
          <rect x="194" y="34" width="110" height="98" fill="#2A3348" opacity="0.7" stroke="#5D6B8C" strokeWidth="1.5" />
          {/* Warm pendant lamps */}
          <line x1="90" y1="0" x2="90" y2="44" stroke="#5A6378" strokeWidth="1.5" />
          <ellipse cx="90" cy="46" rx="14" ry="5" fill="#FFE0B5" />
          <line x1="230" y1="0" x2="230" y2="44" stroke="#5A6378" strokeWidth="1.5" />
          <ellipse cx="230" cy="46" rx="14" ry="5" fill="#FFE0B5" />
          {/* Sofa & indoor plant */}
          <rect x="26" y="102" width="68" height="28" rx="6" fill="#464E6B" />
          <rect x="260" y="108" width="20" height="24" rx="3" fill="#B87A56" />
          <circle cx="270" cy="96" r="16" fill="#3B7A57" />
          {/* Oak floor & coffee table */}
          <rect x="0" y="132" width="320" height="48" fill="#5E4A3A" />
          <ellipse cx="160" cy="148" rx="46" ry="11" fill="#A07D5A" stroke="#8581FF" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#DCAC74" />
        </svg>
      );

    case 'neighbourhood-bar':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="bar-glow" cx="50%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FF9B65" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1A110E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="180" fill="#1C120F" />
          <rect width="320" height="180" fill="url(#bar-glow)" />
          {/* Backlit wooden shelves */}
          <rect x="46" y="42" width="228" height="6" fill="#633D26" />
          <rect x="46" y="68" width="228" height="6" fill="#633D26" />
          <rect x="46" y="94" width="228" height="36" fill="#3F2518" />
          {/* Warm glowing pendant lanterns */}
          {[74, 160, 246].map((x) => (
            <g key={x}>
              <line x1={x} y1="0" x2={x} y2="30" stroke="#7A5A42" strokeWidth="1.5" />
              <circle cx={x} cy="34" r="8" fill="#FFD194" />
            </g>
          ))}
          {/* Bar stools */}
          {[56, 264].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="116" rx="14" ry="4" fill="#8C4E32" />
              <line x1={x} y1="118" x2={x} y2="146" stroke="#2B1B14" strokeWidth="3.5" />
            </g>
          ))}
          {/* Dark walnut floor & central table */}
          <rect x="0" y="132" width="320" height="48" fill="#332118" />
          <ellipse cx="160" cy="148" rx="46" ry="11" fill="#5C3B26" stroke="#FF9B65" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#D5A168" />
        </svg>
      );

    case 'public-park':
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bg-prk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A8BB8" />
              <stop offset="60%" stopColor="#9ED4DF" />
              <stop offset="100%" stopColor="#3B6B3B" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg-prk)" />
          <circle cx="64" cy="36" r="18" fill="#FFF7D4" opacity="0.9" />
          {/* Lush trees */}
          <rect x="38" y="88" width="10" height="44" fill="#5E4029" />
          <circle cx="43" cy="72" r="28" fill="#2E6B3E" />
          <circle cx="60" cy="80" r="20" fill="#3D854C" />
          <rect x="266" y="84" width="11" height="48" fill="#5E4029" />
          <circle cx="272" cy="66" r="30" fill="#2B6339" />
          <circle cx="250" cy="78" r="21" fill="#408C50" />
          {/* Park bench */}
          <rect x="88" y="114" width="42" height="8" rx="2" fill="#8C5F3B" />
          <rect x="92" y="122" width="4" height="12" fill="#2D3330" />
          <rect x="122" y="122" width="4" height="12" fill="#2D3330" />
          {/* Grass & circular cedar deck */}
          <rect x="0" y="130" width="320" height="50" fill="#42703D" />
          <ellipse cx="160" cy="148" rx="48" ry="12" fill="#A6784E" stroke="#5CD69A" strokeWidth="1.5" />
          <rect x="148" y="76" width="24" height="70" rx="2" fill="#E0B67D" />
        </svg>
      );

    case 'living-room':
    default:
      return (
        <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
          <rect width="320" height="180" fill="#1F1926" />
          {/* Dusk window & bookshelf */}
          <rect x="20" y="34" width="76" height="68" rx="3" fill="#2A3454" stroke="#50445C" strokeWidth="3" />
          <rect x="228" y="32" width="70" height="96" rx="2" fill="#463126" />
          <rect x="236" y="44" width="54" height="10" fill="#8581FF" opacity="0.65" />
          <rect x="236" y="68" width="54" height="10" fill="#FF9B65" opacity="0.65" />
          <rect x="236" y="92" width="54" height="10" fill="#64E5D2" opacity="0.65" />
          {/* Warm standing floor lamp */}
          <line x1="112" y1="54" x2="112" y2="130" stroke="#9B8A78" strokeWidth="2.5" />
          <polygon points="98,56 126,56 120,38 104,38" fill="#FFE2B3" />
          {/* Parquet floor & woven rug */}
          <rect x="0" y="130" width="320" height="50" fill="#523B2B" />
          <ellipse cx="160" cy="150" rx="76" ry="18" fill="#3B314A" opacity="0.85" />
          <ellipse cx="160" cy="146" rx="44" ry="11" fill="#8E6948" stroke="#C9B4FF" strokeWidth="1.5" />
          <rect x="148" y="74" width="24" height="70" rx="2" fill="#DEB078" />
        </svg>
      );
  }
};
