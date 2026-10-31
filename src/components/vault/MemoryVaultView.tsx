import React, { useState, useRef } from 'react';
import {
  Archive,
  PlusCircle,
  Upload,
  Search,
  Trash2,
  Calendar,
  Sparkles,
  X,
  Play,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { MemoryType, MemoryItem } from '../../types';
import { ragService } from '../../services/rag';
import { documentParserService } from '../../services/documentParser';

export const MemoryVaultView: React.FC = () => {
  const {
    memories,
    portraits,
    addMemory,
    deleteMemory,
    ollamaStatus,
  } = useArchive();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPortraitId, setSelectedPortraitId] = useState<string>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('letter');
  const [newPortraitId, setNewPortraitId] = useState<string>(portraits[0]?.id || '');
  const [newDateOrEra, setNewDateOrEra] = useState('');
  const [newSourceOrigin, setNewSourceOrigin] = useState('');
  const [newTags, setNewTags] = useState('');

  // RAG Simulator State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<{ memory: MemoryItem; score: number }[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const memoryTypes: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Records' },
    { id: 'letter', label: 'Letters' },
    { id: 'diary', label: 'Diaries' },
    { id: 'biography', label: 'Biographies' },
    { id: 'historical_record', label: 'Historical Records' },
    { id: 'quote', label: 'Quotes' },
    { id: 'document', label: 'Documents' },
    { id: 'note', label: 'Notes' },
  ];

  const filteredMemories = memories.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || m.type === selectedType;
    const matchesPortrait = selectedPortraitId === 'all' || m.portraitId === selectedPortraitId;

    return matchesSearch && matchesType && matchesPortrait;
  });

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !newPortraitId) return;

    await addMemory({
      portraitId: newPortraitId,
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      dateOrEra: newDateOrEra.trim() || undefined,
      sourceOrigin: newSourceOrigin.trim() || undefined,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setNewDateOrEra('');
    setNewSourceOrigin('');
    setNewTags('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      const parsed = await documentParserService.parseFile(file);
      await addMemory({
        portraitId: portraits[0]?.id || 'global',
        title: `Ingested Document: ${parsed.fileName}`,
        content: parsed.text,
        type: 'document',
        dateOrEra: new Date().toLocaleDateString(),
        sourceOrigin: `Uploaded file (${parsed.fileType})`,
        tags: ['uploaded_file', parsed.fileType],
      });
    } catch (err) {
      console.error('File parse error:', err);
    }
  };

  const handleTestRag = () => {
    if (!ragQuery.trim()) return;
    const results = ragService.searchRelevantMemories(ragQuery, memories, undefined, 4, 0.05);
    setRagResults(results);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232533] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
            <Archive className="w-3.5 h-3.5" />
            <span>Browser-Side Knowledge Base</span>
          </div>
          <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
            Memory Vault
          </h2>
          <p className="text-sm text-[#9c9fae]">
            IndexedDB primary source repository with browser-side Retrieval-Augmented Generation (RAG).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#1b1d28] hover:bg-[#252838] border border-[#2b2e3e] text-[#f5e4be] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Upload Document</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.json,.pdf,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a2844e] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Inscribe Memory</span>
          </button>
        </div>
      </div>

      {/* RAG Simulator Banner */}
      <div className="p-5 rounded-2xl bg-[#14151e] border border-[#232533] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#f5e4be]">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span>Local Retrieval-Augmented Generation (RAG) Probe</span>
          </div>
          <span className="text-[11px] text-[#6d7082] font-code">
            Model: {ollamaStatus.activeEmbeddingModel || 'Lexical TF-IDF Vector'}
          </span>
        </div>

        <p className="text-xs text-[#8c8f9f]">
          Test real-time similarity search. The browser calculates cosine / lexical relevance against all memories before passing relevant citations to Ollama chat models.
        </p>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestRag()}
            placeholder="e.g. Bernoulli numbers, morning stoic reflections, colorado springs..."
            className="flex-1 bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
          />
          <button
            onClick={handleTestRag}
            className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] border border-[#2c2f40] text-[#d4af37] text-xs font-semibold rounded-lg flex items-center space-x-1"
          >
            <Play className="w-3 h-3" />
            <span>Test Search</span>
          </button>
        </div>

        {ragResults && (
          <div className="mt-3 pt-3 border-t border-[#1e202c] space-y-2">
            <span className="text-[11px] font-semibold text-[#f5e4be]">
              Top Ranked Primary Sources:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {ragResults.length === 0 ? (
                <p className="text-xs text-[#6c6f80]">No matching memories exceeded similarity threshold.</p>
              ) : (
                ragResults.map((r, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#0c0d12] border border-[#1f212e] space-y-1">
                    <div className="flex justify-between font-semibold text-[#f5e4be]">
                      <span className="truncate">{r.memory.title}</span>
                      <span className="text-[#d4af37] font-code shrink-0">
                        {Math.round(r.score * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8c8f9f] line-clamp-2">{r.memory.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#14151e] p-4 rounded-xl border border-[#232533]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#6c6f80]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, content, or tags..."
            className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Portrait Filter */}
          <select
            value={selectedPortraitId}
            onChange={(e) => setSelectedPortraitId(e.target.value)}
            className="bg-[#0e0f15] border border-[#222432] rounded-lg px-2.5 py-1.5 text-xs text-[#e8e4dc] focus:outline-none"
          >
            <option value="all">All Historical Figures</option>
            {portraits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#0e0f15] border border-[#222432] rounded-lg px-2.5 py-1.5 text-xs text-[#e8e4dc] focus:outline-none"
          >
            {memoryTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Memories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMemories.map((mem) => {
          const portrait = portraits.find((p) => p.id === mem.portraitId);

          return (
            <div
              key={mem.id}
              className="p-5 rounded-2xl bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#1b1d28] border border-[#2c2f40] text-[#d4af37]">
                    {mem.type.replace('_', ' ')}
                  </span>
                  {mem.embedding && (
                    <span className="text-[10px] text-emerald-400 font-code">
                      Vectorized
                    </span>
                  )}
                </div>

                <h4 className="font-serif-title text-sm font-bold text-[#f5e4be] group-hover:text-[#d4af37] transition-colors line-clamp-2">
                  {mem.title}
                </h4>

                <p className="text-xs text-[#a0a3b3] font-archival leading-relaxed line-clamp-5">
                  {mem.content}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#1e202c]">
                <div className="flex items-center justify-between text-[11px] text-[#6d7082]">
                  <span className="truncate text-[#8e7343] font-medium">
                    {portrait?.name || 'General Archival Record'}
                  </span>
                  {mem.dateOrEra && (
                    <span className="flex items-center space-x-1 shrink-0">
                      <Calendar className="w-3 h-3 text-[#d4af37]" />
                      <span>{mem.dateOrEra}</span>
                    </span>
                  )}
                </div>

                {mem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mem.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.2 rounded bg-[#0c0d12] text-[10px] text-[#8c8f9f] font-code"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      if (confirm(`Delete memory "${mem.title}"?`)) {
                        deleteMemory(mem.id);
                      }
                    }}
                    className="p-1.5 text-[#6c6f80] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#14151c] border border-[#d4af37]/30 rounded-xl p-6 shadow-2xl text-[#e8e4dc] space-y-4">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-[#8a8d9b] hover:text-[#f5e4be] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-title text-lg font-bold text-[#f5e4be]">
              Inscribe Primary Archival Memory
            </h3>

            <form onSubmit={handleCreateMemory} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a0a3b3] mb-1 font-medium">Associated Historical Figure *</label>
                <select
                  value={newPortraitId}
                  onChange={(e) => setNewPortraitId(e.target.value)}
                  className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                >
                  {portraits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#a0a3b3] mb-1 font-medium">Record Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Letter to Charles Babbage regarding Note G"
                  className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a3b3] mb-1 font-medium">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MemoryType)}
                    className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                  >
                    <option value="letter">Letter</option>
                    <option value="diary">Diary Entry</option>
                    <option value="historical_record">Historical Record</option>
                    <option value="biography">Biography</option>
                    <option value="quote">Quote</option>
                    <option value="note">Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a0a3b3] mb-1 font-medium">Date or Era</label>
                  <input
                    type="text"
                    value={newDateOrEra}
                    onChange={(e) => setNewDateOrEra(e.target.value)}
                    placeholder="e.g. July 1843"
                    className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a0a3b3] mb-1 font-medium">Source / Origin Archive</label>
                <input
                  type="text"
                  value={newSourceOrigin}
                  onChange={(e) => setNewSourceOrigin(e.target.value)}
                  placeholder="e.g. British Library Add MS 37192"
                  className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                />
              </div>

              <div>
                <label className="block text-[#a0a3b3] mb-1 font-medium">Record Text / Verbatim Transcript *</label>
                <textarea
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Inscribe verbatim historical text..."
                  className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc] font-archival text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[#a0a3b3] mb-1 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="computing, analytical engine, letters"
                  className="w-full bg-[#0e0f15] border border-[#222432] rounded p-2 text-xs text-[#e8e4dc]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#222432]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 bg-[#1f212e] text-[#e8e4dc] text-xs rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#d4af37] text-black font-semibold text-xs rounded hover:bg-[#f5e4be]"
                >
                  Inscribe Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
