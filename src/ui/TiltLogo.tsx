import React from 'react';

interface TiltLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const TiltLogo: React.FC<TiltLogoProps> = ({ size = 'md' }) => {
  const dimensions = size === 'sm' ? 24 : size === 'lg' ? 38 : 30;
  const fontSize = size === 'sm' ? 17 : size === 'lg' ? 28 : 22;

  return (
    <div className="tilt-logo" aria-label="TILT">
      <div className="tilt-logo-mark">
        <svg
          width={dimensions}
          height={dimensions}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Three stacked blocks with the middle block subtly cantilevered — balance vs chaos */}
          <rect x="4" y="25" width="24" height="6" rx="1.2" fill="#F4F0E8" />
          <rect
            x="9"
            y="15"
            width="23"
            height="6"
            rx="1.2"
            transform="rotate(-5 9 15)"
            fill="#64E5D2"
          />
          <rect x="6" y="5" width="24" height="6" rx="1.2" fill="#FF9B65" />
        </svg>
      </div>
      <span className="tilt-logo-text" style={{ fontSize }}>
        TILT
      </span>
    </div>
  );
};
