import React from 'react';
import { Home, FileText, Star, User } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavBarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onTabChange }) => {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'favourites',
      label: 'Favourites',
      icon: <Star className="w-5 h-5" />,
    },
    {
      id: 'me',
      label: 'Me',
      icon: <User className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-30 bg-[#0b111c]/95 backdrop-blur-md border-t border-[#16233a] px-4 py-2 flex items-center justify-around">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all ${
              isActive
                ? 'text-[#487dfb] font-medium scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)]' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[11px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
