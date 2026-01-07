/**
 * Storage class adapted from Three.js Storage.js
 * Manages IndexedDB storage for editor state
 */
export class Storage {
  private indexedDB: IDBFactory | undefined;
  private name: string = 'threejs-editor';
  private version: number = 1;
  private database: IDBDatabase | null = null;

  constructor() {
    this.indexedDB = window.indexedDB;
    if (this.indexedDB === undefined) {
      console.warn('Storage: IndexedDB not available.');
    }
  }

  /**
   * Initialize the database
   */
  init(callback: () => void): void {
    if (!this.indexedDB) {
      callback();
      return;
    }

    const request = this.indexedDB.open(this.name, this.version);
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('states')) {
        db.createObjectStore('states');
      }
    };

    request.onsuccess = (event: Event) => {
      this.database = (event.target as IDBOpenDBRequest).result;
      callback();
    };

    request.onerror = (event: Event) => {
      console.error('IndexedDB', event);
      callback();
    };
  }

  /**
   * Get data from storage
   */
  get(callback: (data: any) => void): void {
    if (!this.database) {
      callback(null);
      return;
    }

    const transaction = this.database.transaction(['states'], 'readonly');
    const objectStore = transaction.objectStore('states');
    const request = objectStore.get(0);
    
    request.onsuccess = (event: Event) => {
      callback((event.target as IDBRequest).result);
    };

    request.onerror = () => {
      callback(null);
    };
  }

  /**
   * Set data in storage
   */
  set(data: any): void {
    if (!this.database) return;

    const start = performance.now();
    const transaction = this.database.transaction(['states'], 'readwrite');
    const objectStore = transaction.objectStore('states');
    const request = objectStore.put(data, 0);
    
    request.onsuccess = () => {
      const time = new Date().toTimeString().split(' ')[0];
      console.log(`[${time}] Saved state to IndexedDB. ${(performance.now() - start).toFixed(2)}ms`);
    };
  }

  /**
   * Clear all data from storage
   */
  clear(): void {
    if (!this.database) return;

    const transaction = this.database.transaction(['states'], 'readwrite');
    const objectStore = transaction.objectStore('states');
    const request = objectStore.clear();
    
    request.onsuccess = () => {
      const time = new Date().toTimeString().split(' ')[0];
      console.log(`[${time}] Cleared IndexedDB.`);
    };
  }
}

