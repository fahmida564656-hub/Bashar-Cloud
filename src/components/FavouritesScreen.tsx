import React, { useState } from 'react';
import { Search, Grid as GridIcon, List as ListIcon, Folder, Music, Image as ImageIcon, Video, FileText, Star, MoreVertical } from 'lucide-react';
import { CloudFile } from '../types';

interface FavouritesScreenProps {
  files: CloudFile[];
  onOpenSearch: () => void;
  onToggleFavorite: (id: string) => void;
  onPlayAudio?: (file: CloudFile) => void;
  onViewImage?: (file: CloudFile) => void;
}

export const FavouritesScreen: React.FC<FavouritesScreenProps> = ({
  files,
  onOpenSearch,
  onToggleFavorite,
  onPlayAudio,
  onViewImage,
}) => {
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filterTabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'image', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5 mr-1" /> },
    { id: 'video', label: 'Videos', icon: <Video className="w-3.5 h-3.5 mr-1" /> },
    { id: 'audio', label: 'Audios', icon: <Music className="w-3.5 h-3.5 mr-1" /> },
    { id: 'document', label: 'Documents', icon: <FileText className="w-3.5 h-3.5 mr-1" /> },
  ];

  const favoriteFiles = files.filter((f) => {
    if (!f.isFavorite) return false;
    if (filter === 'all') return true;
    if (filter === 'image') return f.type === 'image';
    if (filter === 'video') return f.type === 'video';
    if (filter === 'audio') return f.type === 'audio';
    if (filter === 'document') return f.type === 'document';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Favourites
          </h1>
          <p className="text-[12px] text-slate-400">
            Quick access to your favorite files
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="w-10 h-10 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Horizontal Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex items-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-900/40'
                  : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid / List View Toggle */}
      <div className="flex items-center my-3">
        <div className="inline-flex p-1 bg-[#121c2c] border border-[#1f3049] rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#294270] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GridIcon className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[#294270] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Empty State matching Screenshot 13, 16, 20 */}
      {favoriteFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-24 h-24 rounded-3xl bg-[#0e2724] border border-[#16433e] flex items-center justify-center text-[#10b981] mb-5 shadow-lg">
            <Folder className="w-12 h-12 stroke-[1.5]" />
          </div>

          <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
            No data found!
          </h3>
          <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
            Mark files as favourite to see them here
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {favoriteFiles.map((file) => (
            <div
              key={file.id}
              className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex flex-col justify-between min-h-[148px] cursor-pointer transition-all relative"
            >
              <button
                type="button"
                onClick={() => onToggleFavorite(file.id)}
                className="absolute top-3 left-3 text-amber-400 p-1 hover:scale-125 transition-transform"
                title="Remove from favorites"
              >
                <Star className="w-4 h-4 fill-amber-400" />
              </button>

              <div className="flex-1 flex items-center justify-center pt-2">
                {file.type === 'folder' && (
                  <div className="w-12 h-12 rounded-xl bg-[#0e2724] border border-[#16433e] flex items-center justify-center text-[#10b981]">
                    <Folder className="w-6 h-6" />
                  </div>
                )}
                {file.type === 'audio' && (
                  <div className="w-12 h-12 rounded-xl bg-[#2b2114] border border-[#523d21] flex items-center justify-center text-[#f59e0b]">
                    <Music className="w-6 h-6" />
                  </div>
                )}
                {file.type === 'image' && (
                  <div className="w-12 h-12 rounded-xl bg-[#13223d] border border-[#234277] flex items-center justify-center text-[#3b82f6]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                {file.type === 'video' && (
                  <div className="w-12 h-12 rounded-xl bg-[#10293d] border border-[#18486b] flex items-center justify-center text-[#06b6d4]">
                    <Video className="w-6 h-6" />
                  </div>
                )}
                {file.type === 'document' && (
                  <div className="w-12 h-12 rounded-xl bg-[#23173d] border border-[#442777] flex items-center justify-center text-[#a855f7]">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 gap-1">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-medium text-white truncate">
                    {file.name}
                  </h4>
                  {file.type !== 'folder' && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {file.formattedSize}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {favoriteFiles.map((file) => (
            <div
              key={file.id}
              className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl px-4 py-3 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#17253d] border border-[#253b60] flex items-center justify-center text-blue-400 shrink-0">
                  {file.type === 'folder' ? <Folder className="w-5 h-5 text-emerald-400" /> : <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-medium text-white truncate">{file.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{file.formattedSize} • {file.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(file.id)}
                className="p-2 text-amber-400 hover:text-slate-400 transition-colors"
                title="Remove from favorites"
              >
                <Star className="w-4 h-4 fill-amber-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
