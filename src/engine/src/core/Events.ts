import { SuperEvents } from '@khudiiash/super-events';

/**
 * Global event system for the engine
 * Provides both global and local event handling
 */
export class EngineEvents {
    private static globalEvents: SuperEvents | null = null;
    private static instance: EngineEvents | null = null;

    private constructor() {
        
    }

    /**
     * Get the global SuperEvents instance (singleton)
     */
    static getGlobalEvents(): SuperEvents {
        if (!EngineEvents.globalEvents) {
            EngineEvents.globalEvents = SuperEvents.getInstance();
        }
        return EngineEvents.globalEvents;
    }

    /**
     * Get the EngineEvents singleton instance
     */
    static getInstance(): EngineEvents {
        if (!EngineEvents.instance) {
            EngineEvents.instance = new EngineEvents();
        }
        return EngineEvents.instance;
    }

    /**
     * Register a listener for a global event
     * Returns an unsubscribe function
     */
    static on(event: string, callback: (...args: any[]) => any): () => void {
        return EngineEvents.getGlobalEvents().on(event, callback);
    }

    /**
     * Register a one-time listener for a global event
     * Returns an unsubscribe function
     */
    static once(event: string, callback: (...args: any[]) => any): () => void {
        return EngineEvents.getGlobalEvents().once(event, callback);
    }

    /**
     * Remove a specific listener for a global event
     */
    static off(event: string, callback: (...args: any[]) => void): void {
        EngineEvents.getGlobalEvents().off(event, callback);
    }

    /**
     * Emit a global event synchronously
     */
    static emit(event: string, ...args: any[]): void {
        EngineEvents.getGlobalEvents().emit(event, ...args);
    }

    /**
     * Emit a global event asynchronously (supports async listeners)
     */
    static async emitAsync(event: string, ...args: any[]): Promise<void> {
        await EngineEvents.getGlobalEvents().emitAsync(event, ...args);
    }

    /**
     * Call all listeners and get their return values (sync)
     */
    static callAll(event: string, ...args: any[]): any[] {
        return EngineEvents.getGlobalEvents().callAll(event, ...args);
    }

    /**
     * Call all listeners and get their return values (async, supports async listeners)
     */
    static async callAllAsync(event: string, ...args: any[]): Promise<any[]> {
        return EngineEvents.getGlobalEvents().callAllAsync(event, ...args);
    }

    /**
     * Call all listeners and get the first non-null return value (sync)
     */
    static callFirst(event: string, ...args: any[]): any {
        return EngineEvents.getGlobalEvents().callFirst(event, ...args);
    }

    /**
     * Call all listeners and get the first non-null return value (async, supports async listeners)
     */
    static async callFirstAsync(event: string, ...args: any[]): Promise<any> {
        return EngineEvents.getGlobalEvents().callFirstAsync(event, ...args);
    }

    /**
     * Remove all listeners for all global events
     */
    static clear(): void {
        EngineEvents.getGlobalEvents().clear();
    }
}


export const events = EngineEvents.getInstance();
export const on = EngineEvents.on;
export const once = EngineEvents.once;
export const off = EngineEvents.off;
export const emit = EngineEvents.emit;
export const emitAsync = EngineEvents.emitAsync;
export const callAll = EngineEvents.callAll;
export const callAllAsync = EngineEvents.callAllAsync;
export const callFirst = EngineEvents.callFirst;
export const callFirstAsync = EngineEvents.callFirstAsync;
export const clear = EngineEvents.clear;
