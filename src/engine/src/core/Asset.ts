import { SuperEvents } from '@khudiiash/super-events';

export enum AssetState {
    NOT_LOADED = 'not_loaded',
    LOADING = 'loading',
    LOADED = 'loaded',
    FAILED = 'failed'
}

export abstract class Asset {
    public name: string;
    public url: string;
    public state: AssetState = AssetState.NOT_LOADED;
    public data: any = null;
    public error: string | null = null;
    protected events: SuperEvents;

    constructor(name: string, url: string) {
        this.name = name;
        this.url = url;
        this.events = new SuperEvents();
    }

    abstract load(): Promise<void>;
    abstract unload(): void;

    on(event: string, callback: (...args: any[]) => void): void {
        this.events.on(event, callback);
    }

    off(event: string, callback: (...args: any[]) => void): void {
        this.events.off(event, callback);
    }

    once(event: string, callback: (...args: any[]) => void): void {
        this.events.once(event, callback);
    }

    emit(event: string, ...args: any[]): void {
        this.events.emit(event, ...args);
    }

    destroy(): void {
        this.unload();
        this.events.clear();
    }
}
