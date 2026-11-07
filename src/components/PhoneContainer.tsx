import React from 'react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-start sm:py-6 sm:px-4 text-white selection:bg-blue-600 selection:text-white">
      {/* Sleek mobile device form-factor (max-w-[440px]) without any fake status bar */}
      <div className="w-full max-w-[440px] min-h-screen sm:min-h-[850px] sm:h-[92vh] sm:max-h-[920px] flex flex-col bg-[#0b111c] border-0 sm:border border-[#1b2b42] sm:rounded-[36px] shadow-2xl overflow-hidden relative transition-all">
        {/* Main Mobile Screen Viewport */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
