import React from 'react';

interface GPCloudLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const GPCloudLogo: React.FC<GPCloudLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {withGlow && (
        <div className="absolute inset-0 bg-blue-500/25 blur-xl rounded-full scale-125 pointer-events-none" />
      )}
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(29,78,216,0.45)] relative z-10 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="cloudGrad" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="45%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="cloudHighlight" x1="30%" y1="0%" x2="50%" y2="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cloudPuff" cx="45%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base 3D Cloud Shape */}
        <path
          d="M32 72 C18 72 8 62 8 49 C8 37 17 28 29 27 C33 13 46 4 61 4 C78 4 92 17 92 34 C92 35 92 37 91.8 38.5 C97 41.5 100 47 100 53 C100 63 91 72 80 72 Z"
          fill="url(#cloudGrad)"
        />

        {/* Soft volumetric glow overlay */}
        <path
          d="M32 72 C18 72 8 62 8 49 C8 37 17 28 29 27 C33 13 46 4 61 4 C78 4 92 17 92 34 C92 35 92 37 91.8 38.5 C97 41.5 100 47 100 53 C100 63 91 72 80 72 Z"
          fill="url(#cloudPuff)"
        />

        {/* Top Rim Lighting */}
        <path
          d="M29 27 C33 13 46 4 61 4 C78 4 92 17 92 34 C92 34.5 91.9 35.5 91.8 36.5 C89.5 22 76.5 10.5 61 10.5 C47.5 10.5 35.8 19 32 30.5 C31 29.3 30 28.1 29 27 Z"
          fill="url(#cloudHighlight)"
        />
      </svg>
    </div>
  );
};
