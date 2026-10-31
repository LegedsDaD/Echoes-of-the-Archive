import React from 'react';
import {
  RotateCcw,
  Eye,
  MessageSquare,
  HelpCircle,
  PlusCircle,
  AlertCircle,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

export const TopNav: React.FC = () => {
  const {
    ollamaStatus,
    refreshOllama,
    setActiveTab,
    setShowCorsModal,
  } = useArchive();

  const getStatusBadge = () => {
    switch (ollamaStatus.state) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Ollama Connected</span>
            {ollamaStatus.version && (
              <span className="text-[10px] text-emerald-300/80 font-code">
                v{ollamaStatus.version}
              </span>
            )}
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
            <Radio className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span className="font-medium">Probing localhost:11434...</span>
          </div>
        );
      case 'cors_blocked':
        return (
          <button
            onClick={() => setShowCorsModal(true)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#800020]/40 border border-rose-500/40 text-rose-300 hover:bg-[#800020]/60 transition-colors text-xs group"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium">CORS Blocked (Click for Fix)</span>
          </button>
        );
      default:
        return (
          <button
            onClick={() => setShowCorsModal(true)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/40 transition-colors text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="font-medium">Disconnected (localhost:11434)</span>
          </button>
        );
    }
  };

  return (
    <header className="h-14 bg-[#111217]/95 border-b border-[#22242f] px-6 flex items-center justify-between shrink-0 select-none z-10 backdrop-blur-sm">
      {/* Left: Active Ollama runtime models */}
      <div className="flex items-center space-x-4">
        {getStatusBadge()}

        {/* Model Chips */}
        <div className="hidden lg:flex items-center space-x-2 text-[11px] text-[#9a9dae]">
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#181a24] border border-[#262838]">
            <Eye className="w-3 h-3 text-[#d4af37]" />
            <span className="text-[#6c6f82]">Vision:</span>
            <span className="text-[#f5e4be] font-code font-medium">
              {ollamaStatus.activeVisionModel || 'None'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#181a24] border border-[#262838]">
            <MessageSquare className="w-3 h-3 text-[#d4af37]" />
            <span className="text-[#6c6f82]">Chat:</span>
            <span className="text-[#f5e4be] font-code font-medium">
              {ollamaStatus.activeConversationModel || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => refreshOllama()}
          title="Retry Connection"
          className="p-1.5 text-[#888b9c] hover:text-[#d4af37] hover:bg-[#1a1c26] rounded-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowCorsModal(true)}
          title="Ollama Setup & CORS Instructions"
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-[#b8b5ab] hover:text-[#f5e4be] bg-[#1a1c26] hover:bg-[#222533] border border-[#2b2d3d] rounded-md transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="hidden sm:inline">CORS Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-md shadow-md transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Portrait</span>
        </button>

        <div className="hidden xl:flex items-center space-x-1 pl-2 text-[11px] text-[#6d7082] border-l border-[#242735]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Browser Sandbox</span>
        </div>
      </div>
    </header>
  );
};
