import React from 'react';
import { AppTheme } from '../utils/theme';

interface PhoneContainerProps {
  children: React.ReactNode;
  theme?: AppTheme;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({
  children,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-1.5 sm:py-6 sm:px-4 transition-colors duration-300 selection:bg-blue-600 selection:text-white ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#070b13] text-white'
      }`}
    >
      {/* Consistent mobile-proportioned frame with animated rotating perimeter glow */}
      <div className="relative w-full max-w-[440px] h-[calc(100dvh-12px)] sm:h-[92vh] sm:min-h-[760px] sm:max-h-[920px]">
        {/* Soft external glowing aura orbiting around the outside of the website */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] rounded-[27px] sm:rounded-[39px] orbit-website-aura opacity-75"
        />

        {/* Crisp 2px rotating rainbow bezel around all 4 sides */}
        <div className="relative w-full h-full p-[2px] rounded-[24px] sm:rounded-[36px] orbit-website-frame shadow-2xl">
          <div
            className={`w-full h-full flex flex-col rounded-[22px] sm:rounded-[34px] overflow-hidden relative transition-colors duration-300 ${
              isLight ? 'bg-white' : 'bg-[#0b111c]'
            }`}
          >
            <main className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden relative">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
