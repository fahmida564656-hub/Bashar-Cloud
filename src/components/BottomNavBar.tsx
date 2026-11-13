import React from 'react';
import { Home, FileText, Star, User, Sparkles } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavBarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onTabChange }) => {
  const tabs: { id: MainTab; label: string; ariaLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      ariaLabel: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'ai',
      label: 'Bashar AI',
      ariaLabel: 'Bashar Cloud Ai',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'files',
      label: 'Files',
      ariaLabel: 'Files',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'favourites',
      label: 'Favourites',
      ariaLabel: 'Favourites',
      icon: <Star className="w-5 h-5" />,
    },
    {
      id: 'me',
      label: 'Me',
      ariaLabel: 'Me',
      icon: <User className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="sticky bottom-0 z-30 shrink-0 bg-[#0b111c]/95 backdrop-blur-md border-t border-[#16233a] px-1.5 py-1.5 grid grid-cols-5 items-center gap-0.5"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.ariaLabel}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onTabChange(tab.id)}
            className={`min-h-[46px] flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#487dfb] font-semibold bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <div className={`transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[10.5px] sm:text-[11px] leading-none tracking-tight whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
