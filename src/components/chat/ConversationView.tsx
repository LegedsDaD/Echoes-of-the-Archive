import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Send,
  PlusCircle,
  Copy,
  Trash2,
  RefreshCw,
  Search,
  BookOpen,
  Sparkles,
  Info,
  Clock,
  Cpu,
  Check,
  FileText,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { Message, SimulationMode } from '../../types';
import { dbService } from '../../services/db';

export const ConversationView: React.FC = () => {
  const {
    portraits,
    activePortraitId,
    setActivePortraitId,
    activeConversationId,
    setActiveConversationId,
    conversations,
    createConversation,
    deleteConversation,
    sendChatMessage,
    ollamaStatus,
  } = useArchive();

  const activePortrait = portraits.find((p) => p.id === activePortraitId) || portraits[0];
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<SimulationMode>(activePortrait?.preferredMode || 'historical');
  const [selectedModel, setSelectedModel] = useState<string>(ollamaStatus.activeConversationModel);
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [searchMsgText, setSearchMsgText] = useState('');
  const [activeCitationModal, setActiveCitationModal] = useState<Message['citations'] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  // Filter conversations for active portrait
  const portraitConversations = conversations.filter((c) => c.portraitId === activePortrait?.id);
  const activeConversation = portraitConversations.find((c) => c.id === activeConversationId) || portraitConversations[0];

  // Update selected model when Ollama status changes
  useEffect(() => {
    if (ollamaStatus.activeConversationModel && !selectedModel) {
      setSelectedModel(ollamaStatus.activeConversationModel);
    }
  }, [ollamaStatus.activeConversationModel, selectedModel]);

  // Sync mode with portrait preferred mode
  useEffect(() => {
    if (activePortrait) {
      setSelectedMode(activePortrait.preferredMode || 'historical');
    }
  }, [activePortrait]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setActiveConversationId(activeConversation.id);
      dbService.getMessagesByConversation(activeConversation.id).then((msgs) => {
        startTransition(() => {
          setMessages(msgs);
        });
      });
    } else if (activePortrait && portraitConversations.length === 0) {
      // Auto-create initial conversation if none exists
      createConversation(activePortrait.id, `Dialogue with ${activePortrait.name}`, activePortrait.preferredMode);
    }
  }, [activeConversation, activePortrait, portraitConversations.length, createConversation, setActiveConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isSending || !activePortrait || !activeConversation) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');
    setIsSending(true);

    try {
      await sendChatMessage(
        activeConversation.id,
        activePortrait.id,
        userText,
        selectedMode,
        selectedModel
      );

      // Refresh messages
      const updatedMsgs = await dbService.getMessagesByConversation(activeConversation.id);
      setMessages(updatedMsgs);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDeleteMessage = async (id: string) => {
    await dbService.deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleRegenerate = async (msg: Message) => {
    if (isSending || !activePortrait || !activeConversation) return;
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    if (msgIndex <= 0) return;
    const prevUserMsg = messages[msgIndex - 1];
    if (prevUserMsg.sender !== 'user') return;

    setIsSending(true);
    try {
      await handleDeleteMessage(msg.id);
      await sendChatMessage(
        activeConversation.id,
        activePortrait.id,
        prevUserMsg.content,
        selectedMode,
        selectedModel
      );
      const updated = await dbService.getMessagesByConversation(activeConversation.id);
      setMessages(updated);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter((m) =>
    searchMsgText ? m.content.toLowerCase().includes(searchMsgText.toLowerCase()) : true
  );

  if (!activePortrait) {
    return (
      <div className="p-12 text-center text-[#8a8d9b]">
        <p>No portrait selected. Please choose or inscribe a portrait first.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden select-text animate-fade-in">
      {/* Left/Sidebar: Portrait Switcher & Conversation History */}
      <div className="w-full lg:w-72 bg-[#12131a] border-r border-[#22242f] flex flex-col shrink-0">
        {/* Active Portrait Summary */}
        <div className="p-4 border-b border-[#22242f] space-y-3">
          <div className="flex items-center space-x-2 text-[10px] text-[#d4af37] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Active Interlocutor</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-14 rounded portrait-antique-frame overflow-hidden bg-black shrink-0">
              <img
                src={activePortrait.thumbnailUrl || activePortrait.imageUrl}
                alt={activePortrait.name}
                className="w-full h-full object-cover object-top filter sepia-[0.15]"
              />
            </div>

            <div className="flex-1 min-w-0">
              <select
                value={activePortrait.id}
                onChange={(e) => setActivePortraitId(e.target.value)}
                className="w-full bg-[#181a24] border border-[#282a3a] rounded p-1 text-xs text-[#f5e4be] font-serif-title font-semibold truncate focus:outline-none"
              >
                {portraits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#8c8f9f] truncate mt-0.5">
                {activePortrait.profession}
              </p>
              <p className="text-[10px] text-[#636675] truncate">
                {activePortrait.historicalPeriod}
              </p>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="p-3 flex items-center justify-between border-b border-[#22242f]">
          <span className="text-xs font-semibold text-[#8c8f9f]">Archived Dialogues</span>
          <button
            onClick={() => createConversation(activePortrait.id)}
            title="Start New Conversation"
            className="p-1 rounded text-[#d4af37] hover:bg-[#1a1c26] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {portraitConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors group flex items-center justify-between ${
                activeConversation?.id === conv.id
                  ? 'bg-[#1b1d28] text-[#f5e4be] border border-[#d4af37]/30'
                  : 'text-[#8c8f9f] hover:bg-[#161822] hover:text-[#e8e4dc]'
              }`}
            >
              <div className="truncate pr-2">
                <p className="font-medium truncate">{conv.title}</p>
                <p className="text-[10px] text-[#636675] flex items-center space-x-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation history?')) {
                    deleteConversation(conv.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#6c6f80] hover:text-rose-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Mode & Ethics Info */}
        <div className="p-3 border-t border-[#22242f] bg-[#0e0f14] text-[10px] text-[#6c6f80] space-y-1">
          <p className="flex items-center space-x-1 text-[#d4af37]">
            <Info className="w-3 h-3" />
            <span className="font-semibold uppercase">Simulation Disclosure</span>
          </p>
          <p className="leading-tight">
            Generated cognitive simulation based on primary records. Not communication with deceased persons.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0e0f14] overflow-hidden">
        {/* Top Control Bar: Mode & Model Selector */}
        <div className="h-14 bg-[#14151e] border-b border-[#22242f] px-6 flex items-center justify-between shrink-0 flex-wrap gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center space-x-1 bg-[#0c0d12] p-1 rounded-lg border border-[#222432]">
            {(
              [
                { id: 'historical', label: 'Historical Mode' },
                { id: 'memorial', label: 'Memorial Mode' },
                { id: 'creative', label: 'Creative Dialogue' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                  selectedMode === mode.id
                    ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                    : 'text-[#8c8f9f] hover:text-[#e8e4dc]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Model Selector & Message Search */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#636675]" />
              <input
                type="text"
                value={searchMsgText}
                onChange={(e) => setSearchMsgText(e.target.value)}
                placeholder="Search dialogue..."
                className="bg-[#0c0d12] border border-[#222432] rounded pl-7 pr-2 py-1 text-xs text-[#e8e4dc] placeholder-[#636675] focus:outline-none w-32 sm:w-44"
              />
            </div>

            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#0c0d12] border border-[#222432] text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#d4af37]" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-[11px] font-code text-[#f5e4be] focus:outline-none"
              >
                {ollamaStatus.installedModels.length > 0 ? (
                  ollamaStatus.installedModels.map((m) => (
                    <option key={m.name} value={m.name} className="bg-[#14151e]">
                      {m.name}
                    </option>
                  ))
                ) : (
                  <option value={ollamaStatus.activeConversationModel} className="bg-[#14151e]">
                    {ollamaStatus.activeConversationModel}
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#181a24] border border-[#282a3a] flex items-center justify-center text-[#d4af37]">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-serif-title text-base font-bold text-[#f5e4be]">
                Dialogue with {activePortrait.name}
              </h4>
              <p className="text-xs text-[#8c8f9f] max-w-md mx-auto leading-relaxed">
                Inquire into documented historical events, scientific ideas, philosophical reflections, or personal letters preserved in the archive.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 group`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center space-x-2 text-[11px] text-[#6c6f80] px-1">
                    <span className="font-medium text-[#a0a3b3]">
                      {isUser ? 'Inquirer' : activePortrait.name}
                    </span>
                    <span>•</span>
                    <span className="font-code">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.modelUsed && (
                      <>
                        <span>•</span>
                        <span className="text-[10px] text-[#8e7343] font-code">{msg.modelUsed}</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#1b1d28] text-[#f5e4be] border border-[#2b2e3e] rounded-tr-none'
                        : 'bg-[#14151e] text-[#e8e4dc] border border-[#232533] rounded-tl-none font-archival text-base'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Citations Chips */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#232533]/80 space-y-1.5 font-sans">
                        <span className="text-[10px] uppercase font-semibold text-[#d4af37] tracking-wider block">
                          Retrieved Archival Records:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cite, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveCitationModal(msg.citations || null)}
                              className="px-2 py-0.5 rounded bg-[#1a1c26] hover:bg-[#222533] border border-[#2d3040] text-[10px] text-[#f5e4be] flex items-center space-x-1 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-[#d4af37]" />
                              <span className="truncate max-w-[160px]">{cite.title}</span>
                              {cite.similarityScore && (
                                <span className="text-[#8e7343] font-code">
                                  {Math.round(cite.similarityScore * 100)}%
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Actions Pill */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-black/60 backdrop-blur rounded p-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy message"
                        className="p-1 text-[#8c8f9f] hover:text-[#f5e4be] transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {!isUser && (
                        <button
                          onClick={() => handleRegenerate(msg)}
                          title="Regenerate"
                          className="p-1 text-[#8c8f9f] hover:text-[#d4af37] transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete"
                        className="p-1 text-[#8c8f9f] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-center space-x-2 text-xs text-[#d4af37] animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Simulating response through Ollama neural model...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 bg-[#12131a] border-t border-[#22242f]">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-2 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Address ${activePortrait.name} in ${selectedMode} mode...`}
              disabled={isSending}
              className="flex-1 bg-[#0c0d12] border border-[#222432] focus:border-[#d4af37]/60 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#e8e4dc] placeholder-[#636675] focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isSending}
              className="px-5 py-3 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] disabled:opacity-40 text-black font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0"
            >
              <span>Transmit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Citations Full Drawer Modal */}
      {activeCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#14151c] border border-[#d4af37]/30 rounded-xl p-6 shadow-2xl text-[#e8e4dc] space-y-4">
            <h3 className="font-serif-title text-base font-bold text-[#f5e4be] flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#d4af37]" />
              <span>Retrieved Primary Citations</span>
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeCitationModal.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#0e0f15] border border-[#222432] text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[#f5e4be]">
                    <span>{c.title}</span>
                    {c.similarityScore && (
                      <span className="text-[#d4af37] font-code">
                        Relevance: {Math.round(c.similarityScore * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[#a0a3b3] font-archival leading-relaxed">{c.snippet}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#222432]">
              <button
                onClick={() => setActiveCitationModal(null)}
                className="px-4 py-1.5 bg-[#d4af37] text-black font-semibold text-xs rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
