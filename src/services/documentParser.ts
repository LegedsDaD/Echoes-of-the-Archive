export interface ParsedDocumentResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  text: string;
  chunks: string[];
}

export class DocumentParserService {
  /**
   * Reads a file using browser-native FileReader and extracts plain text
   */
  async parseFile(file: File): Promise<ParsedDocumentResult> {
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type || this.getExtension(fileName);

    let extractedText = '';

    if (
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.csv') ||
      file.type.startsWith('text/')
    ) {
      extractedText = await this.readAsText(file);
    } else if (fileName.endsWith('.pdf')) {
      extractedText = await this.extractPdfText(file);
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      extractedText = await this.extractDocxText(file);
    } else {
      // Fallback text read
      extractedText = await this.readAsText(file);
    }

    // Clean up text
    extractedText = this.cleanText(extractedText);

    // Chunk into readable archival segments (~500 words per chunk)
    const chunks = this.chunkText(extractedText, 1200);

    return {
      fileName,
      fileSize,
      fileType,
      text: extractedText,
      chunks,
    };
  }

  private getExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
  }

  private readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Browser-safe PDF text extraction:
   * Inspects text streams and filters ASCII/UTF-8 character streams from the PDF array buffer
   */
  private async extractPdfText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const decoder = new TextDecoder('utf-8');
          const content = decoder.decode(buffer);

          // Extract text inside PDF stream objects (/BT ... /ET and /Tj /TJ markers or plain readable strings)
          const textMatches = content.match(/\(([^()]*)\)\s*T[jd]/g) || [];
          if (textMatches.length > 0) {
            const extracted = textMatches
              .map((m) => m.replace(/^\(/, '').replace(/\)\s*T[jd]$/, ''))
              .join(' ');
            resolve(extracted);
            return;
          }

          // Fallback: extract legible sequences of printable words
          const cleanStrings = content
            .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
            .replace(/stream[\s\S]*?endstream/g, ' ')
            .replace(/[<>{}\/[\]]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2 && /^[a-zA-Z0-9.,'"?!;:()\-–—]+$/.test(word))
            .join(' ');

          resolve(cleanStrings.length > 50 ? cleanStrings : `[Extracted Document: ${file.name}]\n${cleanStrings}`);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Browser-safe DOCX extraction:
   * DOCX is a zip file with word/document.xml. We read string streams and extract text inside <w:t> tags.
   */
  private async extractDocxText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const decoder = new TextDecoder('utf-8');
          const raw = decoder.decode(buffer);

          // Find XML text tags <w:t>...</w:t>
          const xmlMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (xmlMatches && xmlMatches.length > 0) {
            const text = xmlMatches
              .map((tag) => tag.replace(/<[^>]+>/g, ''))
              .join(' ');
            resolve(text);
            return;
          }

          // Fallback regex for readable text
          const words = raw
            .replace(/<[^>]+>/g, ' ')
            .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 2 && /^[a-zA-Z0-9.,'"?!;:()\-–—]+$/.test(w))
            .join(' ');

          resolve(words.length > 30 ? words : `[Extracted Document: ${file.name}]\n${words}`);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private cleanText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private chunkText(text: string, maxCharsPerChunk = 1200): string[] {
    if (!text || text.length <= maxCharsPerChunk) return [text];

    const paragraphs = text.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > maxCharsPerChunk && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const documentParserService = new DocumentParserService();
