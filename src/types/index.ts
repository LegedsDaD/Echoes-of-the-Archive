export type SimulationMode = 'historical' | 'memorial' | 'creative';

export interface PersonalityTraits {
  tone: string;
  formality: 'formal' | 'archaic' | 'conversational' | 'academic' | 'poetic';
  temperament: string;
  coreBeliefs: string[];
  characteristicPhrases: string[];
  uncertaintyHandling: string;
}

export interface VisionAnalysisResult {
  clothing: string;
  expression: string;
  accessories: string;
  background: string;
  estimatedEraStyle: string;
  artisticMedium: string;
  lightingAndAtmosphere: string;
  technicalNotes: string;
  analyzedAt: string;
  modelUsed: string;
}

export interface Portrait {
  id: string;
  name: string;
  birthYear: string;
  deathYear?: string;
  profession: string;
  nationality: string;
  historicalPeriod: string;
  biography: string;
  relationshipContext?: string;
  additionalNotes?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageDimensions?: { width: number; height: number };
  imageFileSize?: number;
  visionAnalysis?: VisionAnalysisResult;
  personality: {
    documentedFacts: string[];
    userMemories: string[];
    aiInterpretations: string[];
    traits: PersonalityTraits;
    systemPromptHistorical: string;
    systemPromptMemorial: string;
    systemPromptCreative: string;
  };
  preferredMode: SimulationMode;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  memoryCount?: number;
  conversationCount?: number;
}

export type MemoryType = 'letter' | 'diary' | 'biography' | 'historical_record' | 'quote' | 'note' | 'document';

export interface MemoryItem {
  id: string;
  portraitId: string;
  title: string;
  content: string;
  type: MemoryType;
  dateOrEra?: string;
  sourceOrigin?: string;
  tags: string[];
  embedding?: number[];
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  portraitId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  extractedText: string;
  chunkCount: number;
  uploadedAt: string;
  parsedAt: string;
}

export interface MessageCitation {
  memoryId: string;
  title: string;
  snippet: string;
  similarityScore?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'portrait' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  mode: SimulationMode;
  citations?: MessageCitation[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  portraitId: string;
  title: string;
  mode: SimulationMode;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageSnippet?: string;
}

export type ActivityCategory = 
  | 'ollama_connection' 
  | 'model_discovery' 
  | 'model_download' 
  | 'photograph_analysis' 
  | 'personality_creation' 
  | 'document_extraction' 
  | 'embedding_generation' 
  | 'memory_retrieval' 
  | 'chat_generation' 
  | 'local_data_storage';

export type ActivityStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ActivityTask {
  id: string;
  category: ActivityCategory;
  title: string;
  description: string;
  status: ActivityStatus;
  progressPercent?: number; // Real percentage or undefined for indeterminate
  indeterminate?: boolean;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: OllamaModelDetails;
  isVisionCapable?: boolean;
  isEmbeddingCapable?: boolean;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'cors_blocked' | 'error';

export interface OllamaStatus {
  state: ConnectionState;
  version?: string;
  endpoint: string;
  lastChecked: string;
  errorMessage?: string;
  installedModels: OllamaModel[];
  activeVisionModel: string;
  activeConversationModel: string;
  activeEmbeddingModel: string;
}

export interface AppSettings {
  ollamaEndpoint: string;
  preferredVisionModel: string;
  preferredConversationModel: string;
  preferredEmbeddingModel: string;
  temperature: number;
  contextWindow: number;
  maxTokens: number;
  timeoutSeconds: number;
  theme: 'antique-dark' | 'archival-sepia' | 'museum-noir';
  accentColor: 'gold' | 'bronze' | 'burgundy';
  enableAnimations: boolean;
  density: 'comfortable' | 'compact';
}

export interface StorageStats {
  usageBytes: number;
  quotaBytes: number;
  portraitsCount: number;
  memoriesCount: number;
  conversationsCount: number;
  messagesCount: number;
  documentsCount: number;
}
