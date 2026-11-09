import React from 'react';
import { AppTheme } from '../utils/theme';

interface PhoneContainerProps {
  children: React.ReactNode;
  theme?: AppTheme;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children, theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start sm:py-6 sm:px-4 transition-colors duration-300 selection:bg-blue-600 selection:text-white ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#070b13] text-white'
    }`}>
      {/* Sleek mobile device form-factor (max-w-[440px]) without any fake status bar */}
      <div className={`w-full max-w-[440px] min-h-screen sm:min-h-[850px] sm:h-[92vh] sm:max-h-[920px] flex flex-col border-0 sm:border sm:rounded-[36px] shadow-2xl overflow-hidden relative transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-300/60' : 'bg-[#0b111c] border-[#1b2b42]'
      }`}>
        {/* Main Mobile Screen Viewport */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
