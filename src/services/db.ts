import { Portrait, MemoryItem, DocumentItem, Conversation, Message, ActivityTask, AppSettings, StorageStats } from '../types';

const DB_NAME = 'echoes_of_the_archive_db';
const DB_VERSION = 1;

export class ArchiveDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('portraits')) {
          const portraitStore = db.createObjectStore('portraits', { keyPath: 'id' });
          portraitStore.createIndex('name', 'name', { unique: false });
          portraitStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
          memoryStore.createIndex('portraitId', 'portraitId', { unique: false });
          memoryStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('portraitId', 'portraitId', { unique: false });
        }

        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('portraitId', 'portraitId', { unique: false });
          convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('activity')) {
          const actStore = db.createObjectStore('activity', { keyPath: 'id' });
          actStore.createIndex('startedAt', 'startedAt', { unique: false });
          actStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // Generic helper for transaction execution
  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest | Promise<T>
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      const request = callback(store);

      if (request instanceof Promise) {
        request.then(resolve).catch(reject);
        return;
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // PORTRAITS
  async getAllPortraits(): Promise<Portrait[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('portraits', 'readonly');
      const store = tx.objectStore('portraits');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getPortrait(id: string): Promise<Portrait | null> {
    return this.withStore('portraits', 'readonly', (store) => store.get(id));
  }

  async savePortrait(portrait: Portrait): Promise<void> {
    await this.withStore('portraits', 'readwrite', (store) => store.put(portrait));
  }

  async deletePortrait(id: string): Promise<void> {
    const db = await this.getDB();
    // Delete portrait, related memories, documents, conversations, messages
    const tx = db.transaction(['portraits', 'memories', 'documents', 'conversations', 'messages'], 'readwrite');
    
    tx.objectStore('portraits').delete(id);

    // Delete memories for portrait
    const memIndex = tx.objectStore('memories').index('portraitId');
    const memReq = memIndex.getAllKeys(id);
    memReq.onsuccess = () => {
      const memStore = tx.objectStore('memories');
      memReq.result.forEach((key) => memStore.delete(key));
    };

    // Delete conversations & messages
    const convIndex = tx.objectStore('conversations').index('portraitId');
    const convReq = convIndex.getAll(id);
    convReq.onsuccess = () => {
      const convStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');
      const msgIndex = msgStore.index('conversationId');

      (convReq.result as Conversation[]).forEach((conv) => {
        convStore.delete(conv.id);
        const msgKeysReq = msgIndex.getAllKeys(conv.id);
        msgKeysReq.onsuccess = () => {
          msgKeysReq.result.forEach((msgKey) => msgStore.delete(msgKey));
        };
      });
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // MEMORIES
  async getMemoriesByPortrait(portraitId: string): Promise<MemoryItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('memories', 'readonly');
      const index = tx.objectStore('memories').index('portraitId');
      const req = index.getAll(portraitId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllMemories(): Promise<MemoryItem[]> {
    return this.withStore('memories', 'readonly', (store) => store.getAll());
  }

  async saveMemory(memory: MemoryItem): Promise<void> {
    await this.withStore('memories', 'readwrite', (store) => store.put(memory));
  }

  async deleteMemory(id: string): Promise<void> {
    await this.withStore('memories', 'readwrite', (store) => store.delete(id));
  }

  // DOCUMENTS
  async getAllDocuments(): Promise<DocumentItem[]> {
    return this.withStore('documents', 'readonly', (store) => store.getAll());
  }

  async saveDocument(doc: DocumentItem): Promise<void> {
    await this.withStore('documents', 'readwrite', (store) => store.put(doc));
  }

  async deleteDocument(id: string): Promise<void> {
    await this.withStore('documents', 'readwrite', (store) => store.delete(id));
  }

  // CONVERSATIONS
  async getConversationsByPortrait(portraitId: string): Promise<Conversation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const index = tx.objectStore('conversations').index('portraitId');
      const req = index.getAll(portraitId);
      req.onsuccess = () => {
        const res = req.result || [];
        res.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllConversations(): Promise<Conversation[]> {
    return this.withStore('conversations', 'readonly', (store) => store.getAll());
  }

  async saveConversation(conv: Conversation): Promise<void> {
    await this.withStore('conversations', 'readwrite', (store) => store.put(conv));
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    tx.objectStore('conversations').delete(id);

    const msgIndex = tx.objectStore('messages').index('conversationId');
    const msgKeysReq = msgIndex.getAllKeys(id);
    msgKeysReq.onsuccess = () => {
      const msgStore = tx.objectStore('messages');
      msgKeysReq.result.forEach((key) => msgStore.delete(key));
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // MESSAGES
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const index = tx.objectStore('messages').index('conversationId');
      const req = index.getAll(conversationId);
      req.onsuccess = () => {
        const res = req.result || [];
        res.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveMessage(msg: Message): Promise<void> {
    await this.withStore('messages', 'readwrite', (store) => store.put(msg));
  }

  async deleteMessage(id: string): Promise<void> {
    await this.withStore('messages', 'readwrite', (store) => store.delete(id));
  }

  // ACTIVITY LOGS
  async getActivityLogs(limit = 100): Promise<ActivityTask[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activity', 'readonly');
      const store = tx.objectStore('activity');
      const req = store.getAll();
      req.onsuccess = () => {
        const res = (req.result || []) as ActivityTask[];
        res.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        resolve(res.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveActivity(task: ActivityTask): Promise<void> {
    await this.withStore('activity', 'readwrite', (store) => store.put(task));
  }

  async clearActivityLogs(): Promise<void> {
    await this.withStore('activity', 'readwrite', (store) => store.clear());
  }

  // SETTINGS
  async getSettings(): Promise<AppSettings | null> {
    const res = await this.withStore<{ key: string; value: AppSettings } | null>('settings', 'readonly', (store) => store.get('app_settings'));
    return res ? res.value : null;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.withStore('settings', 'readwrite', (store) => store.put({ key: 'app_settings', value: settings }));
  }

  // STORAGE METRICS
  async getStorageStats(): Promise<StorageStats> {
    let usageBytes = 0;
    let quotaBytes = 0;

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      } catch (e) {
        console.warn('Storage estimate failed', e);
      }
    }

    const portraits = await this.getAllPortraits();
    const memories = await this.getAllMemories();
    const conversations = await this.getAllConversations();
    const documents = await this.getAllDocuments();

    const db = await this.getDB();
    const msgCount = await new Promise<number>((res) => {
      const tx = db.transaction('messages', 'readonly');
      const req = tx.objectStore('messages').count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });

    return {
      usageBytes,
      quotaBytes,
      portraitsCount: portraits.length,
      memoriesCount: memories.length,
      conversationsCount: conversations.length,
      messagesCount: msgCount,
      documentsCount: documents.length,
    };
  }

  // EXPORT & IMPORT BACKUP
  async exportArchiveBackup(): Promise<string> {
    const portraits = await this.getAllPortraits();
    const memories = await this.getAllMemories();
    const documents = await this.getAllDocuments();
    const conversations = await this.getAllConversations();
    
    const db = await this.getDB();
    const messages = await new Promise<Message[]>((res) => {
      const tx = db.transaction('messages', 'readonly');
      const req = tx.objectStore('messages').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });

    const settings = await this.getSettings();

    const backupPayload = {
      archiveFormat: 'echoes-of-the-archive-v1',
      exportedAt: new Date().toISOString(),
      data: {
        portraits,
        memories,
        documents,
        conversations,
        messages,
        settings,
      },
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  async importArchiveBackup(jsonString: string): Promise<{ portraitsAdded: number; memoriesAdded: number }> {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      throw new Error('Invalid archive backup format. Missing root data object.');
    }

    const { portraits, memories, documents, conversations, messages, settings } = parsed.data;

    let portraitsAdded = 0;
    let memoriesAdded = 0;

    if (Array.isArray(portraits)) {
      for (const p of portraits) {
        await this.savePortrait(p);
        portraitsAdded++;
      }
    }

    if (Array.isArray(memories)) {
      for (const m of memories) {
        await this.saveMemory(m);
        memoriesAdded++;
      }
    }

    if (Array.isArray(documents)) {
      for (const d of documents) {
        await this.saveDocument(d);
      }
    }

    if (Array.isArray(conversations)) {
      for (const c of conversations) {
        await this.saveConversation(c);
      }
    }

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        await this.saveMessage(msg);
      }
    }

    if (settings) {
      await this.saveSettings(settings);
    }

    return { portraitsAdded, memoriesAdded };
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const stores = ['portraits', 'memories', 'documents', 'conversations', 'messages', 'activity'];
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach((s) => tx.objectStore(s).clear());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new ArchiveDatabase();
