import React from 'react';

type FlagSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<FlagSize, { width: number; height: number }> = {
  sm: { width: 32, height: 22 },
  md: { width: 48, height: 34 },
  lg: { width: 64, height: 44 },
};

interface FlagIconProps {
  countryCode: string;
  size?: FlagSize;
  className?: string;
}

const FlagIcon: React.FC<FlagIconProps> = ({ countryCode, size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const code = countryCode.toLowerCase();
  const src = `https://flagcdn.com/w320/${code}.png`;

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: width,
        height: height,
        overflow: 'hidden',
        borderRadius: 4,
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <img
        src={src}
        alt={code.toUpperCase()}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </span>
  );
};

export default FlagIcon;
