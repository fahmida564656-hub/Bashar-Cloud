import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Folder,
  X,
  History,
  Clock,
  Trash2,
  CornerDownLeft,
} from 'lucide-react';
import { CloudFile, FileType } from '../types';
import {
  loadRecentSearches,
  saveRecentSearches,
  addTermToList,
  removeTermFromList,
} from '../utils/recentSearches';

interface SearchScreenProps {
  files: CloudFile[];
  onBack: () => void;
  onSelectFile?: (file: CloudFile) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ files, onBack, onSelectFile }) => {
  const [query, setQuery] = useState('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<FileType | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load persisted recent searches from localStorage on mount
  useEffect(() => {
    const saved = loadRecentSearches();
    setRecentSearches(saved);
  }, []);

  const commitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = addTermToList(prev, trimmed);
      saveRecentSearches(updated);
      return updated;
    });
  };

  const handleSelectRecentTerm = (term: string) => {
    setQuery(term);
    commitSearch(term);
  };

  const handleRemoveRecentTerm = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = removeTermFromList(prev, termToRemove);
      saveRecentSearches(updated);
      return updated;
    });
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      commitSearch(query);
    }
  };

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

  const renderFileIcon = (type: FileType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-cyan-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-400" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white">
      {/* Top Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5 mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white shrink-0 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all shadow-inner">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, folders..."
            autoFocus
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          {query ? (
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="submit"
                title="Search (Enter)"
                className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded text-xs flex items-center gap-1 font-medium transition-colors"
              >
                <span>Search</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </form>

      {/* RECENT SEARCH TERMS SECTION (Persistent in localStorage) */}
      {recentSearches.length > 0 && (
        <div className="mb-4 bg-[#121c2c]/90 border border-[#1f3049] rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-slate-400">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Recent Searches</span>
              <span className="text-[10px] lowercase font-normal px-1.5 py-0.2 bg-[#182740] text-blue-400 rounded-full border border-blue-500/20">
                {recentSearches.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAllRecent}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-rose-500/10"
              title="Clear all recent searches"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, idx) => (
              <div
                key={`${term}-${idx}`}
                onClick={() => handleSelectRecentTerm(term)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectRecentTerm(term);
                  }
                }}
                className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 bg-[#182740] hover:bg-[#203456] border border-[#233857] hover:border-blue-500/50 rounded-xl text-xs text-slate-200 hover:text-white cursor-pointer transition-all shadow-xs"
                title={`Search for "${term}"`}
              >
                <Clock className="w-3 h-3 text-slate-400 group-hover:text-blue-400 shrink-0" />
                <span className="max-w-[130px] truncate font-medium">{term}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveRecentTerm(term, e)}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                  title={`Remove "${term}" from recent searches`}
                  aria-label={`Remove "${term}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK FILTERS */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-2.5">
          QUICK FILTERS
        </h4>
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {/* Images */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('image')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
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

      {/* Search Tips card */}
      {showTips ? (
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="text-base">💡</span>
            <span>Search Tips</span>
          </div>
          <ul className="text-xs text-slate-300/90 space-y-1.5 leading-relaxed pl-1">
            <li>• Use keywords from file names or folder names</li>
            <li>• Click any recent search term above to run the query again</li>
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
            <div className="text-center py-12 text-slate-400 text-xs bg-[#121c2c]/40 rounded-2xl border border-[#1f3049]/50">
              No matching files or folders found for "{query}"
            </div>
          ) : (
            results.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  if (query.trim()) {
                    commitSearch(query);
                  }
                  if (onSelectFile) onSelectFile(f);
                }}
                className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#182740] flex items-center justify-center">
                    {renderFileIcon(f.type)}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{f.name}</h5>
                    <p className="text-[10px] text-slate-400">
                      {f.formattedSize} • {f.date}
                    </p>
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
