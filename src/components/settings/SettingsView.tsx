import React, { useState, useRef } from 'react';
import {
  Settings,
  Cpu,
  Palette,
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    storageStats,
    exportBackup,
    importBackup,
    clearAllArchiveData,
    setShowCorsModal,
  } = useArchive();

  const [endpointInput, setEndpointInput] = useState(settings.ollamaEndpoint);
  const [temperatureInput, setTemperatureInput] = useState(settings.temperature);
  const [contextWindowInput, setContextWindowInput] = useState(settings.contextWindow);
  const [maxTokensInput, setMaxTokensInput] = useState(settings.maxTokens);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      ollamaEndpoint: endpointInput,
      temperature: temperatureInput,
      contextWindow: contextWindowInput,
      maxTokens: maxTokensInput,
    });
    setSaveFeedback('AI runtime preferences saved and verified!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleExportBackup = async () => {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echoes-of-the-archive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const res = await importBackup(text);
        setSaveFeedback(`Successfully restored ${res.portraitsAdded} portraits and ${res.memoriesAdded} memories.`);
        setTimeout(() => setSaveFeedback(null), 4000);
      } catch (err: any) {
        alert(`Backup restoration failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#232533] pb-6">
        <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
          <Settings className="w-3.5 h-3.5" />
          <span>Application Configuration</span>
        </div>
        <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
          Settings & Storage
        </h2>
        <p className="text-sm text-[#9c9fae]">
          Manage local Ollama parameters, browser IndexedDB storage quotas, export backups, and theme preferences.
        </p>
      </div>

      {saveFeedback && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* AI Runtime Configuration */}
      <div className="p-6 rounded-2xl bg-[#14151e] border border-[#232533] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <Cpu className="w-4 h-4 text-[#d4af37]" />
            <span>AI Inference Parameters</span>
          </div>

          <button
            onClick={() => setShowCorsModal(true)}
            className="text-xs text-[#d4af37] hover:underline flex items-center space-x-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>CORS Setup Instructions</span>
          </button>
        </div>

        <form onSubmit={handleSaveAiSettings} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#a0a3b3] mb-1 font-medium">Ollama HTTP Endpoint *</label>
            <input
              type="text"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] font-code focus:outline-none focus:border-[#d4af37]/60"
              required
            />
            <p className="text-[11px] text-[#6b6e80] mt-1">
              Direct browser connection. Must accept requests from this origin with <code>OLLAMA_ORIGINS=&quot;*&quot;</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">
                Temperature ({temperatureInput})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.05"
                value={temperatureInput}
                onChange={(e) => setTemperatureInput(parseFloat(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <span className="text-[10px] text-[#6b6e80]">Lower = factual, Higher = poetic</span>
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">
                Context Window (num_ctx)
              </label>
              <select
                value={contextWindowInput}
                onChange={(e) => setContextWindowInput(parseInt(e.target.value))}
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none"
              >
                <option value={2048}>2048 tokens (Minimal RAM)</option>
                <option value={4096}>4096 tokens (Balanced Default)</option>
                <option value={8192}>8192 tokens (Large Dossiers)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">
                Max Generated Tokens
              </label>
              <select
                value={maxTokensInput}
                onChange={(e) => setMaxTokensInput(parseInt(e.target.value))}
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none"
              >
                <option value={1024}>1024 tokens</option>
                <option value={2048}>2048 tokens (Default)</option>
                <option value={4096}>4096 tokens</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] text-black font-semibold text-xs rounded-lg shadow transition-all"
            >
              Save AI Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Browser Storage & Data Management */}
      <div className="p-6 rounded-2xl bg-[#14151e] border border-[#232533] space-y-6">
        <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
          <HardDrive className="w-4 h-4 text-[#d4af37]" />
          <span>Browser IndexedDB Storage & Backup</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#0e0f15] p-4 rounded-xl border border-[#222432]">
          <div>
            <span className="text-[#6d7082] block">Current Disk Usage</span>
            <span className="font-code font-bold text-[#f5e4be] text-sm">
              {formatBytes(storageStats?.usageBytes)}
            </span>
          </div>

          <div>
            <span className="text-[#6d7082] block">Browser Quota</span>
            <span className="font-code font-bold text-[#f5e4be] text-sm">
              {formatBytes(storageStats?.quotaBytes)}
            </span>
          </div>

          <div>
            <span className="text-[#6d7082] block">Portraits Stored</span>
            <span className="font-code font-bold text-[#d4af37] text-sm">
              {storageStats?.portraitsCount || 0}
            </span>
          </div>

          <div>
            <span className="text-[#6d7082] block">Archived Messages</span>
            <span className="font-code font-bold text-[#d4af37] text-sm">
              {storageStats?.messagesCount || 0}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#8c8f9f] leading-relaxed">
          All photographs, personality profiles, primary letters, and conversation transcripts are stored securely inside your browser&apos;s IndexedDB database. Clearing your browser site data will remove local archives unless you export a backup.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1e202c]">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 bg-[#1b1d28] hover:bg-[#252838] border border-[#2b2e3e] text-[#f5e4be] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Export Full JSON Archive Backup</span>
          </button>

          <button
            onClick={() => importFileRef.current?.click()}
            className="px-4 py-2 bg-[#1b1d28] hover:bg-[#252838] border border-[#2b2e3e] text-[#f5e4be] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Restore Backup File</span>
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportBackup}
          />

          <button
            onClick={() => {
              if (confirm('CRITICAL WARNING: This will permanently delete all local portraits, conversations, and memories from IndexedDB. Continue?')) {
                clearAllArchiveData();
              }
            }}
            className="px-4 py-2 bg-[#800020]/30 hover:bg-[#800020]/60 border border-[#800020]/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Archive Data</span>
          </button>
        </div>
      </div>

      {/* Visual Identity & Theme */}
      <div className="p-6 rounded-2xl bg-[#14151e] border border-[#232533] space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
          <Palette className="w-4 h-4 text-[#d4af37]" />
          <span>Visual Aesthetics & Theme</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#a0a3b3] mb-1 font-medium">Archive Ambiance</label>
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as any })}
              className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none"
            >
              <option value="antique-dark">Antique Dark (Charcoal & Gilded Foil)</option>
              <option value="archival-sepia">Archival Sepia (Historic Manuscript)</option>
              <option value="museum-noir">Museum Noir (Deep Gallery Obsidian)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#a0a3b3] mb-1 font-medium">Accent Gilding</label>
            <select
              value={settings.accentColor}
              onChange={(e) => updateSettings({ accentColor: e.target.value as any })}
              className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none"
            >
              <option value="gold">Antique Gold</option>
              <option value="bronze">Muted Bronze</option>
              <option value="burgundy">Imperial Burgundy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="p-6 rounded-2xl bg-[#14151e] border border-[#232533] space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Local Archival Privacy & Integrity Charter</span>
        </div>

        <p className="text-xs text-[#a0a3b3] leading-relaxed">
          <strong>Echoes of the Archive</strong> is strictly frontend-only and operates without any application backend, remote database, or cloud AI services. All documents, images, and conversations remain in your browser sandbox and communicate solely with your local Ollama runtime at <code>localhost:11434</code>.
        </p>
      </div>
    </div>
  );
};
