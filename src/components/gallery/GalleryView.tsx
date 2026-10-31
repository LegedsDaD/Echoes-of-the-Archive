import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  MessageSquare,
  Eye,
  Trash2,
  Calendar,
  Compass,
  FileText,
  Sparkles,
  X,
  BookOpen,
  Filter,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { Portrait } from '../../types';

export const GalleryView: React.FC = () => {
  const {
    portraits,
    deletePortrait,
    setActivePortraitId,
    setActiveTab,
  } = useArchive();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [inspectPortrait, setInspectPortrait] = useState<Portrait | null>(null);

  // Extract unique historical periods
  const eras = ['all', ...Array.from(new Set(portraits.map((p) => p.historicalPeriod)))];

  const filteredPortraits = portraits.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.biography.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEra = selectedEra === 'all' || p.historicalPeriod === selectedEra;

    return matchesSearch && matchesEra;
  });

  const handleStartDialogue = (portraitId: string) => {
    setActivePortraitId(portraitId);
    setActiveTab('conversations');
  };

  const handleInspectVision = (portrait: Portrait) => {
    setInspectPortrait(portrait);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232533] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Archival Repository</span>
          </div>
          <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
            Portrait Gallery
          </h2>
          <p className="text-sm text-[#9c9fae]">
            Inscribed historical subjects with simulated cognitive profiles and primary documents.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a2844e] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg shadow-md transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Inscribe New Portrait</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#14151e] p-4 rounded-xl border border-[#232533]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#6c6f80]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search portraits by name, profession, era..."
            className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8e4dc] placeholder-[#6c6f80] focus:outline-none focus:border-[#d4af37]/60"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="text-xs text-[#8c8f9f]">Era:</span>
          <select
            value={selectedEra}
            onChange={(e) => setSelectedEra(e.target.value)}
            className="bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-1.5 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
          >
            {eras.map((era) => (
              <option key={era} value={era}>
                {era === 'all' ? 'All Eras & Periods' : era}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portrait Grid */}
      {filteredPortraits.length === 0 ? (
        <div className="text-center py-16 bg-[#14151e]/50 border border-dashed border-[#232533] rounded-2xl space-y-3">
          <p className="text-sm text-[#8c8f9f]">No inscribed portraits match your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedEra('all');
            }}
            className="text-xs text-[#d4af37] hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortraits.map((portrait) => (
            <div
              key={portrait.id}
              className="bg-[#14151e] border border-[#232533] hover:border-[#d4af37]/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group shadow-lg"
            >
              {/* Antique Portrait Image Header */}
              <div className="relative h-64 bg-black overflow-hidden flex items-center justify-center p-4">
                <div className="relative w-44 h-56 rounded-lg portrait-antique-frame overflow-hidden">
                  <img
                    src={portrait.imageUrl}
                    alt={portrait.name}
                    className="w-full h-full object-cover object-top filter sepia-[0.18] group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                {/* Preferred Mode Pill */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-[#d4af37]/30 text-[10px] text-[#f5e4be] font-code capitalize">
                  {portrait.preferredMode} Mode
                </div>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif-title text-base font-bold text-[#f5e4be] group-hover:text-[#d4af37] transition-colors line-clamp-1">
                    {portrait.name}
                  </h3>

                  <p className="text-xs font-medium text-[#c2beaf] mt-0.5">
                    {portrait.profession}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-[#7d8091] mt-2">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-[#d4af37]" />
                      <span>
                        {portrait.birthYear} – {portrait.deathYear || 'Present'}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Compass className="w-3 h-3 text-[#d4af37]" />
                      <span>{portrait.nationality}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#8c8f9f] line-clamp-3 mt-3 font-archival leading-relaxed">
                    {portrait.biography}
                  </p>
                </div>

                {/* Metadata counts */}
                <div className="pt-3 border-t border-[#1e202c] flex items-center justify-between text-[11px] text-[#7d8091]">
                  <span className="flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-[#d4af37]" />
                    <span>{portrait.memoryCount || 0} Primary Records</span>
                  </span>

                  <span className="text-[10px] text-[#a08544] font-code">
                    {portrait.historicalPeriod}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleStartDialogue(portrait.id)}
                    className="flex-1 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Initiate Dialogue</span>
                  </button>

                  <button
                    onClick={() => handleInspectVision(portrait)}
                    title="Inspect Vision Analysis & Personality Traits"
                    className="p-2 bg-[#1b1c28] hover:bg-[#252838] text-[#d4af37] border border-[#2b2d3d] rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Remove "${portrait.name}" and all associated archival records?`)) {
                        deletePortrait(portrait.id);
                      }
                    }}
                    title="De-accession portrait"
                    className="p-2 bg-[#1b1c28] hover:bg-rose-950/40 text-[#6c6f80] hover:text-rose-400 border border-[#2b2d3d] rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Vision & Archival Personality Modal */}
      {inspectPortrait && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#14151c] border border-[#d4af37]/30 rounded-xl p-6 shadow-2xl text-[#e8e4dc] space-y-6">
            <button
              onClick={() => setInspectPortrait(null)}
              className="absolute top-4 right-4 text-[#8a8d9b] hover:text-[#f5e4be] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-20 rounded-md overflow-hidden portrait-antique-frame bg-black shrink-0">
                <img
                  src={inspectPortrait.imageUrl}
                  alt={inspectPortrait.name}
                  className="w-full h-full object-cover object-top filter sepia-[0.15]"
                />
              </div>
              <div>
                <h3 className="font-serif-title text-xl font-bold text-[#f5e4be]">
                  {inspectPortrait.name}
                </h3>
                <p className="text-xs text-[#a0a3b3]">
                  {inspectPortrait.profession} • {inspectPortrait.historicalPeriod}
                </p>
                <p className="text-[11px] text-[#d4af37] font-code mt-0.5">
                  Simulation Traits: {inspectPortrait.personality.traits.tone}
                </p>
              </div>
            </div>

            {/* Vision Analysis Section */}
            {inspectPortrait.visionAnalysis && (
              <div className="space-y-3 bg-[#0e0f15] p-4 rounded-xl border border-[#222432]">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ollama Vision Analysis Findings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#a0a3b3]">
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Clothing & Attire:</span>
                    <span>{inspectPortrait.visionAnalysis.clothing}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Pose & Expression:</span>
                    <span>{inspectPortrait.visionAnalysis.expression}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Accessories & Artifacts:</span>
                    <span>{inspectPortrait.visionAnalysis.accessories}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Background & Setting:</span>
                    <span>{inspectPortrait.visionAnalysis.background}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Era & Medium:</span>
                    <span>{inspectPortrait.visionAnalysis.estimatedEraStyle} ({inspectPortrait.visionAnalysis.artisticMedium})</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161822] border border-[#1f212e]">
                    <span className="font-semibold text-[#f5e4be] block mb-0.5">Lighting & Atmosphere:</span>
                    <span>{inspectPortrait.visionAnalysis.lightingAndAtmosphere}</span>
                  </div>
                </div>

                <p className="text-[10px] text-[#6d7082] italic">
                  * Archival Compliance: Image analysis adheres to objective visual observations. No facial recognition or character judgment was inferred from facial geometry.
                </p>
              </div>
            )}

            {/* Documented Facts vs AI Interpretations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 bg-[#0e0f15] p-3.5 rounded-xl border border-[#222432]">
                <h4 className="font-semibold text-[#f5e4be] flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Documented Historical Facts</span>
                </h4>
                <ul className="space-y-1 text-[#a0a3b3] list-disc list-inside">
                  {inspectPortrait.personality.documentedFacts.map((fact, i) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 bg-[#0e0f15] p-3.5 rounded-xl border border-[#222432]">
                <h4 className="font-semibold text-[#f5e4be] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>AI Interpretations</span>
                </h4>
                <ul className="space-y-1 text-[#a0a3b3] list-disc list-inside">
                  {inspectPortrait.personality.aiInterpretations.map((interp, i) => (
                    <li key={i}>{interp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#222432]">
              <button
                onClick={() => setInspectPortrait(null)}
                className="px-4 py-1.5 bg-[#222432] hover:bg-[#2c2f40] text-xs font-semibold rounded text-[#e8e4dc]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = inspectPortrait.id;
                  setInspectPortrait(null);
                  handleStartDialogue(id);
                }}
                className="px-4 py-1.5 bg-[#d4af37] hover:bg-[#f5e4be] text-xs font-semibold rounded text-black flex items-center space-x-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Start Dialogue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
