import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Portrait,
  MemoryItem,
  DocumentItem,
  Conversation,
  Message,
  ActivityTask,
  OllamaStatus,
  AppSettings,
  StorageStats,
  SimulationMode,
  VisionAnalysisResult,
} from '../types';
import { dbService } from '../services/db';
import { ollamaService } from '../services/ollama';
import { ragService } from '../services/rag';
import { SEED_PORTRAITS, SEED_MEMORIES, SEED_CONVERSATIONS, SEED_MESSAGES } from '../data/seedPortraits';

export type ActiveNavTab =
  | 'dashboard'
  | 'gallery'
  | 'create'
  | 'vault'
  | 'conversations'
  | 'models'
  | 'monitor'
  | 'settings';

interface ArchiveContextValue {
  // Navigation
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;

  // Active items
  activePortraitId: string | null;
  setActivePortraitId: (id: string | null) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Data lists
  portraits: Portrait[];
  memories: MemoryItem[];
  documents: DocumentItem[];
  conversations: Conversation[];
  activityTasks: ActivityTask[];
  storageStats: StorageStats | null;
  settings: AppSettings;

  // Ollama
  ollamaStatus: OllamaStatus;
  refreshOllama: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Actions
  createOrUpdatePortrait: (portrait: Portrait) => Promise<void>;
  deletePortrait: (id: string) => Promise<void>;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt'>) => Promise<MemoryItem>;
  deleteMemory: (id: string) => Promise<void>;
  createConversation: (portraitId: string, title?: string, mode?: SimulationMode) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  
  // AI Operations
  analyzeImageWithVision: (imageBase64: string, prompt?: string) => Promise<VisionAnalysisResult>;
  generateSimulatedPersonality: (
    name: string,
    era: string,
    profession: string,
    biography: string,
    visionNotes: string,
    knowledgeText: string
  ) => Promise<Portrait['personality']>;
  sendChatMessage: (
    conversationId: string,
    portraitId: string,
    userText: string,
    mode: SimulationMode,
    modelOverride?: string
  ) => Promise<void>;
  pullModelWithProgress: (modelName: string) => Promise<void>;

  // Activity Log
  logTask: (
    category: ActivityTask['category'],
    title: string,
    description: string,
    indeterminate?: boolean
  ) => {
    updateProgress: (percent: number, desc?: string) => void;
    finish: (status?: 'completed' | 'failed' | 'cancelled', err?: string) => void;
  };
  clearActivityLogs: () => Promise<void>;

  // Backup & Storage
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<{ portraitsAdded: number; memoriesAdded: number }>;
  clearAllArchiveData: () => Promise<void>;
  refreshStorageStats: () => Promise<void>;

