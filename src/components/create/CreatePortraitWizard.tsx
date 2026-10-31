import React, { useState, useRef } from 'react';
import {
  Upload,
  User,
  Eye,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { Portrait, VisionAnalysisResult, SimulationMode } from '../../types';
import { documentParserService } from '../../services/documentParser';

export const CreatePortraitWizard: React.FC = () => {
  const {
    createOrUpdatePortrait,
    addMemory,
    analyzeImageWithVision,
    generateSimulatedPersonality,
    ollamaStatus,
    setActiveTab,
    setActivePortraitId,
  } = useArchive();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageFileSize, setImageFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Personal Details
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [profession, setProfession] = useState('');
  const [nationality, setNationality] = useState('');
  const [historicalPeriod, setHistoricalPeriod] = useState('');
  const [biography, setBiography] = useState('');
  const [relationshipContext, setRelationshipContext] = useState('');
  const [preferredMode, setPreferredMode] = useState<SimulationMode>('historical');

  // Step 3: Vision Analysis
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);

  // Step 4: Documents & Knowledge
  const [knowledgeText, setKnowledgeText] = useState('');
  const [uploadedDocNames, setUploadedDocNames] = useState<string[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Step 5: Personality
  const [generatedPersonality, setGeneratedPersonality] = useState<Portrait['personality'] | null>(null);

  // Image upload handler with client-side canvas optimization
  const handleImageSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }

    setErrorMessage(null);
    setImageFile(file);
    setImageFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize image to reasonable max dimensions (1024px) for browser memory & vision inference
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
          setImageBase64(optimizedBase64);
          setImageDimensions({ width: w, height: h });
        } else {
          setImageBase64(result);
          setImageDimensions({ width: img.width, height: img.height });
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelected(e.dataTransfer.files[0]);
    }
  };

  // Run Vision Analysis
  const handleRunVisionAnalysis = async () => {
    if (!imageBase64) return;
    setIsVisionAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await analyzeImageWithVision(imageBase64);
      setVisionAnalysis(result);
    } catch (err: any) {
      setErrorMessage(`Vision analysis failed: ${err.message}. You may continue with manual observations.`);
      // Set reasonable fallback observations
      setVisionAnalysis({
        clothing: 'Formal period attire consistent with archival subject.',
        expression: 'Dignified, composed gaze.',
        accessories: 'Classic period grooming.',
        background: 'Archival studio chiaroscuro setting.',
        estimatedEraStyle: historicalPeriod || 'Historical period portraiture.',
        artisticMedium: 'Historical photographic or painted portrait.',
        lightingAndAtmosphere: 'Even studio illumination.',
        technicalNotes: 'Manual archival observation log',
        analyzedAt: new Date().toISOString(),
        modelUsed: ollamaStatus.activeVisionModel,
      });
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  // Handle Document upload for knowledge
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      const parsed = await documentParserService.parseFile(file);
      setKnowledgeText((prev) => `${prev}\n\n[Document: ${file.name}]\n${parsed.text}`.trim());
      setUploadedDocNames((prev) => [...prev, file.name]);
    } catch (err: any) {
      setErrorMessage(`Document parsing error: ${err.message}`);
    }
  };

  // Generate Personality Profile
  const handleGeneratePersonality = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const visionNotes = visionAnalysis
        ? `Clothing: ${visionAnalysis.clothing}. Expression: ${visionAnalysis.expression}. Style: ${visionAnalysis.estimatedEraStyle}.`
        : 'Classical portrait.';

      const personality = await generateSimulatedPersonality(
        name,
        historicalPeriod,
        profession,
        biography,
        visionNotes,
        knowledgeText
      );

      setGeneratedPersonality(personality);
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMessage(`Personality generation error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Final Inscription into IndexedDB
  const handleFinalInscription = async () => {
    if (!generatedPersonality) return;
    setIsProcessing(true);

    try {
      const portraitId = `portrait-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newPortrait: Portrait = {
        id: portraitId,
        name,
        birthYear,
        deathYear: deathYear || undefined,
        profession,
        nationality,
        historicalPeriod,
        biography,
        relationshipContext: relationshipContext || undefined,
        imageUrl: imageBase64,
        imageDimensions: imageDimensions || undefined,
        imageFileSize,
        visionAnalysis: visionAnalysis || undefined,
        personality: generatedPersonality,
        preferredMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memoryCount: knowledgeText ? 1 : 0,
        conversationCount: 0,
      };

      await createOrUpdatePortrait(newPortrait);

      // Save initial primary record from uploaded knowledge if present
      if (knowledgeText.trim()) {
        await addMemory({
          portraitId,
          title: `Primary Dossier & Documents: ${name}`,
          content: knowledgeText,
          type: 'document',
          dateOrEra: historicalPeriod,
          sourceOrigin: 'Inscribed during portrait creation',
          tags: ['initial_dossier', profession.toLowerCase()],
        });
      }

      setActivePortraitId(portraitId);
      setActiveTab('gallery');
    } catch (err: any) {
      setErrorMessage(`Failed to inscribe portrait: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#232533] pb-6">
        <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Guided Inscription Workflow</span>
        </div>
        <h2 className="text-3xl font-bold font-serif-title gold-gradient-text">
          Inscribe New Portrait
        </h2>
        <p className="text-sm text-[#9c9fae]">
          Guided 5-step process: Upload photograph, record details, run Ollama visual analysis, ingest primary documents, and synthesize cognitive simulation.
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mt-6 max-w-2xl">
          {[
            { num: 1, label: 'Photograph' },
            { num: 2, label: 'Details' },
            { num: 3, label: 'Vision AI' },
            { num: 4, label: 'Knowledge' },
            { num: 5, label: 'Personality' },
          ].map((step) => (
            <div key={step.num} className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === step.num
                    ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20 scale-110'
                    : currentStep > step.num
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#181a24] text-[#636677] border border-[#262838]'
                }`}
              >
                {currentStep > step.num ? <CheckCircle className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  currentStep === step.num ? 'text-[#f5e4be] font-semibold' : 'text-[#636677]'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Photograph Upload */}
      {currentStep === 1 && (
        <div className="bg-[#14151e] p-6 rounded-2xl border border-[#232533] space-y-6">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <ImageIcon className="w-4 h-4 text-[#d4af37]" />
            <span>Step 1: Upload Archival Photograph or Painting</span>
          </div>

          {!imageBase64 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2b2d3e] hover:border-[#d4af37]/60 rounded-xl p-12 text-center cursor-pointer transition-colors bg-[#0e0f15]/60 hover:bg-[#141622] space-y-3"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-[#1b1d2a] border border-[#2b2d3e] flex items-center justify-center text-[#d4af37]">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#f5e4be]">
                Drag and drop your historical portrait here, or click to browse
              </p>
              <p className="text-xs text-[#7c7f91]">
                Supports JPG, JPEG, PNG, WEBP. Optimized automatically inside browser memory.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files && handleImageSelected(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-[#0e0f15] border border-[#222432]">
              <div className="w-40 h-52 rounded-lg portrait-antique-frame overflow-hidden bg-black shrink-0">
                <img
                  src={imageBase64}
                  alt="Portrait Preview"
                  className="w-full h-full object-cover object-top filter sepia-[0.15]"
                />
              </div>

              <div className="space-y-3 text-xs text-[#a0a3b3] flex-1">
                <div>
                  <span className="font-semibold text-[#f5e4be] block">File Name:</span>
                  <span>{imageFile?.name || 'Inscribed Archival Portrait'}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#f5e4be] block">Dimensions:</span>
                  <span className="font-code text-[#d4af37]">
                    {imageDimensions?.width} × {imageDimensions?.height} px
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-[#f5e4be] block">File Size:</span>
                  <span className="font-code text-[#d4af37]">
                    {(imageFileSize / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    onClick={() => {
                      setImageBase64('');
                      setImageFile(null);
                    }}
                    className="px-3 py-1.5 bg-[#1f212e] hover:bg-rose-950/40 text-rose-300 border border-[#2b2d3d] rounded text-xs flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Replace Photograph</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[#1f212e]">
            <button
              disabled={!imageBase64}
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] disabled:opacity-40 disabled:pointer-events-none text-black font-semibold text-xs rounded-lg transition-all flex items-center space-x-2"
            >
              <span>Next: Personal Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Personal Details */}
      {currentStep === 2 && (
        <div className="bg-[#14151e] p-6 rounded-2xl border border-[#232533] space-y-6">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <User className="w-4 h-4 text-[#d4af37]" />
            <span>Step 2: Subject Details & Historical Context</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[#a0a3b3] mb-1 font-medium">Full Name / Historical Title *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada Lovelace (Countess of Lovelace)"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">Birth Year *</label>
              <input
                type="text"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="e.g. 1815 or 121 AD"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">Death Year (Optional)</label>
              <input
                type="text"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                placeholder="e.g. 1852 (leave blank if living)"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">Profession / Calling *</label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. Mathematician, Computing Pioneer"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">Nationality / Origin *</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. British, Roman, Hellenistic"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#a0a3b3] mb-1 font-medium">Historical Period / Era *</label>
              <input
                type="text"
                value={historicalPeriod}
                onChange={(e) => setHistoricalPeriod(e.target.value)}
                placeholder="e.g. Victorian Era (19th Century) or Classical Antiquity"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#a0a3b3] mb-1 font-medium">Biography & Historical Summary *</label>
              <textarea
                rows={4}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Summarize key life events, principal accomplishments, philosophical views, and historical context..."
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#a0a3b3] mb-1 font-medium">Relationship Context (Optional)</label>
              <input
                type="text"
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                placeholder="e.g. Family ancestor, favorite philosopher, historical research topic"
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>

            <div>
              <label className="block text-[#a0a3b3] mb-1 font-medium">Preferred Default Simulation Mode</label>
              <select
                value={preferredMode}
                onChange={(e) => setPreferredMode(e.target.value as SimulationMode)}
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg px-3 py-2 text-xs text-[#e8e4dc] focus:outline-none focus:border-[#d4af37]/60"
              >
                <option value="historical">Historical Mode (Strict factual adherence)</option>
                <option value="memorial">Memorial Mode (Letters & personal reminiscences)</option>
                <option value="creative">Creative Dialogue (Thoughtful inspired conversation)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#1f212e]">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] text-xs font-semibold rounded-lg text-[#e8e4dc] flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              disabled={!name || !birthYear || !profession || !historicalPeriod || !biography}
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] disabled:opacity-40 disabled:pointer-events-none text-black font-semibold text-xs rounded-lg transition-all flex items-center space-x-2"
            >
              <span>Next: AI Vision Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI Vision Analysis */}
      {currentStep === 3 && (
        <div className="bg-[#14151e] p-6 rounded-2xl border border-[#232533] space-y-6">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <Eye className="w-4 h-4 text-[#d4af37]" />
            <span>Step 3: Analyze Visible Characteristics with Ollama Vision Model</span>
          </div>

          <p className="text-xs text-[#9c9fae] leading-relaxed">
            The browser will send the photograph to Ollama&apos;s active vision model (
            <code className="text-[#d4af37]">{ollamaStatus.activeVisionModel}</code>) to observe clothing, pose, accessories, background, and historical artistic style without facial recognition or personality profiling.
          </p>

          {!visionAnalysis ? (
            <div className="p-8 text-center rounded-xl bg-[#0e0f15] border border-[#222432] space-y-4">
              <Eye className="w-10 h-10 text-[#d4af37] mx-auto opacity-80" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#f5e4be]">Ready for Visual Analysis</p>
                <p className="text-xs text-[#7c7f91]">
                  Ollama Status: {ollamaStatus.state === 'connected' ? 'Online' : 'Offline (Simulated baseline available)'}
                </p>
              </div>

              <button
                disabled={isVisionAnalyzing}
                onClick={handleRunVisionAnalysis}
                className="px-6 py-2.5 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg transition-all inline-flex items-center space-x-2 shadow"
              >
                {isVisionAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Visible Characteristics...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Execute Visual Analysis</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 bg-[#0e0f15] p-5 rounded-xl border border-[#222432] text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1e28]">
                <span className="font-bold text-[#d4af37] uppercase tracking-wider">
                  Vision Analysis Findings
                </span>
                <button
                  onClick={handleRunVisionAnalysis}
                  className="text-[11px] text-[#8e7343] hover:text-[#d4af37] underline"
                >
                  Re-analyze
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#a0a3b3]">
                <div className="space-y-1">
                  <span className="font-semibold text-[#f5e4be]">Clothing & Attire:</span>
                  <input
                    type="text"
                    value={visionAnalysis.clothing}
                    onChange={(e) => setVisionAnalysis({ ...visionAnalysis, clothing: e.target.value })}
                    className="w-full bg-[#161822] border border-[#202230] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#f5e4be]">Pose & Expression:</span>
                  <input
                    type="text"
                    value={visionAnalysis.expression}
                    onChange={(e) => setVisionAnalysis({ ...visionAnalysis, expression: e.target.value })}
                    className="w-full bg-[#161822] border border-[#202230] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#f5e4be]">Accessories:</span>
                  <input
                    type="text"
                    value={visionAnalysis.accessories}
                    onChange={(e) => setVisionAnalysis({ ...visionAnalysis, accessories: e.target.value })}
                    className="w-full bg-[#161822] border border-[#202230] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#f5e4be]">Background & Setting:</span>
                  <input
                    type="text"
                    value={visionAnalysis.background}
                    onChange={(e) => setVisionAnalysis({ ...visionAnalysis, background: e.target.value })}
                    className="w-full bg-[#161822] border border-[#202230] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="font-semibold text-[#f5e4be]">Era & Medium:</span>
                  <input
                    type="text"
                    value={visionAnalysis.estimatedEraStyle}
                    onChange={(e) => setVisionAnalysis({ ...visionAnalysis, estimatedEraStyle: e.target.value })}
                    className="w-full bg-[#161822] border border-[#202230] rounded p-2 text-xs text-[#e8e4dc]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-[#1f212e]">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] text-xs font-semibold rounded-lg text-[#e8e4dc] flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg transition-all flex items-center space-x-2"
            >
              <span>Next: Knowledge Collection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Knowledge Collection & Document Upload */}
      {currentStep === 4 && (
        <div className="bg-[#14151e] p-6 rounded-2xl border border-[#232533] space-y-6">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <FileText className="w-4 h-4 text-[#d4af37]" />
            <span>Step 4: Ingest Primary Knowledge, Letters, and Documents</span>
          </div>

          <p className="text-xs text-[#9c9fae]">
            Upload letters, diaries, historical treatises, or memoirs. Supported files (PDF, DOCX, TXT, Markdown) are extracted entirely inside your browser.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => docInputRef.current?.click()}
                className="px-4 py-2 bg-[#1b1d2a] hover:bg-[#242738] border border-[#2b2d3e] text-[#f5e4be] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-2"
              >
                <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Upload Document (PDF, DOCX, TXT, MD)</span>
              </button>
              <input
                ref={docInputRef}
                type="file"
                accept=".txt,.md,.markdown,.json,.pdf,.docx"
                className="hidden"
                onChange={handleDocumentUpload}
              />

              {uploadedDocNames.length > 0 && (
                <span className="text-xs text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{uploadedDocNames.length} document(s) ingested</span>
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a0a3b3] mb-1">
                Primary Letters, Quotes, or Memoirs (Editable Text Buffer)
              </label>
              <textarea
                rows={8}
                value={knowledgeText}
                onChange={(e) => setKnowledgeText(e.target.value)}
                placeholder="Paste verbatim letters, diary entries, recorded conversations, or historical quotes..."
                className="w-full bg-[#0e0f15] border border-[#222432] rounded-lg p-3 text-xs text-[#e8e4dc] font-code focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#1f212e]">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] text-xs font-semibold rounded-lg text-[#e8e4dc] flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              disabled={isProcessing}
              onClick={handleGeneratePersonality}
              className="px-5 py-2 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-semibold text-xs rounded-lg transition-all flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Personality Profile...</span>
                </>
              ) : (
                <>
                  <span>Synthesize Simulated Personality</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Personality Simulation Review & Final Inscription */}
      {currentStep === 5 && generatedPersonality && (
        <div className="bg-[#14151e] p-6 rounded-2xl border border-[#232533] space-y-6">
          <div className="flex items-center space-x-2 text-sm font-bold font-serif-title text-[#f5e4be]">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span>Step 5: Review & Inscribe Simulated Personality</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#0e0f15] border border-[#222432] space-y-3">
              <h4 className="font-semibold text-[#f5e4be] flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Documented Historical Facts</span>
              </h4>
              <ul className="space-y-1 text-[#a0a3b3] list-disc list-inside">
                {generatedPersonality.documentedFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#0e0f15] border border-[#222432] space-y-3">
              <h4 className="font-semibold text-[#f5e4be] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>AI Interpretations of Stance & Philosophy</span>
              </h4>
              <ul className="space-y-1 text-[#a0a3b3] list-disc list-inside">
                {generatedPersonality.aiInterpretations.map((interp, i) => (
                  <li key={i}>{interp}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#0e0f15] border border-[#222432] space-y-2">
              <h4 className="font-semibold text-[#f5e4be]">Simulated Voice & Traits</h4>
              <p className="text-[#a0a3b3]">
                <strong className="text-[#f5e4be]">Tone:</strong> {generatedPersonality.traits.tone}
              </p>
              <p className="text-[#a0a3b3]">
                <strong className="text-[#f5e4be]">Formality:</strong> {generatedPersonality.traits.formality}
              </p>
              <p className="text-[#a0a3b3]">
                <strong className="text-[#f5e4be]">Handling Uncertainty:</strong> {generatedPersonality.traits.uncertaintyHandling}
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#1f212e]">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 bg-[#1b1c28] hover:bg-[#252838] text-xs font-semibold rounded-lg text-[#e8e4dc] flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              disabled={isProcessing}
              onClick={handleFinalInscription}
              className="px-6 py-2.5 bg-gradient-to-r from-[#8e7343] to-[#d4af37] hover:from-[#a0834c] hover:to-[#f3deaa] text-black font-bold text-xs rounded-lg shadow-lg transition-all flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inscribing into IndexedDB...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Inscribe Portrait into Permanent Archive</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
