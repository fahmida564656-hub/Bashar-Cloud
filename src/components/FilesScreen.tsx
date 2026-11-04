import React, { useState } from 'react';
import {
  Search,
  Grid as GridIcon,
  List as ListIcon,
  Folder,
  Music,
  Image as ImageIcon,
  Video,
  FileText,
  MoreVertical,
  Star,
  Trash2,
  Download,
  Info,
  Edit2,
  X
} from 'lucide-react';
import { CloudFile, FileType } from '../types';

interface FilesScreenProps {
  files: CloudFile[];
  onOpenSearch: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onOpenFolder?: (folder: CloudFile) => void;
  onPlayAudio?: (file: CloudFile) => void;
  onViewImage?: (file: CloudFile) => void;
  initialFilter?: string;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({
  files,
  onOpenSearch,
  onToggleFavorite,
  onDeleteFile,
  onOpenFolder,
  onPlayAudio,
  onViewImage,
  initialFilter = 'all',
}) => {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<CloudFile | null>(null);
  const [renamingFile, setRenamingFile] = useState<CloudFile | null>(null);
  const [newName, setNewName] = useState('');

  const filterTabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'image', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5 mr-1" /> },
    { id: 'video', label: 'Videos', icon: <Video className="w-3.5 h-3.5 mr-1" /> },
    { id: 'audio', label: 'Audios', icon: <Music className="w-3.5 h-3.5 mr-1" /> },
    { id: 'document', label: 'Documents', icon: <FileText className="w-3.5 h-3.5 mr-1" /> },
  ];

