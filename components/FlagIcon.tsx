import React, { useEffect, useMemo, useState } from 'react';

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

/** Strict ISO-3166-1 alpha-2 (API must not pass region keys like `AS-7` here). */
function parseIso2(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (s.length === 2 && /^[A-Z]{2}$/.test(s)) return s;
  return null;
}

/** Regional-indicator pair — works offline when flag CDN is blocked. */
function emojiFlag(iso2: string): string {
  const a = iso2.codePointAt(0)!;
  const b = iso2.codePointAt(1)!;
  return String.fromCodePoint(0x1f1e6 + (a - 65), 0x1f1e6 + (b - 65));
}

const shellStyle = (width: number, height: number): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width,
  height,
  overflow: 'hidden',
  borderRadius: 4,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  backgroundColor: '#f3f4f6',
});

const FlagIcon: React.FC<FlagIconProps> = ({ countryCode, size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const iso2 = useMemo(() => parseIso2(countryCode), [countryCode]);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [countryCode]);

  const label = iso2 ?? (countryCode.trim().toUpperCase() || '??');

  if (!iso2 || imgFailed) {
    const glyph = iso2 ? emojiFlag(iso2) : '🌐';
    const fontSize = Math.round(height * 0.62);
    return (
      <span
        className={className}
        style={shellStyle(width, height)}
        title={label}
        role="img"
        aria-label={label}
      >
        <span style={{ fontSize, lineHeight: 1 }} aria-hidden>
          {glyph}
        </span>
      </span>
    );
  }

  const code = iso2.toLowerCase();
  const src = `https://flagcdn.com/w320/${code}.png`;

  return (
    <span className={className} style={shellStyle(width, height)}>
      <img
        src={src}
        alt={iso2}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        onError={() => setImgFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          // `cover` crops wide flags (CA, CH, …) to the center charge only — wrong.
          objectFit: 'contain',
          objectPosition: 'center',
        }}
      />
    </span>
  );
};

export default FlagIcon;
