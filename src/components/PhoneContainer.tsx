import React, { useState, useEffect } from 'react';
import { Wifi, Smartphone, Maximize2, Minimize2 } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
  currentTimeStr?: string;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({
  children,
  currentTimeStr = '10:02',
}) => {
  const [isFramed, setIsFramed] = useState<boolean>(true);
  const [clock, setClock] = useState<string>(currentTimeStr);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setClock(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-start sm:p-4 select-none">
      {/* Top utility switcher bar for showcase */}
      <aside aria-label="Device Controls" className="w-full max-w-md flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 mb-1 z-50">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>GP Cloud Mobile Experience</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFramed(!isFramed)}
            className="flex items-center gap-1 bg-[#162238] hover:bg-[#1f3150] px-2.5 py-1 rounded-md text-slate-200 transition-all text-[11px] border border-blue-500/20"
            title="Toggle Device Frame"
          >
            {isFramed ? (
              <>
                <Maximize2 className="w-3 h-3 text-blue-400" />
                <span>Full View</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3 text-blue-400" />
                <span>Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main container */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col bg-[#0b111c] text-white shadow-2xl overflow-hidden ${
          isFramed
            ? 'max-w-[420px] rounded-[38px] ring-1 ring-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_8px_#121b2d] min-h-[860px] h-[92vh] max-h-[920px]'
            : 'max-w-xl min-h-screen rounded-none'
        }`}
      >
        {/* Status Bar matching the screenshots */}
        <header className="sticky top-0 z-40 bg-[#0b111c]/95 backdrop-blur-md px-6 pt-3 pb-1 flex items-center justify-between text-xs text-slate-200 select-none">
          {/* Left Time */}
          <div className="font-semibold text-[13px] tracking-tight">{clock}</div>

          {/* Right Status Icons */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-0.5 text-slate-300 font-mono text-[9px] leading-none">
              <span>3.93</span>
              <span className="text-[7.5px] opacity-75">KB/S</span>
            </div>
            <Wifi className="w-3.5 h-3.5 text-slate-200" />
            <div className="flex items-end gap-[1.5px] h-3">
              <span className="w-[2px] h-1.5 bg-slate-200 rounded-[0.5px]"></span>
              <span className="w-[2px] h-2 bg-slate-200 rounded-[0.5px]"></span>
              <span className="w-[2px] h-2.5 bg-slate-200 rounded-[0.5px]"></span>
              <span className="w-[2px] h-3 bg-slate-200 rounded-[0.5px]"></span>
            </div>
            {/* Battery icon with 53 */}
            <div className="flex items-center">
              <div className="bg-[#eab308] text-[#0b111c] font-black text-[9px] px-1 py-0.5 rounded-[4px] leading-none flex items-center justify-center font-sans tracking-tight">
                53
              </div>
            </div>
          </div>
        </header>

        {/* Screen Content */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>

        {/* Bottom Home Indicator Bar */}
        <footer className="w-full bg-[#0b111c] py-2 flex justify-center items-center z-40">
          <div className="w-32 h-1 bg-slate-600/70 rounded-full"></div>
        </footer>
      </div>
    </div>
  );
};
