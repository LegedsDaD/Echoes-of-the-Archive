import React from 'react';
import {
  Compass,
  Image as ImageIcon,
  UserPlus,
  Archive,
  MessageSquare,
  Cpu,
  Activity,
  Settings,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useArchive, ActiveNavTab } from '../../context/ArchiveContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, portraits, conversations, memories } = useArchive();

  const navItems: Array<{
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
  }> = [
    { id: 'dashboard', label: 'Archival Home', icon: Compass },
    { id: 'gallery', label: 'Portrait Gallery', icon: ImageIcon, count: portraits.length },
    { id: 'create', label: 'Inscribe Portrait', icon: UserPlus, badge: 'Vision' },
    { id: 'vault', label: 'Memory Vault', icon: Archive, count: memories.length },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare, count: conversations.length },
    { id: 'models', label: 'AI Models', icon: Cpu },
    { id: 'monitor', label: 'Activity Monitor', icon: Activity },
    { id: 'settings', label: 'Settings & Storage', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#111217] border-r border-[#22242f] flex flex-col justify-between shrink-0 select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#22242f]/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8e7343] via-[#d4af37] to-[#5a431a] p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#111217] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#d4af37]" />
            </div>
          </div>
          <div>
            <h1 className="font-serif-title text-sm font-bold tracking-wider gold-gradient-text">
              ECHOES OF THE
            </h1>
            <p className="font-serif-title text-xs tracking-widest text-[#a8a192]">
              ARCHIVE
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-[#1c1e28] text-[#f5e4be] border border-[#d4af37]/35 shadow-sm shadow-[#d4af37]/10'
                    : 'text-[#9ea1b1] hover:text-[#e8e4dc] hover:bg-[#161821]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#d4af37]' : 'text-[#6e7182] group-hover:text-[#d4af37]'
                    }`}
                  />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#800020]/40 text-[#f3b5c2] border border-[#800020]/60 rounded">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded font-code ${
                        isActive ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-[#636675]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-[#22242f]/80">
        <div className="p-3 rounded-lg bg-[#14161f] border border-[#232635] text-[11px] text-[#8e91a0]">
          <div className="flex items-center space-x-1.5 text-[#d4af37] font-medium mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-serif-title uppercase tracking-wider text-[10px]">
              Archival Charter
            </span>
          </div>
          <p className="leading-relaxed text-[10.5px] text-[#7d808f]">
            100% Browser-Native. Direct Ollama inference. Zero remote servers or telemetry.
          </p>
        </div>
      </div>
    </aside>
  );
};
