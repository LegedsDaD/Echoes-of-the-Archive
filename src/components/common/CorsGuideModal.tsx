import React from 'react';
import { X, Terminal, ShieldAlert, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';

interface CorsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorsGuideModal: React.FC<CorsGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const macLinuxCommand = 'OLLAMA_ORIGINS="*" ollama serve';
  const windowsCmd = 'set OLLAMA_ORIGINS=* && ollama serve';
  const windowsPowerShell = '$env:OLLAMA_ORIGINS="*" ; ollama serve';
  const systemdConfig = `[Service]\nEnvironment="OLLAMA_ORIGINS=*"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#14151c] border border-[#d4af37]/30 rounded-xl p-6 shadow-2xl text-[#e8e4dc]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a8d9b] hover:text-[#f5e4be] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif-title gold-gradient-text">
              Ollama Browser Connection & CORS Guide
            </h3>
            <p className="text-xs text-[#a0a3b1]">
              Enable direct browser access to <code className="text-[#d4af37]">http://localhost:11434</code>
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-[#c8c5bc]">
          <p>
            Because <strong>Echoes of the Archive</strong> is a strictly browser-native application with <em>no intermediary server</em>, your web browser communicates directly with your local Ollama runtime.
          </p>

          <div className="p-3.5 rounded-lg bg-[#1c1e28] border border-[#2a2c3a] text-xs">
            <p className="font-semibold text-[#f5e4be] mb-1 flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-[#d4af37]" />
              <span>Why is this required?</span>
            </p>
            <p className="text-[#9ea1b2]">
              Modern web browsers enforce Cross-Origin Resource Sharing (CORS). By default, Ollama only permits requests from <code>127.0.0.1</code> or specific origins. Setting <code>OLLAMA_ORIGINS="*"</code> informs Ollama to accept HTTP requests from your browser tab.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#d4af37]">
              Step-by-Step Instructions
            </h4>

            {/* macOS & Linux */}
            <div className="rounded-lg bg-[#0e0f14] border border-[#232532] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#f5e4be] flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>macOS & Linux (Terminal)</span>
                </span>
                <button
                  onClick={() => handleCopy(macLinuxCommand, 1)}
                  className="flex items-center space-x-1 text-[11px] text-[#8e7343] hover:text-[#d4af37] transition-colors"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 1 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#858899] mb-2">
                1. Quit any running Ollama tray app.<br />
                2. In your terminal, launch Ollama with the origin variable:
              </p>
              <pre className="p-2 rounded bg-black/50 text-[#d4af37] font-code text-xs overflow-x-auto">
                {macLinuxCommand}
              </pre>
            </div>

            {/* Windows PowerShell */}
            <div className="rounded-lg bg-[#0e0f14] border border-[#232532] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#f5e4be] flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Windows (PowerShell)</span>
                </span>
                <button
                  onClick={() => handleCopy(windowsPowerShell, 2)}
                  className="flex items-center space-x-1 text-[11px] text-[#8e7343] hover:text-[#d4af37] transition-colors"
                >
                  {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 2 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 rounded bg-black/50 text-[#d4af37] font-code text-xs overflow-x-auto">
                {windowsPowerShell}
              </pre>
            </div>

            {/* Windows Command Prompt */}
            <div className="rounded-lg bg-[#0e0f14] border border-[#232532] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#f5e4be] flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Windows (Command Prompt / cmd.exe)</span>
                </span>
                <button
                  onClick={() => handleCopy(windowsCmd, 3)}
                  className="flex items-center space-x-1 text-[11px] text-[#8e7343] hover:text-[#d4af37] transition-colors"
                >
                  {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 3 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 rounded bg-black/50 text-[#d4af37] font-code text-xs overflow-x-auto">
                {windowsCmd}
              </pre>
            </div>

            {/* Systemd Linux service */}
            <div className="rounded-lg bg-[#0e0f14] border border-[#232532] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#f5e4be]">Linux Systemd Service (Permanent)</span>
                <button
                  onClick={() => handleCopy(systemdConfig, 4)}
                  className="flex items-center space-x-1 text-[11px] text-[#8e7343] hover:text-[#d4af37] transition-colors"
                >
                  {copiedIndex === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 4 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#858899] mb-1.5">
                Add to <code>/etc/systemd/system/ollama.service.d/environment.conf</code>:
              </p>
              <pre className="p-2 rounded bg-black/50 text-[#d4af37] font-code text-xs overflow-x-auto">
                {systemdConfig}
              </pre>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#232532]">
            <a
              href="https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#d4af37] hover:underline flex items-center space-x-1"
            >
              <span>Official Ollama FAQ Reference</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#d4af37] hover:bg-[#f5e4be] text-black font-semibold text-xs rounded transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