  const filteredFiles = files.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'image') return f.type === 'image';
    if (filter === 'video') return f.type === 'video';
    if (filter === 'audio') return f.type === 'audio';
    if (filter === 'document') return f.type === 'document';
    return true;
  });

  const handleItemClick = (file: CloudFile) => {
    if (file.type === 'folder' && onOpenFolder) {
      onOpenFolder(file);
    } else if (file.type === 'audio' && onPlayAudio) {
      onPlayAudio(file);
    } else if (file.type === 'image' && onViewImage) {
      onViewImage(file);
    }
  };

  const handleStartRename = (file: CloudFile) => {
    setSelectedFileForMenu(null);
    setRenamingFile(file);
    setNewName(file.name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingFile && newName.trim()) {
      renamingFile.name = newName.trim();
      setRenamingFile(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            All Files
          </h1>
          <p className="text-[12px] text-slate-400">
            Manage all your files in one place
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

      {/* Horizontal Filter Pills */}
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
                  ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40'
                  : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white hover:bg-[#18253b]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid / List View Toggle Capsule */}
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

      {/* Files List / Grid Area */}
      {filteredFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#121c2c] border border-[#1f3049] flex items-center justify-center text-slate-500 mb-3">
            <Folder className="w-8 h-8 text-emerald-500/50" />
          </div>
          <h3 className="text-base font-semibold text-white">No files found</h3>
          <p className="text-xs text-slate-400 mt-1">Upload files using the (+) button below</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode matching Screenshot 11 */
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleItemClick(file)}
              className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex flex-col justify-between min-h-[148px] cursor-pointer transition-all group relative"
            >
              {/* Star Badge if Favorite */}
              {file.isFavorite && (
                <div className="absolute top-3 left-3 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
              )}

              {/* Center Icon */}
              <div className="flex-1 flex items-center justify-center pt-2">
                {file.type === 'folder' && (
                  <div className="w-12 h-12 rounded-xl bg-[#0e2724] border border-[#16433e] flex items-center justify-center text-[#10b981]">
                    <Folder className="w-6 h-6 stroke-[1.75]" />
                  </div>
                )}
                {file.type === 'audio' && (
                  <div className="w-12 h-12 rounded-xl bg-[#2b2114] border border-[#523d21] flex items-center justify-center text-[#f59e0b]">
                    <Music className="w-6 h-6 stroke-[1.75]" />
                  </div>
                )}
                {file.type === 'image' && (
                  <div className="w-12 h-12 rounded-xl bg-[#13223d] border border-[#234277] flex items-center justify-center text-[#3b82f6]">
                    <ImageIcon className="w-6 h-6 stroke-[1.75]" />
                  </div>
                )}
                {file.type === 'video' && (
                  <div className="w-12 h-12 rounded-xl bg-[#10293d] border border-[#18486b] flex items-center justify-center text-[#06b6d4]">
                    <Video className="w-6 h-6 stroke-[1.75]" />
                  </div>
                )}
                {file.type === 'document' && (
                  <div className="w-12 h-12 rounded-xl bg-[#23173d] border border-[#442777] flex items-center justify-center text-[#a855f7]">
                    <FileText className="w-6 h-6 stroke-[1.75]" />
                  </div>
                )}
              </div>

              {/* Bottom Label & 3-dots */}
              <div className="flex items-center justify-between pt-3 gap-1">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-medium text-white truncate group-hover:text-blue-300">
                    {file.name}
                  </h4>
                  {file.type !== 'folder' && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {file.formattedSize}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFileForMenu(file);
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-[#1c2c47] flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode matching Screenshot 12 & 14 */
        <div className="space-y-2.5">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleItemClick(file)}
              className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Icon box */}
                {file.type === 'folder' && (
                  <div className="w-11 h-11 rounded-xl bg-[#0e2724] border border-[#16433e] flex items-center justify-center text-[#10b981] shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                )}
                {file.type === 'audio' && (
                  <div className="w-11 h-11 rounded-xl bg-[#2b2114] border border-[#523d21] flex items-center justify-center text-[#f59e0b] shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                )}
                {file.type === 'image' && (
                  <div className="w-11 h-11 rounded-xl bg-[#13223d] border border-[#234277] flex items-center justify-center text-[#3b82f6] shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                {file.type === 'video' && (
                  <div className="w-11 h-11 rounded-xl bg-[#10293d] border border-[#18486b] flex items-center justify-center text-[#06b6d4] shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                )}
                {file.type === 'document' && (
                  <div className="w-11 h-11 rounded-xl bg-[#23173d] border border-[#442777] flex items-center justify-center text-[#a855f7] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[14px] font-medium text-white truncate group-hover:text-blue-300">
                      {file.name}
                    </h4>
                    {file.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {file.type === 'folder'
                      ? `- Folder - ${file.date}`
                      : `${file.formattedSize} - ${file.type === 'audio' ? 'Music' : file.type} - ${file.date}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFileForMenu(file);
                }}
                className="w-8 h-8 rounded-lg hover:bg-[#1c2c47] flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3-Dots Action Bottom Sheet Modal */}
      {selectedFileForMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121c2e] border-t border-[#20324e] rounded-t-3xl p-5 space-y-4 max-w-[420px] mx-auto w-full animate-in slide-in-from-bottom-6"
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between border-b border-[#1f2f4a] pb-3">
              <div className="min-w-0 pr-3">
                <h3 className="text-base font-bold text-white truncate">
                  {selectedFileForMenu.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedFileForMenu.formattedSize} • {selectedFileForMenu.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFileForMenu(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onToggleFavorite(selectedFileForMenu.id);
                  setSelectedFileForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1a2842] text-slate-200 transition-colors text-sm"
              >
                <Star
                  className={`w-5 h-5 ${
                    selectedFileForMenu.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>
                  {selectedFileForMenu.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartRename(selectedFileForMenu)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1a2842] text-slate-200 transition-colors text-sm"
              >
                <Edit2 className="w-5 h-5 text-slate-400" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  alert(`Downloading ${selectedFileForMenu.name}`);
                  setSelectedFileForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1a2842] text-slate-200 transition-colors text-sm"
              >
                <Download className="w-5 h-5 text-slate-400" />
                <span>Download file</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteFile(selectedFileForMenu.id);
                  setSelectedFileForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-950/40 text-rose-400 transition-colors text-sm"
              >
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Move to Recycle Bin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renamingFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRename}
            className="bg-[#121c2e] border border-[#20324e] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Rename</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenamingFile(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
