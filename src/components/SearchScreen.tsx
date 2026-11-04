import React, { useState } from 'react';
import { ChevronLeft, Search, Image as ImageIcon, Video, FileText, Music, Folder, X } from 'lucide-react';
import { CloudFile, FileType } from '../types';

interface SearchScreenProps {
  files: CloudFile[];
  onBack: () => void;
  onSelectFile?: (file: CloudFile) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ files, onBack, onSelectFile }) => {
  const [query, setQuery] = useState('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<FileType | null>(null);

  const toggleQuickFilter = (type: FileType) => {
    if (selectedQuickFilter === type) {
      setSelectedQuickFilter(null);
    } else {
      setSelectedQuickFilter(type);
    }
  };

  const results = files.filter((f) => {
    const matchesQuery = query.trim() === '' || f.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = !selectedQuickFilter || f.type === selectedQuickFilter;
    return matchesQuery && matchesFilter;
  });

  const showTips = query.trim() === '' && !selectedQuickFilter;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white">
      {/* Top Search Bar */}
      <div className="flex items-center gap-2.5 mb-5">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white shrink-0 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, folders..."
            autoFocus
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* QUICK FILTERS matching Screenshot 9 */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-2.5">
          QUICK FILTERS
        </h4>
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {/* Images */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('image')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedQuickFilter === 'image'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#121c2c] border border-[#1f3049] text-blue-400 hover:bg-[#182740]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Images</span>
          </button>

          {/* Videos */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('video')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedQuickFilter === 'video'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#121c2c] border border-[#1f3049] text-cyan-400 hover:bg-[#182740]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Videos</span>
          </button>

          {/* Docs */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('document')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedQuickFilter === 'document'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#121c2c] border border-[#1f3049] text-purple-400 hover:bg-[#182740]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Docs</span>
          </button>
        </div>
      </div>

      {/* Search Tips card matching Screenshot 9 */}
      {showTips ? (
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="text-base">💡</span>
            <span>Search Tips</span>
          </div>
          <ul className="text-xs text-slate-300/90 space-y-2 leading-relaxed pl-1">
            <li>• Use keywords from file names or folder names</li>
            <li>• Filter by file type using quick filters above</li>
            <li>• Search works across all your files and folders</li>
          </ul>
        </div>
      ) : (
        /* Results list */
        <div className="flex-1 space-y-2 overflow-y-auto">
          <p className="text-xs text-slate-400 mb-2">
            Found {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching files or folders found for "{query}"
            </div>
          ) : (
            results.map((f) => (
              <div
                key={f.id}
                onClick={() => onSelectFile && onSelectFile(f)}
                className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#182740] flex items-center justify-center text-blue-400">
                    {f.type === 'folder' ? <Folder className="w-4 h-4 text-emerald-400" /> : <Music className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{f.name}</h5>
                    <p className="text-[10px] text-slate-400">{f.formattedSize} • {f.date}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
