import React from 'react';

interface GPCloudLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const GPCloudLogo: React.FC<GPCloudLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true,
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
        <div className="absolute inset-0 bg-blue-500/25 blur-xl rounded-full scale-110 pointer-events-none" />
      )}
      <img
        src="/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png"
        alt="Bashar Cloud Logo"
        className="w-full h-full object-cover rounded-2xl relative z-10 drop-shadow-[0_8px_16px_rgba(29,78,216,0.45)] transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};
