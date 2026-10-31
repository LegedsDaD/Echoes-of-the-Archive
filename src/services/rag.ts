import { MemoryItem, MessageCitation } from '../types';

export class RagService {
  /**
   * Cosine similarity between two float vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Tokenize text for browser-side TF-IDF fallback when vector embeddings are not yet generated
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  /**
   * Lexical BM25/TF-IDF similarity score for browser-side keyword matching
   */
  public lexicalSimilarity(query: string, document: string): number {
    const queryTokens = this.tokenize(query);
    const docTokens = this.tokenize(document);
    if (!queryTokens.length || !docTokens.length) return 0;

    const docFreq = new Map<string, number>();
    for (const token of docTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }

    let matchScore = 0;
    for (const q of queryTokens) {
      const freq = docFreq.get(q) || 0;
      if (freq > 0) {
        matchScore += Math.log(1 + freq) * (1 / Math.sqrt(docTokens.length));
      }
    }

    return Math.min(matchScore, 1.0);
  }

  /**
   * Search relevant memories using vector embeddings when available, falling back to lexical matching
   */
  public searchRelevantMemories(
    query: string,
    memories: MemoryItem[],
    queryEmbedding?: number[],
    topK = 4,
    minThreshold = 0.15
  ): { memory: MemoryItem; score: number }[] {
    if (!memories.length) return [];

    const scored = memories.map((mem) => {
      let score = 0;
      if (queryEmbedding && mem.embedding && queryEmbedding.length === mem.embedding.length) {
        score = this.cosineSimilarity(queryEmbedding, mem.embedding);
      } else {
        const fullContent = `${mem.title} ${mem.content} ${mem.tags.join(' ')}`;
        score = this.lexicalSimilarity(query, fullContent);
      }
      return { memory: mem, score };
    });

    return scored
      .filter((item) => item.score >= minThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Format retrieved memories into a structured context string and citation array
   */
  public buildRagContext(
    retrieved: { memory: MemoryItem; score: number }[]
  ): { contextString: string; citations: MessageCitation[] } {
    if (!retrieved.length) {
      return { contextString: '', citations: [] };
    }

    const citations: MessageCitation[] = [];
    const contextBlocks: string[] = [];

    retrieved.forEach((item, index) => {
      const { memory, score } = item;
      const snippet = memory.content.slice(0, 180) + (memory.content.length > 180 ? '...' : '');

      citations.push({
        memoryId: memory.id,
        title: memory.title,
        snippet,
        similarityScore: Math.round(score * 100) / 100,
      });

      contextBlocks.push(
        `[Archive Record #${index + 1}: "${memory.title}" (${memory.type.toUpperCase()})]:\n${memory.content}`
      );
    });

    const contextString = `
--- RETRIEVED ARCHIVAL MEMORIES & PRIMARY SOURCES ---
${contextBlocks.join('\n\n')}
-----------------------------------------------------
Instructions: Draw upon the above documented facts and primary memories where directly relevant to the user's question. If the user asks about an event not documented above, maintain intellectual honesty and note what is unknown.
`;

    return { contextString, citations };
  }
}

export const ragService = new RagService();
