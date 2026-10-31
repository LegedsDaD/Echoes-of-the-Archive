import React, { useState } from 'react';
import {
  Cpu,
  Download,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Zap,
  Info,
  Radio,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { ollamaService } from '../../services/ollama';

export const ModelManagerView: React.FC = () => {
  const {
    ollamaStatus,
    refreshOllama,
    pullModelWithProgress,
    settings,
    updateSettings,
    setShowCorsModal,
  } = useArchive();

  const [pullModelInput, setPullModelInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatusText, setPullStatusText] = useState('');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Recommended compatible models for 8GB RAM laptops & desktop rigs
  const recommendedModels = [
    {
      name: 'gemma3:8b',
      tag: 'Conversation & Vision',
      size: '~5.2 GB',
      notes: 'Optimal for historical dialogue and multimodal understanding on 8GB RAM.',
      vision: true,
      conv: true,
    },
    {
      name: 'llava:latest',
      tag: 'Vision Pioneer',
      size: '~4.5 GB',
      notes: 'Dedicated vision model for analyzing portrait clothing, pose, and era style.',
      vision: true,
      conv: false,
    },
    {
      name: 'qwen2.5-vl:7b',
      tag: 'High-Res Vision',
      size: '~4.8 GB',
      notes: 'Exceptional visual detail analysis for intricate antique artifacts and attire.',
      vision: true,
      conv: true,
    },
    {
      name: 'llama3.2:3b',
      tag: 'Ultra-Fast Chat',
      size: '~2.0 GB',
      notes: 'Lightweight conversational model with minimal RAM footprint.',
      vision: false,
      conv: true,
    },
    {
      name: 'nomic-embed-text:latest',
      tag: 'Memory Embedding',
      size: '~274 MB',
      notes: 'Essential for vector indexing of letters, diaries, and primary records.',
      vision: false,
      conv: false,
      embed: true,
    },
  ];

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim() || isPulling) return;
    setIsPulling(true);
    setPullStatusText(`Initiating download for ${modelName}...`);

    try {
      await pullModelWithProgress(modelName.trim());
      setPullStatusText(`Successfully installed ${modelName}!`);
      setPullModelInput('');
    } catch (err: any) {
      setPullStatusText(`Download error: ${err.message}`);
    } finally {
      setIsPulling(false);
    }
  };

  const handleTestInference = async (modelName: string) => {
    setIsTesting(true);
    setTestOutput(null);

    try {
      const resp = await ollamaService.generateText(
        modelName,
        'In one eloquent sentence, describe the purpose of an archival memorial studio.'
      );
      setTestOutput(`[Test Successful via ${modelName}]:\n${resp}`);
    } catch (err: any) {
      setTestOutput(`[Inference Failed]: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232533] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Local Neural Inference Runtime</span>
          </div>
          <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
            Ollama Model Management
          </h2>
          <p className="text-sm text-[#9c9fae]">
            Dynamically discovered models at <code className="text-[#d4af37]">{settings.ollamaEndpoint}</code>.
          </p>
        </div>

        <button
          onClick={() => refreshOllama()}
          className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] border border-[#2b2d3d] text-[#e8e4dc] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-2 self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Refresh Discovered Models</span>
        </button>
      </div>

      {/* Ollama Status Alert Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          ollamaStatus.state === 'connected'
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : ollamaStatus.state === 'connecting'
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
        }`}
      >
        <div className="flex items-center space-x-3">
          {ollamaStatus.state === 'connected' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : ollamaStatus.state === 'connecting' ? (
            <Radio className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}

          <div>
            <p className="font-semibold">
              Ollama Status: {ollamaStatus.state.toUpperCase()}
              {ollamaStatus.version && ` (v${ollamaStatus.version})`}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {ollamaStatus.errorMessage ||
                `Found ${ollamaStatus.installedModels.length} models installed locally on your machine.`}
            </p>
          </div>
        </div>

        {ollamaStatus.state !== 'connected' && (
          <button
            onClick={() => setShowCorsModal(true)}
            className="px-3 py-1 bg-[#800020] hover:bg-[#a00028] text-white font-semibold rounded transition-colors text-[11px]"
          >
            Fix CORS Access
          </button>
        )}
      </div>

      {/* Pull Model Bar */}
      <div className="p-5 rounded-2xl bg-[#14151e] border border-[#232533] space-y-3">
        <h3 className="font-serif-title text-sm font-bold text-[#f5e4be] flex items-center space-x-2">
          <Download className="w-4 h-4 text-[#d4af37]" />
          <span>Pull & Install Model from Ollama Library</span>
        </h3>
        <p className="text-xs text-[#8c8f9f]">
          Stream real download progress directly from Ollama via <code className="text-[#d4af37]">/api/pull</code> without intermediary servers.
        </p>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={pullModelInput}
            onChange={(e) => setPullModelInput(e.target.value)}
            placeholder="e.g. gemma3:8b, llava:latest, nomic-embed-text..."
            disabled={isPulling}
            className="flex-1 bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
          />
          <button
            onClick={() => handlePullModel(pullModelInput)}
            disabled={!pullModelInput.trim() || isPulling}
            className="px-5 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a2844e] hover:to-[#f3deaa] disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isPulling ? 'Downloading...' : 'Pull Model'}</span>
          </button>
        </div>

        {pullStatusText && (
          <p className="text-xs text-[#d4af37] font-code pt-1">{pullStatusText}</p>
        )}
      </div>

      {/* Installed Models Grid */}
      <div className="space-y-4">
        <h3 className="font-serif-title text-base font-bold text-[#f5e4be]">
          Installed Local Models ({ollamaStatus.installedModels.length})
        </h3>

        {ollamaStatus.installedModels.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#14151e] border border-dashed border-[#232533] space-y-2">
            <p className="text-sm text-[#8c8f9f]">
              No local models detected. Ensure Ollama is running and download a recommended model below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ollamaStatus.installedModels.map((m) => {
              const isVision = m.isVisionCapable;
              const isEmbed = m.isEmbeddingCapable;

              return (
                <div
                  key={m.digest || m.name}
                  className="p-4 rounded-xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-code text-xs font-bold text-[#f5e4be] group-hover:text-[#d4af37] transition-colors truncate">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-[#6d7082] font-code">
                      {m.size ? formatSize(m.size) : ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isVision && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>Vision Capable</span>
                      </span>
                    )}

                    {isEmbed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        Embeddings
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1b1d28] text-[#f5e4be] border border-[#2c2f40] flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3 text-[#d4af37]" />
                        <span>Conversation</span>
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1e202c] flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleTestInference(m.name)}
                      disabled={isTesting}
                      className="text-[11px] text-[#8e7343] hover:text-[#d4af37] flex items-center space-x-1"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Test Inference</span>
                    </button>

                    <div className="flex space-x-1">
                      {isVision && (
                        <button
                          onClick={() => updateSettings({ preferredVisionModel: m.name })}
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            settings.preferredVisionModel === m.name
                              ? 'bg-[#d4af37] text-black font-semibold'
                              : 'bg-[#1b1c28] text-[#8c8f9f] hover:text-[#e8e4dc]'
                          }`}
                        >
                          Set Vision
                        </button>
                      )}
                      {!isEmbed && (
                        <button
                          onClick={() => updateSettings({ preferredConversationModel: m.name })}
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            settings.preferredConversationModel === m.name
                              ? 'bg-[#d4af37] text-black font-semibold'
                              : 'bg-[#1b1c28] text-[#8c8f9f] hover:text-[#e8e4dc]'
                          }`}
                        >
                          Set Chat
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {testOutput && (
        <div className="p-4 rounded-xl bg-[#0e0f15] border border-[#222432] space-y-2 text-xs">
          <span className="font-semibold text-[#f5e4be]">Inference Test Output:</span>
          <pre className="font-code text-xs text-[#d4af37] whitespace-pre-wrap">{testOutput}</pre>
        </div>
      )}

      {/* Recommended for 8GB RAM Systems */}
      <div className="space-y-4 pt-4 border-t border-[#232533]">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#d4af37]" />
          <h3 className="font-serif-title text-base font-bold text-[#f5e4be]">
            Recommended Models for Ordinary Hardware (~8 GB RAM)
          </h3>
        </div>
        <p className="text-xs text-[#8c8f9f]">
          Carefully chosen quantized models that operate reliably without exhausting browser or local system memory.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedModels.map((rec) => {
            const isInstalled = ollamaStatus.installedModels.some((m) => m.name.includes(rec.name));

            return (
              <div
                key={rec.name}
                className="p-4 rounded-xl bg-[#14151e] border border-[#232533] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-code text-xs font-bold text-[#f5e4be]">
                      {rec.name}
                    </span>
                    <span className="text-[10px] font-code text-[#d4af37] bg-[#d4af37]/10 px-1.5 py-0.5 rounded">
                      {rec.size}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8c8f9f] mt-1.5 leading-relaxed">{rec.notes}</p>
                </div>

                <div className="pt-3 border-t border-[#1e202c] flex items-center justify-between">
                  <span className="text-[10px] text-[#6d7082]">{rec.tag}</span>

                  {isInstalled ? (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Installed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePullModel(rec.name)}
                      disabled={isPulling}
                      className="px-2.5 py-1 bg-[#1b1c28] hover:bg-[#d4af37] text-[#d4af37] hover:text-black font-semibold text-[11px] rounded transition-colors flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Pull</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