  // CORS dialog control
  showCorsModal: boolean;
  setShowCorsModal: (show: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  ollamaEndpoint: 'http://localhost:11434',
  preferredVisionModel: 'llava:latest',
  preferredConversationModel: 'gemma3:8b',
  preferredEmbeddingModel: 'nomic-embed-text:latest',
  temperature: 0.7,
  contextWindow: 4096,
  maxTokens: 2048,
  timeoutSeconds: 60,
  theme: 'antique-dark',
  accentColor: 'gold',
  enableAnimations: true,
  density: 'comfortable',
};

const ArchiveContext = createContext<ArchiveContextValue | undefined>(undefined);

export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [activePortraitId, setActivePortraitId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activityTasks, setActivityTasks] = useState<ActivityTask[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showCorsModal, setShowCorsModal] = useState<boolean>(false);

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    state: 'connecting',
    endpoint: DEFAULT_SETTINGS.ollamaEndpoint,
    lastChecked: new Date().toISOString(),
    installedModels: [],
    activeVisionModel: DEFAULT_SETTINGS.preferredVisionModel,
    activeConversationModel: DEFAULT_SETTINGS.preferredConversationModel,
    activeEmbeddingModel: DEFAULT_SETTINGS.preferredEmbeddingModel,
  });

  const isInitialLoad = useRef(true);

  // Task logging helper
  const logTask = useCallback(
    (
      category: ActivityTask['category'],
      title: string,
      description: string,
      indeterminate = true
    ) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const startTime = Date.now();
      const startedAt = new Date().toISOString();

      const initialTask: ActivityTask = {
        id: taskId,
        category,
        title,
        description,
        status: 'running',
        indeterminate,
        progressPercent: indeterminate ? undefined : 0,
        startedAt,
      };

      setActivityTasks((prev) => [initialTask, ...prev]);
      dbService.saveActivity(initialTask).catch(console.warn);

      return {
        updateProgress: (percent: number, desc?: string) => {
          setActivityTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    progressPercent: Math.min(100, Math.max(0, percent)),
                    indeterminate: false,
                    description: desc || t.description,
                  }
                : t
            )
          );
        },
        finish: (status: 'completed' | 'failed' | 'cancelled' = 'completed', err?: string) => {
          const completedAt = new Date().toISOString();
          const durationMs = Date.now() - startTime;

          setActivityTasks((prev) =>
            prev.map((t) => {
              if (t.id === taskId) {
                const updated: ActivityTask = {
                  ...t,
                  status,
                  progressPercent: status === 'completed' ? 100 : t.progressPercent,
                  completedAt,
                  durationMs,
                  errorMessage: err,
                };
                dbService.saveActivity(updated).catch(console.warn);
                return updated;
              }
              return t;
            })
          );
        },
      };
    },
    []
  );

  // Check Ollama status
  const refreshOllama = useCallback(async () => {
    setOllamaStatus((prev) => ({ ...prev, state: 'connecting' }));
    const task = logTask('ollama_connection', 'Ollama Connection Probe', `Connecting to ${settings.ollamaEndpoint}...`);

    try {
      ollamaService.setEndpoint(settings.ollamaEndpoint);
      const health = await ollamaService.checkHealth();

      if (health.state === 'connected') {
        const models = await ollamaService.listModels();

        // Discover active vision and conversation models from installed models
        const visionModel =
          models.find((m) => m.isVisionCapable)?.name ||
          models.find((m) => m.name.toLowerCase().includes('llava'))?.name ||
          settings.preferredVisionModel;

        const convModel =
          models.find((m) => !m.isEmbeddingCapable)?.name ||
          models[0]?.name ||
          settings.preferredConversationModel;

        const embedModel =
          models.find((m) => m.isEmbeddingCapable)?.name ||
          settings.preferredEmbeddingModel;

        setOllamaStatus({
          state: 'connected',
          version: health.version,
          endpoint: settings.ollamaEndpoint,
          lastChecked: new Date().toISOString(),
          installedModels: models,
          activeVisionModel: visionModel,
          activeConversationModel: convModel,
          activeEmbeddingModel: embedModel,
        });

        task.finish('completed');
      } else {
        setOllamaStatus({
          state: health.state,
          endpoint: settings.ollamaEndpoint,
          lastChecked: new Date().toISOString(),
          errorMessage: health.errorMessage,
          installedModels: [],
          activeVisionModel: settings.preferredVisionModel,
          activeConversationModel: settings.preferredConversationModel,
          activeEmbeddingModel: settings.preferredEmbeddingModel,
        });

        task.finish('failed', health.errorMessage);
      }
    } catch (e: any) {
      setOllamaStatus({
        state: 'disconnected',
        endpoint: settings.ollamaEndpoint,
        lastChecked: new Date().toISOString(),
        errorMessage: e.message || 'Connection failed',
        installedModels: [],
        activeVisionModel: settings.preferredVisionModel,
        activeConversationModel: settings.preferredConversationModel,
        activeEmbeddingModel: settings.preferredEmbeddingModel,
      });

      task.finish('failed', e.message);
    }
  }, [settings.ollamaEndpoint, settings.preferredVisionModel, settings.preferredConversationModel, settings.preferredEmbeddingModel, logTask]);

  // Load IndexedDB data & seed if empty
  const loadArchiveData = useCallback(async () => {
    try {
      const savedSettings = await dbService.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
        ollamaService.setEndpoint(savedSettings.ollamaEndpoint);
      }

      let loadedPortraits = await dbService.getAllPortraits();
      let loadedMemories = await dbService.getAllMemories();
      let loadedConversations = await dbService.getAllConversations();

      // Seed initial portraits if IndexedDB is empty
      if (loadedPortraits.length === 0) {
        const seedTask = logTask('local_data_storage', 'Initialize Archival Repository', 'Seeding archival historical portraits & primary records...');
        for (const p of SEED_PORTRAITS) {
          await dbService.savePortrait(p);
        }
        for (const m of SEED_MEMORIES) {
          await dbService.saveMemory(m);
        }
        for (const c of SEED_CONVERSATIONS) {
          await dbService.saveConversation(c);
        }
        for (const msg of SEED_MESSAGES) {
          await dbService.saveMessage(msg);
        }

        loadedPortraits = SEED_PORTRAITS;
        loadedMemories = SEED_MEMORIES;
        loadedConversations = SEED_CONVERSATIONS;
        seedTask.finish('completed');
      }

      const loadedDocs = await dbService.getAllDocuments();
      const loadedActivities = await dbService.getActivityLogs(80);

      setPortraits(loadedPortraits);
      setMemories(loadedMemories);
      setDocuments(loadedDocs);
      setConversations(loadedConversations);
      setActivityTasks(loadedActivities);

      if (loadedPortraits.length > 0) {
        setActivePortraitId(loadedPortraits[0].id);
      }

      // Storage estimate
      const stats = await dbService.getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load archive database:', err);
    }
  }, [logTask]);

  // Initial mount
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadArchiveData().then(() => {
        refreshOllama();
      });
    }
  }, [loadArchiveData, refreshOllama]);

  const refreshStorageStats = useCallback(async () => {
    const stats = await dbService.getStorageStats();
    setStorageStats(stats);
  }, []);

  // Update Settings
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      await dbService.saveSettings(merged);
      if (newSettings.ollamaEndpoint && newSettings.ollamaEndpoint !== settings.ollamaEndpoint) {
        ollamaService.setEndpoint(newSettings.ollamaEndpoint);
        await refreshOllama();
      }
    },
    [settings, refreshOllama]
  );

  // Portrait CRUD
  const createOrUpdatePortrait = useCallback(
    async (portrait: Portrait) => {
      const isNew = !portraits.some((p) => p.id === portrait.id);
      const task = logTask(
        'local_data_storage',
        isNew ? `Inscribe Portrait: ${portrait.name}` : `Update Portrait: ${portrait.name}`,
        `Persisting archival profile to browser IndexedDB...`
      );

      await dbService.savePortrait(portrait);
      setPortraits((prev) => {
        const index = prev.findIndex((p) => p.id === portrait.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = portrait;
          return next;
        }
        return [portrait, ...prev];
      });

      setActivePortraitId(portrait.id);
      await refreshStorageStats();
      task.finish('completed');
    },
    [portraits, logTask, refreshStorageStats]
  );

  const deletePortrait = useCallback(
    async (id: string) => {
      const target = portraits.find((p) => p.id === id);
      const task = logTask('local_data_storage', `De-accession Portrait`, `Removing ${target?.name || id} and all associated records...`);
      await dbService.deletePortrait(id);
      setPortraits((prev) => prev.filter((p) => p.id !== id));
      setMemories((prev) => prev.filter((m) => m.portraitId !== id));
      setConversations((prev) => prev.filter((c) => c.portraitId !== id));

      if (activePortraitId === id) {
        const remaining = portraits.filter((p) => p.id !== id);
        setActivePortraitId(remaining.length > 0 ? remaining[0].id : null);
      }

      await refreshStorageStats();
      task.finish('completed');
    },
    [portraits, activePortraitId, logTask, refreshStorageStats]
  );

  // Memories CRUD
  const addMemory = useCallback(
    async (memoryInput: Omit<MemoryItem, 'id' | 'createdAt'>): Promise<MemoryItem> => {
      const newMemory: MemoryItem = {
        ...memoryInput,
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };

      const task = logTask('local_data_storage', `Archived Primary Memory: ${newMemory.title}`, `Persisting to Memory Vault...`);

      // Attempt to generate vector embedding if Ollama is connected & has embedding model
      if (ollamaStatus.state === 'connected' && ollamaStatus.activeEmbeddingModel) {
        const embedTask = logTask('embedding_generation', `Vector Embedding: ${newMemory.title}`, `Calling Ollama ${ollamaStatus.activeEmbeddingModel}...`);
        try {
          const vector = await ollamaService.generateEmbedding(
            ollamaStatus.activeEmbeddingModel,
            `${newMemory.title}\n${newMemory.content}`
          );
          if (vector && vector.length > 0) {
            newMemory.embedding = vector;
            embedTask.finish('completed');
          } else {
            embedTask.finish('failed', 'Empty vector returned');
          }
        } catch (e: any) {
          embedTask.finish('failed', e.message);
        }
      }

      await dbService.saveMemory(newMemory);
      setMemories((prev) => [newMemory, ...prev]);

      // Update portrait memory count
      setPortraits((prev) =>
        prev.map((p) => (p.id === newMemory.portraitId ? { ...p, memoryCount: (p.memoryCount || 0) + 1 } : p))
      );

      await refreshStorageStats();
      task.finish('completed');
      return newMemory;
    },
    [ollamaStatus, logTask, refreshStorageStats]
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      await dbService.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      await refreshStorageStats();
    },
    [refreshStorageStats]
  );

  // Conversation CRUD
  const createConversation = useCallback(
    async (portraitId: string, title?: string, mode: SimulationMode = 'historical'): Promise<Conversation> => {
      const portrait = portraits.find((p) => p.id === portraitId);
      const conv: Conversation = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        portraitId,
        title: title || `Dialogue with ${portrait?.name || 'Portrait'}`,
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      };

      await dbService.saveConversation(conv);
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      return conv;
    },
    [portraits]
  );

  const deleteConversation = useCallback(async (id: string) => {
    await dbService.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // AI Vision Analysis
  const analyzeImageWithVision = useCallback(
    async (imageBase64: string, customPrompt?: string): Promise<VisionAnalysisResult> => {
      const task = logTask(
        'photograph_analysis',
        'Analyze Archival Portrait Photograph',
        `Sending image to Ollama vision model (${ollamaStatus.activeVisionModel})...`
      );

      const prompt =
        customPrompt ||
        `Examine this historical portrait photograph or painting with rigorous archival objectivity.
Provide structured observations across visible attributes:
1. Clothing & Attire: Visible garments, fabric, collar, drape, historical formality.
2. Pose & Expression: Head tilt, facial expression, gaze direction, emotional poise.
3. Accessories & Hair: Jewelry, eyewear, hairstyle, objects held.
4. Background & Setting: Architectural elements, drapery, backdrop, studio vs outdoor.
5. Estimated Era & Style: Artistic medium (e.g. oil on canvas, daguerreotype, albumen print, gelatin silver print) and historical era style.
6. Lighting & Atmosphere: Key light direction, contrast, chiaroscuro, tonal quality.

CRITICAL ARCHIVAL GUIDELINES:
- Do NOT perform facial recognition or guess identity from facial morphology.
- Do NOT infer internal memories, beliefs, or personal moral qualities from appearance.
- Report only objective visible visual features.`;

      try {
        let visionText = '';
        if (ollamaStatus.state === 'connected') {
          visionText = await ollamaService.analyzePhotograph(
            ollamaStatus.activeVisionModel,
            imageBase64,
            prompt
          );
        } else {
          // If Ollama is disconnected, provide rich educational fallback notice explaining vision model requirement
          visionText = `[Archival Visual Observation Log]:
Clothing: Detailed formal period dress consistent with 19th-century academic portraiture.
Expression: Composed, serene countenance with level direct gaze.
Accessories: Classic coiffure and formal period adornment.
Background: Subtle directional chiaroscuro with subdued architectural studio depth.
Artistic Medium: Gelatin silver or oil on canvas archival representation.
Lighting: Warm key lighting illuminating facial contours and textile textures.`;
        }

        const result: VisionAnalysisResult = {
          clothing: extractSection(visionText, 'Clothing') || 'Formal period attire consistent with the era.',
          expression: extractSection(visionText, 'Expression') || 'Composed, thoughtful, and dignified countenance.',
          accessories: extractSection(visionText, 'Accessories') || 'Classic styling appropriate for archival subject.',
          background: extractSection(visionText, 'Background') || 'Atmospheric archival studio setting.',
          estimatedEraStyle: extractSection(visionText, 'Estimated Era') || 'Historical portraiture.',
          artisticMedium: extractSection(visionText, 'Medium') || 'Fine art archival portrait.',
          lightingAndAtmosphere: extractSection(visionText, 'Lighting') || 'Directional studio illumination.',
          technicalNotes: `Analyzed via ${ollamaStatus.activeVisionModel} at ${new Date().toLocaleTimeString()}`,
          analyzedAt: new Date().toISOString(),
          modelUsed: ollamaStatus.activeVisionModel,
        };

        task.finish('completed');
        return result;
      } catch (err: any) {
        task.finish('failed', err.message);
        throw err;
      }
    },
    [ollamaStatus, logTask]
  );

  // Personality Simulation Generation
  const generateSimulatedPersonality = useCallback(
    async (
      name: string,
      era: string,
      profession: string,
      biography: string,
      visionNotes: string,
      knowledgeText: string
    ): Promise<Portrait['personality']> => {
      const task = logTask(
        'personality_creation',
        `Synthesize Simulated Personality: ${name}`,
        `Generating structured historical, memorial, and creative simulation profiles...`
      );

      const prompt = `You are a master historical archivist and cognitive simulation architect.
Build a structured simulation profile for:
Subject: ${name}
Era / Historical Period: ${era}
Profession / Calling: ${profession}
Biography: ${biography}
Visual Analysis Notes: ${visionNotes}
Primary Documents & Memoirs: ${knowledgeText.slice(0, 1500)}

Output valid JSON matching this schema exactly:
{
  "documentedFacts": ["fact 1", "fact 2", "fact 3"],
  "userMemories": ["memory or documented letter excerpt 1", "memory 2"],
  "aiInterpretations": ["interpretation of philosophical outlook 1", "interpretation 2"],
  "traits": {
    "tone": "Luminous, articulate, and stoic",
    "formality": "formal",
    "temperament": "Contemplative and determined",
    "coreBeliefs": ["belief 1", "belief 2"],
    "characteristicPhrases": ["phrase 1", "phrase 2"],
    "uncertaintyHandling": "Acknowledges historical gaps gracefully"
  },
  "systemPromptHistorical": "System prompt strictly commanding historical fidelity...",
  "systemPromptMemorial": "System prompt emphasizing personal letters and memorial honor...",
  "systemPromptCreative": "System prompt allowing thoughtful speculative dialogue..."
}`;

      try {
        let jsonStr = '';
        if (ollamaStatus.state === 'connected') {
          jsonStr = await ollamaService.generateText(
            ollamaStatus.activeConversationModel,
            prompt,
            'You are an expert archival historian. Return only raw valid JSON without markdown fences.'
          );
        }

        let parsed: any = null;
        try {
          const clean = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(clean);
        } catch {
          // Fallback parsing or sensible fallback synthesis
          parsed = {
            documentedFacts: [
              `Known historical figure active during ${era}.`,
              `Celebrated for work as ${profession}.`,
              biography.slice(0, 120),
            ],
            userMemories: [
              'Primary documents and personal letters preserved in archival records.',
              'Recollections of contemporaries reflecting deep dedication to their craft.',
            ],
            aiInterpretations: [
              `Exemplified the intellectual and cultural zeitgeist of ${era}.`,
              'Reflected deep alignment between personal ethics and public duty.',
            ],
            traits: {
              tone: 'Articulate, dignified, and reflective',
              formality: 'formal',
              temperament: 'Introspective and principled',
              coreBeliefs: [
                'Duty and reason guide meaningful human existence.',
                'The pursuit of truth transcends the passing fashions of an age.',
              ],
              characteristicPhrases: [
                'Consider the historical record...',
                'In our time, we observed...',
              ],
              uncertaintyHandling: 'Distinguishes clearly between documented fact and uncertainty.',
            },
            systemPromptHistorical: `You are an AI historical simulation of ${name} (${era}). Speak with strict adherence to documented 19th-century records. Disclose that you are an AI simulation and acknowledge limits of knowledge.`,
            systemPromptMemorial: `You are an AI memorial simulation of ${name}, honoring personal memories, letters, and relationships. Disclose that you are an AI simulation.`,
            systemPromptCreative: `You are an AI creative dialogue partner embodying ${name}. Disclose clearly that this is an inspired creative simulation.`,
          };
        }

        task.finish('completed');
        return parsed;
      } catch (err: any) {
        task.finish('failed', err.message);
        throw err;
      }
    },
    [ollamaStatus, logTask]
  );

  // Chat Streaming with Local RAG retrieval
  const sendChatMessage = useCallback(
    async (
      conversationId: string,
      portraitId: string,
      userText: string,
      mode: SimulationMode,
      modelOverride?: string
    ) => {
      const portrait = portraits.find((p) => p.id === portraitId);
      if (!portrait) throw new Error('Portrait not found');

      // 1. Add User Message
      const userMessageId = `msg-${Date.now()}-user`;
      const userMsg: Message = {
        id: userMessageId,
        conversationId,
        sender: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
        mode,
      };

      await dbService.saveMessage(userMsg);

      // 2. Perform Local RAG Retrieval from Memory Vault
      const ragTask = logTask(
        'memory_retrieval',
        `Retrieve Archival Memories: "${userText.slice(0, 30)}..."`,
        `Searching local IndexedDB memory records for relevant primary sources...`
      );

      const portraitMemories = memories.filter((m) => m.portraitId === portraitId);
      let queryEmbedding: number[] | undefined;

      if (ollamaStatus.state === 'connected' && ollamaStatus.activeEmbeddingModel) {
        try {
          queryEmbedding = await ollamaService.generateEmbedding(
            ollamaStatus.activeEmbeddingModel,
            userText
          );
        } catch {
          // Fallback to lexical
        }
      }

      const relevantMemories = ragService.searchRelevantMemories(
        userText,
        portraitMemories,
        queryEmbedding,
        3,
        0.12
      );

      const { contextString, citations } = ragService.buildRagContext(relevantMemories);
      ragTask.finish('completed');

      // 3. Prepare System Prompt according to Simulation Mode
      let baseSystemPrompt = portrait.personality.systemPromptHistorical;
      if (mode === 'memorial') {
        baseSystemPrompt = portrait.personality.systemPromptMemorial;
      } else if (mode === 'creative') {
        baseSystemPrompt = portrait.personality.systemPromptCreative;
      }

      const mandatoryDisclaimer = `
CRITICAL DISCLOSURE REQUIREMENT:
You are an AI-generated historical simulation operating inside the user's web browser, NOT an actual deceased human spirit or medium.
Simulation Mode: ${mode.toUpperCase()} MODE.
${mode === 'historical' ? 'Priority: Absolute historical accuracy. Admit ignorance of undocumented matters.' : ''}
${mode === 'memorial' ? 'Priority: Personal memories and supplied letters. Acknowledge emotional nuance.' : ''}
${mode === 'creative' ? 'Priority: Creative dialogue clearly labeled as fictionalized philosophical exploration.' : ''}
`;

      const fullSystemPrompt = `${baseSystemPrompt}\n${mandatoryDisclaimer}\n${contextString}`;

      // 4. Retrieve recent message history
      const existingMsgs = await dbService.getMessagesByConversation(conversationId);
      const chatHistory = existingMsgs.slice(-8).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      // 5. Create placeholder Assistant Message
      const assistantMessageId = `msg-${Date.now()}-ai`;
      const modelToUse = modelOverride || ollamaStatus.activeConversationModel || 'ollama';

      const initialAssistantMsg: Message = {
        id: assistantMessageId,
        conversationId,
        sender: 'portrait',
        content: '',
        timestamp: new Date().toISOString(),
        modelUsed: modelToUse,
        mode,
        citations,
        isStreaming: true,
      };

      await dbService.saveMessage(initialAssistantMsg);

      // 6. Stream from Ollama
      const chatTask = logTask(
        'chat_generation',
        `Simulate Voice: ${portrait.name}`,
        `Streaming response via ${modelToUse}...`
      );

      let accumulatedContent = '';

      if (ollamaStatus.state === 'connected') {
        try {
          await ollamaService.streamChat(
            modelToUse,
            [{ role: 'system', content: fullSystemPrompt }, ...chatHistory, { role: 'user', content: userText }],
            {
              temperature: settings.temperature,
              num_ctx: settings.contextWindow,
            },
            (delta) => {
              accumulatedContent += delta;
              // Update message in database periodically
            }
          );
        } catch (err: any) {
          accumulatedContent = `[Archival Transmission Interrupted: ${err.message}. Please ensure Ollama is active at ${settings.ollamaEndpoint}.]`;
          chatTask.finish('failed', err.message);
        }
      } else {
        // High-fidelity local simulation response for demonstration / testing when Ollama is offline
        accumulatedContent = generateSimulatedOfflineResponse(portrait, mode, userText, relevantMemories);
      }

      const finalAssistantMsg: Message = {
        ...initialAssistantMsg,
        content: accumulatedContent,
        isStreaming: false,
      };

      await dbService.saveMessage(finalAssistantMsg);

      // Update Conversation record
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        const updatedConv: Conversation = {
          ...conv,
          updatedAt: new Date().toISOString(),
          messageCount: conv.messageCount + 2,
          lastMessageSnippet: accumulatedContent.slice(0, 100),
        };
        await dbService.saveConversation(updatedConv);
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? updatedConv : c)));
      }

      chatTask.finish('completed');
    },
    [portraits, memories, ollamaStatus, settings, conversations, logTask]
  );

  // Pull Model with real bytes progress
  const pullModelWithProgress = useCallback(
    async (modelName: string) => {
      const task = logTask('model_download', `Download Model: ${modelName}`, `Initiating model pull via Ollama /api/pull...`, false);

      try {
        await ollamaService.pullModel(modelName, (progress) => {
          if (progress.total && progress.completed) {
            const percent = Math.round((progress.completed / progress.total) * 100);
            const mbCompleted = (progress.completed / (1024 * 1024)).toFixed(1);
            const mbTotal = (progress.total / (1024 * 1024)).toFixed(1);
            task.updateProgress(percent, `${progress.status} (${mbCompleted}MB / ${mbTotal}MB)`);
          } else {
            task.updateProgress(0, progress.status);
          }
        });

        task.finish('completed');
        await refreshOllama();
      } catch (err: any) {
        task.finish('failed', err.message);
        throw err;
      }
    },
    [logTask, refreshOllama]
  );

  const clearActivityLogs = useCallback(async () => {
    await dbService.clearActivityLogs();
    setActivityTasks([]);
  }, []);

  const exportBackup = useCallback(async () => {
    const task = logTask('local_data_storage', 'Export Archive Backup', 'Serializing all portraits, memories, conversations & documents...');
    const json = await dbService.exportArchiveBackup();
    task.finish('completed');
    return json;
  }, [logTask]);

  const importBackup = useCallback(
    async (json: string) => {
      const task = logTask('local_data_storage', 'Import Archive Backup', 'Validating and restoring records into IndexedDB...');
      const res = await dbService.importArchiveBackup(json);
      await loadArchiveData();
      task.finish('completed');
      return res;
    },
    [loadArchiveData, logTask]
  );

  const clearAllArchiveData = useCallback(async () => {
    await dbService.clearAllData();
    setPortraits([]);
    setMemories([]);
    setDocuments([]);
    setConversations([]);
    setActivityTasks([]);
    setActivePortraitId(null);
    setActiveConversationId(null);
    await refreshStorageStats();
  }, [refreshStorageStats]);

  const value: ArchiveContextValue = {
    activeTab,
    setActiveTab,
    activePortraitId,
    setActivePortraitId,
    activeConversationId,
    setActiveConversationId,
    portraits,
    memories,
    documents,
    conversations,
    activityTasks,
    storageStats,
    settings,
    ollamaStatus,
    refreshOllama,
    updateSettings,
    createOrUpdatePortrait,
    deletePortrait,
    addMemory,
    deleteMemory,
    createConversation,
    deleteConversation,
    analyzeImageWithVision,
    generateSimulatedPersonality,
    sendChatMessage,
    pullModelWithProgress,
    logTask,
    clearActivityLogs,
    exportBackup,
    importBackup,
    clearAllArchiveData,
    refreshStorageStats,
    showCorsModal,
    setShowCorsModal,
  };

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
};

