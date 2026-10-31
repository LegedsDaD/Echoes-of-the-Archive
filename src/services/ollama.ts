import { OllamaModel, ConnectionState } from '../types';

export interface OllamaChatChunk {
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export class OllamaService {
  private endpoint: string = 'http://localhost:11434';

  constructor(customEndpoint?: string) {
    if (customEndpoint) {
      this.endpoint = customEndpoint.replace(/\/+$/, '');
    }
  }

  public setEndpoint(url: string) {
    this.endpoint = url.replace(/\/+$/, '');
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Health and version checks
   */
  async checkHealth(): Promise<{ state: ConnectionState; version?: string; errorMessage?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.endpoint}/api/version`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          state: 'error',
          errorMessage: `Ollama returned HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        state: 'connected',
        version: data.version || '0.1.x',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          state: 'disconnected',
          errorMessage: `Connection timed out trying to reach ${this.endpoint}. Ensure Ollama is running.`,
        };
      }

      // Check if it's likely a CORS / Network failure
      const isCorsOrNetwork = err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      if (isCorsOrNetwork) {
        return {
          state: 'cors_blocked',
          errorMessage: `Browser could not connect to ${this.endpoint}. Either Ollama is not started, or CORS is blocking browser requests. Start Ollama with OLLAMA_ORIGINS="*" environment variable.`,
        };
      }

      return {
        state: 'disconnected',
        errorMessage: err.message || 'Unable to connect to Ollama runtime.',
      };
    }
  }

  /**
   * Model discovery
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawModels: any[] = data.models || [];

      return rawModels.map((m) => {
        const nameLower = (m.name || '').toLowerCase();
        const familyLower = (m.details?.family || '').toLowerCase();
        
        // Detect vision capability from model names and families
        const isVision = 
          nameLower.includes('llava') ||
          nameLower.includes('vision') ||
          nameLower.includes('vl') ||
          nameLower.includes('gemma3') ||
          nameLower.includes('gemma-3') ||
          nameLower.includes('bakllava') ||
          nameLower.includes('minicpm-v') ||
          nameLower.includes('cogvlm') ||
          familyLower.includes('clip') ||
          familyLower.includes('mllama');

        // Detect embedding capability
        const isEmbedding =
          nameLower.includes('embed') ||
          nameLower.includes('nomic') ||
          nameLower.includes('bge') ||
          nameLower.includes('all-minilm') ||
          nameLower.includes('mxbai');

        return {
          name: m.name,
          model: m.model || m.name,
          modified_at: m.modified_at || new Date().toISOString(),
          size: m.size || 0,
          digest: m.digest || '',
          details: m.details || {},
          isVisionCapable: isVision,
          isEmbeddingCapable: isEmbedding,
        };
      });
    } catch (err: any) {
      console.warn('Ollama listModels error:', err);
      return [];
    }
  }

  /**
   * Model information
   */
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.endpoint}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.warn('Error fetching model info:', err);
      return null;
    }
  }

  /**
   * Pull model with streaming progress
   */
  async pullModel(
    modelName: string,
    onProgress: (progress: OllamaPullProgress) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await fetch(`${this.endpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to pull model '${modelName}': HTTP ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on pull response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as OllamaPullProgress;
          onProgress(parsed);
        } catch {
          // Ignore incomplete JSON chunks
        }
      }
    }
  }

  /**
   * Vision photograph analysis via /api/generate with image base64
   */
  async analyzePhotograph(
    model: string,
    imageBase64: string,
    prompt: string,
    signal?: AbortSignal
  ): Promise<string> {
    // Strip data URL header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [cleanBase64],
        stream: false,
        options: {
          temperature: 0.2, // Low temperature for factual visual observations
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Vision analysis failed: HTTP ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Chat generation with streaming support
   */
  async streamChat(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      num_ctx?: number;
      signal?: AbortSignal;
    },
    onChunk: (delta: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_ctx: options.num_ctx ?? 4096,
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Chat generation failed: HTTP ${response.status} - ${errText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on chat response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as OllamaChatChunk;
          if (parsed.message?.content) {
            const chunk = parsed.message.content;
            fullResponse += chunk;
            onChunk(chunk);
          }
        } catch {
          // Incomplete chunk
        }
      }
    }

    return fullResponse;
  }

  /**
   * Text generation without chat format
   */
  async generateText(
    model: string,
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; signal?: AbortSignal }
  ): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.4,
        },
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Generation failed: HTTP ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Generate vector embeddings
   */
  async generateEmbedding(model: string, text: string): Promise<number[]> {
    try {
      // First try /api/embeddings
      const response = await fetch(`${this.endpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding || [];
      }

      // Try /api/embed if newer Ollama version
      const embedResp = await fetch(`${this.endpoint}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: text,
        }),
      });

      if (embedResp.ok) {
        const embedData = await embedResp.json();
        return (embedData.embeddings && embedData.embeddings[0]) || [];
      }

      throw new Error(`Embedding API returned status ${response.status}`);
    } catch (err: any) {
      console.warn('Embedding generation error:', err);
      throw err;
    }
  }
}

export const ollamaService = new OllamaService();
