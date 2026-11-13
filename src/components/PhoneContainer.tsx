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
      className={`min-h-[100dvh] flex flex-col items-center justify-start sm:py-6 sm:px-4 transition-colors duration-300 selection:bg-blue-600 selection:text-white ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#070b13] text-white'
      }`}
    >
      {/* Consistent mobile-proportioned frame across every tab */}
      <div
        className={`w-full max-w-[440px] h-[100dvh] sm:h-[92vh] sm:min-h-[760px] sm:max-h-[920px] flex flex-col border-0 sm:border sm:rounded-[36px] shadow-2xl overflow-hidden relative transition-colors duration-300 ${
          isLight
            ? 'bg-white border-slate-200 shadow-slate-300/60'
            : 'bg-[#0b111c] border-[#1b2b42]'
        }`}
      >
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