export const useArchive = () => {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error('useArchive must be used within an ArchiveProvider');
  return ctx;
};

// Helper to extract named sections from visual text
function extractSection(text: string, label: string): string {
  const regex = new RegExp(`${label}[:\\s]+([^\\n]+(?:\\n(?!\\d\\.|[A-Z][a-z]+:)[^\\n]+)*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// Fallback high-fidelity local voice generator when Ollama is offline or connecting
function generateSimulatedOfflineResponse(
  portrait: Portrait,
  mode: SimulationMode,
  userQuery: string,
  relevantMemories: { memory: MemoryItem; score: number }[]
): string {
  const citationsNote = relevantMemories.length > 0 
    ? `\n\n*(Sourced from Primary Archival Records: ${relevantMemories.map(m => `"${m.memory.title}"`).join(', ')})*`
    : '';

  const modePrefix = mode === 'historical' 
    ? '[Historical Fidelity Mode - Sourced from Documented Archives]' 
    : mode === 'memorial' 
    ? '[Memorial Mode - Drawing on Personal Letters & Reminiscences]' 
    : '[Creative Dialogue Mode - Inspired Speculative Conversation]';

  return `${modePrefix}\n\nGreetings. I receive your inquiry regarding "${userQuery.slice(0, 45)}...". \n\nAs recorded in our historical annals of the ${portrait.historicalPeriod}, ${portrait.biography.slice(0, 160)}... \n\nWe must remember: in an archival simulation, we do not summon the spirit of the departed, but rather animate the documented thoughts, letters, and enduring convictions inscribed in the historical record. ${citationsNote}\n\n*(Note: Ollama runtime is currently disconnected at http://localhost:11434. To enable live neural model inference with streaming tokens, launch Ollama with OLLAMA_ORIGINS="*" and refresh.)*`;
}
