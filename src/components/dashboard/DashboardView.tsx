import React from 'react';
import {
  Image as ImageIcon,
  MessageSquare,
  Archive,
  FileText,
  HardDrive,
  Cpu,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

export const DashboardView: React.FC = () => {
  const {
    portraits,
    conversations,
    memories,
    documents,
    storageStats,
    ollamaStatus,
    activityTasks,
    setActiveTab,
    setActivePortraitId,
    setShowCorsModal,
  } = useArchive();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleOpenPortrait = (id: string) => {
    setActivePortraitId(id);
    setActiveTab('conversations');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#d4af37]/30 bg-gradient-to-r from-[#171822] via-[#1c1e2b] to-[#12131a] p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/25 text-[#d4af37] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Browser-Native AI Archival Studio</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold font-serif-title text-[#f5e4be] tracking-wide leading-tight">
            Echoes of the Archive
          </h2>

          <p className="text-sm text-[#b8b5ab] font-archival leading-relaxed text-base">
            Where historical photography, primary memoirs, and local neural intelligence converge. Inscribe historical figures, analyze visible characteristics using Ollama vision models, and hold grounded conversations guided by primary archival records.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('create')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a2844e] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Inscribe New Portrait</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1f212e] hover:bg-[#282a3b] border border-[#33364a] text-[#e8e4dc] font-medium text-xs rounded-lg transition-all"
            >
              <span>Explore Portrait Gallery</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Portraits */}
        <div
          onClick={() => setActiveTab('gallery')}
          className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8c8f9f] font-medium">Portraits</span>
            <div className="p-2 rounded-lg bg-[#1b1d2a] text-[#d4af37] group-hover:scale-110 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-code text-[#f5e4be]">
            {portraits.length}
          </div>
          <div className="text-[11px] text-[#6d7081] mt-1">Inscribed Archives</div>
        </div>

        {/* Conversations */}
        <div
          onClick={() => setActiveTab('conversations')}
          className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8c8f9f] font-medium">Conversations</span>
            <div className="p-2 rounded-lg bg-[#1b1d2a] text-[#d4af37] group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-code text-[#f5e4be]">
            {conversations.length}
          </div>
          <div className="text-[11px] text-[#6d7081] mt-1">Archived Dialogues</div>
        </div>

        {/* Memories */}
        <div
          onClick={() => setActiveTab('vault')}
          className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8c8f9f] font-medium">Saved Memories</span>
            <div className="p-2 rounded-lg bg-[#1b1d2a] text-[#d4af37] group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-code text-[#f5e4be]">
            {memories.length}
          </div>
          <div className="text-[11px] text-[#6d7081] mt-1">Primary Records</div>
        </div>

        {/* Documents */}
        <div
          onClick={() => setActiveTab('vault')}
          className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8c8f9f] font-medium">Documents</span>
            <div className="p-2 rounded-lg bg-[#1b1d2a] text-[#d4af37] group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-code text-[#f5e4be]">
            {documents.length}
          </div>
          <div className="text-[11px] text-[#6d7081] mt-1">Parsed Sources</div>
        </div>

        {/* IndexedDB Storage */}
        <div
          onClick={() => setActiveTab('settings')}
          className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all cursor-pointer group col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8c8f9f] font-medium">Browser Storage</span>
            <div className="p-2 rounded-lg bg-[#1b1d2a] text-[#d4af37] group-hover:scale-110 transition-transform">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-code text-[#f5e4be]">
            {storageStats ? formatBytes(storageStats.usageBytes) : 'Measuring...'}
          </div>
          <div className="text-[11px] text-[#6d7081] mt-1">IndexedDB Persistence</div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recently Inscribed Portraits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-title text-base font-bold text-[#f5e4be] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#d4af37]" />
              <span>Inscribed Portraits Gallery</span>
            </h3>
            <button
              onClick={() => setActiveTab('gallery')}
              className="text-xs text-[#d4af37] hover:underline flex items-center space-x-1"
            >
              <span>View All ({portraits.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portraits.slice(0, 4).map((portrait) => (
              <div
                key={portrait.id}
                className="p-4 rounded-xl bg-[#14151e] border border-[#242636] hover:border-[#d4af37]/40 transition-all group flex space-x-4"
              >
                {/* Antique framed thumbnail */}
                <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden portrait-antique-frame bg-black">
                  <img
                    src={portrait.thumbnailUrl || portrait.imageUrl}
                    alt={portrait.name}
                    className="w-full h-full object-cover object-top filter sepia-[0.15] group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif-title text-xs font-bold text-[#f5e4be] line-clamp-1 group-hover:text-[#d4af37] transition-colors">
                      {portrait.name}
                    </h4>
                    <p className="text-[11px] text-[#a0a3b3] line-clamp-1 mt-0.5">
                      {portrait.profession}
                    </p>
                    <p className="text-[10px] text-[#6b6e80] mt-0.5">
                      {portrait.historicalPeriod}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#1f212e]">
                    <span className="text-[10px] text-[#8e7343] font-code">
                      {portrait.memoryCount || 0} records
                    </span>
                    <button
                      onClick={() => handleOpenPortrait(portrait.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-black bg-[#d4af37] hover:bg-[#f5e4be] rounded transition-colors flex items-center space-x-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Dialogue</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Ollama & Architecture Status */}
        <div className="space-y-4">
          <h3 className="font-serif-title text-base font-bold text-[#f5e4be] flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[#d4af37]" />
            <span>AI Inference Engine</span>
          </h3>

          <div className="p-5 rounded-xl bg-[#14151e] border border-[#232533] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#b5b8c8]">Local Ollama Runtime</span>
              {ollamaStatus.state === 'connected' ? (
                <span className="flex items-center space-x-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Online v{ollamaStatus.version}</span>
                </span>
              ) : ollamaStatus.state === 'connecting' ? (
                <span className="flex items-center space-x-1 text-xs text-amber-400">
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                  <span>Probing...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-xs text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unavailable</span>
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs text-[#8c8f9f] bg-[#0e0f15] p-3 rounded-lg border border-[#1b1d28]">
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="text-[#f5e4be] font-code">{ollamaStatus.endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Vision Model:</span>
                <span className="text-[#f5e4be] font-code">{ollamaStatus.activeVisionModel}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Conversation:</span>
                <span className="text-[#f5e4be] font-code">{ollamaStatus.activeConversationModel}</span>
              </div>
              <div className="flex justify-between">
                <span>Installed Models:</span>
                <span className="text-[#d4af37] font-code">{ollamaStatus.installedModels.length} models</span>
              </div>
            </div>

            {ollamaStatus.state !== 'connected' && (
              <div className="p-3 rounded bg-[#800020]/20 border border-[#800020]/40 text-xs text-[#f3b5c2] space-y-2">
                <p className="font-semibold text-rose-300">Browser Connection Notice</p>
                <p className="text-[11px] leading-relaxed text-[#d9a8b1]">
                  Web browsers require Ollama to accept requests from web origins. Run Ollama with <code>OLLAMA_ORIGINS="*"</code>.
                </p>
                <button
                  onClick={() => setShowCorsModal(true)}
                  className="w-full py-1 text-[11px] font-semibold bg-[#800020] hover:bg-[#a00028] text-white rounded transition-colors"
                >
                  View Step-by-Step Fix
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-[#1e202d] flex items-center justify-between text-[11px] text-[#6d7082]">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Cloud Fallback</span>
              </span>
              <button
                onClick={() => setActiveTab('models')}
                className="text-[#d4af37] hover:underline"
              >
                Manage Models
              </button>
            </div>
          </div>

          {/* Real-time Activity Mini-Feed */}
          <div className="p-4 rounded-xl bg-[#14151e] border border-[#232533] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-serif-title text-[#f5e4be]">Recent Archival Tasks</span>
              <button
                onClick={() => setActiveTab('monitor')}
                className="text-[11px] text-[#d4af37] hover:underline"
              >
                Activity Monitor
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activityTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-2 rounded bg-[#0f1017] border border-[#1e202d] text-[11px] flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="text-[#e8e4dc] font-medium truncate">{task.title}</p>
                    <p className="text-[#6c6f80] text-[10px] truncate">{task.description}</p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-code shrink-0 ${
                      task.status === 'completed'
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : task.status === 'running'
                        ? 'text-amber-400 bg-amber-950/40 animate-pulse'
                        : 'text-rose-400 bg-rose-950/40'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
