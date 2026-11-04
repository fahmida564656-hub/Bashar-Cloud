import React from 'react';
import { ChevronLeft, Image as ImageIcon, Video, Music, FileText, HardDrive, Sparkles, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StorageUsage } from '../types';

interface StorageAnalysisScreenProps {
  storage: StorageUsage;
  onBack: () => void;
}

export const StorageAnalysisScreen: React.FC<StorageAnalysisScreenProps> = ({
  storage,
  onBack,
}) => {
  // Convert all to MB for proportional Recharts representation
  const imagesMB = storage.imagesCount > 0 ? Math.max(1, Math.round(storage.imagesGB * 1024)) : 0;
  const videosMB = storage.videosCount > 0 ? Math.max(1, Math.round(storage.videosGB * 1024)) : 0;
  const audiosMB = storage.audiosCount > 0 ? Math.max(1, Math.round(storage.audiosMB)) : 0;
  const docsMB = storage.docsCount > 0 ? Math.max(1, Math.round(storage.docsMB)) : 0;

  const totalUsedMB = imagesMB + videosMB + audiosMB + docsMB;

  const chartData = totalUsedMB > 0 ? [
    { name: 'Images', value: imagesMB, color: '#3b82f6', formatted: storage.imagesGB > 0 ? `${storage.imagesGB} GB` : `${imagesMB} MB`, count: storage.imagesCount },
    { name: 'Videos', value: videosMB, color: '#a855f7', formatted: storage.videosGB > 0 ? `${storage.videosGB} GB` : `${videosMB} MB`, count: storage.videosCount },
    { name: 'Audios', value: audiosMB, color: '#f59e0b', formatted: `${storage.audiosMB} MB`, count: storage.audiosCount },
    { name: 'Documents', value: docsMB, color: '#10b981', formatted: `${storage.docsMB} MB`, count: storage.docsCount },
  ].filter(item => item.value > 0) : [
    { name: 'Available Space', value: 100 * 1024, color: '#1a2842', formatted: '100 GB', count: 0 }
  ];

  const percentUsed = Math.round((storage.usedGB / storage.totalGB) * 100);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white ml-auto mr-auto pr-10">
          Storage Analysis
        </h1>
      </div>

      {/* Top Storage Overview Card */}
      <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cloud Storage Overview</h3>
              <p className="text-[11px] text-slate-400">{storage.totalGB} GB Total Quota</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
            {percentUsed}% Used
          </span>
        </div>

        <div className="flex items-baseline justify-between text-xs pt-1">
          <div>
            <span className="text-lg font-bold text-white">{storage.usedGB} GB</span>
            <span className="text-slate-400 ml-1">used</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-sky-300">
              {(storage.totalGB - storage.usedGB).toFixed(2)} GB
            </span>
            <span className="text-slate-400 ml-1">free</span>
          </div>
        </div>
      </div>

      {/* Recharts Doughnut Chart Section */}
      <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 mb-4 flex flex-col items-center relative">
        <div className="w-full flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Storage Distribution
          </h4>
          <span className="text-[11px] text-slate-400">By File Type</span>
        </div>

        {/* Doughnut Chart Container */}
        <div className="w-full h-52 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={totalUsedMB > 0 ? 3 : 0}
                stroke="#0b111c"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0b1322] border border-blue-500/40 px-3 py-2 rounded-xl shadow-xl text-xs text-white">
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                          <span>{data.name}</span>
                        </div>
                        <p className="text-slate-300">{data.formatted} • {data.count} items</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-xl font-black text-white tracking-tight leading-none">
              {storage.usedGB} GB
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              Used of {storage.totalGB} GB
            </span>
          </div>
        </div>
      </div>

      {/* File Type Breakdown Grid */}
      <div className="space-y-2.5 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          Detailed Categories
        </h4>

        {/* Images */}
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#14223d] text-[#3b82f6] border border-[#234277] flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-white">Images</h5>
              <p className="text-[11px] text-slate-400">{storage.imagesCount} items</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white">{storage.imagesGB} GB</span>
            <p className="text-[10px] text-slate-400">
              {totalUsedMB > 0 ? `${Math.round((imagesMB / totalUsedMB) * 100)}%` : '0%'}
            </p>
          </div>
        </div>

        {/* Videos */}
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#25173d] text-[#a855f7] border border-[#442777] flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-white">Videos</h5>
              <p className="text-[11px] text-slate-400">{storage.videosCount} items</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white">{storage.videosGB} GB</span>
            <p className="text-[10px] text-slate-400">
              {totalUsedMB > 0 ? `${Math.round((videosMB / totalUsedMB) * 100)}%` : '0%'}
            </p>
          </div>
        </div>

        {/* Audios */}
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2b2114] text-[#f59e0b] border border-[#523d21] flex items-center justify-center shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-white">Audios</h5>
              <p className="text-[11px] text-slate-400">{storage.audiosCount} items</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white">{storage.audiosMB} MB</span>
            <p className="text-[10px] text-slate-400">
              {totalUsedMB > 0 ? `${Math.round((audiosMB / totalUsedMB) * 100)}%` : '0%'}
            </p>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-[#121c2c] border border-[#1f3049] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#102924] text-[#10b981] border border-[#194c40] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-white">Documents</h5>
              <p className="text-[11px] text-slate-400">{storage.docsCount} items</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white">{storage.docsMB} MB</span>
            <p className="text-[10px] text-slate-400">
              {totalUsedMB > 0 ? `${Math.round((docsMB / totalUsedMB) * 100)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
