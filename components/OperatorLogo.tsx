import React, { useState } from 'react';
import { Wifi } from 'lucide-react';
import { getOperatorLogoUrl } from '../operatorLogos';

interface OperatorLogoProps {
  name: string;
  className?: string;
  size?: number;
}

export default function OperatorLogo({ name, className = '', size = 32 }: OperatorLogoProps) {
  const [error, setError] = useState(false);
  const url = getOperatorLogoUrl(name);

  if (!url || error) {
    return (
      <div
        className={`rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title={name}
      >
        <Wifi size={size * 0.5} className="text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 grayscale ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
