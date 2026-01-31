import { SuperEvents } from '@khudiiash/super-events';

export enum AssetState {
    NOT_LOADED = 'not_loaded',
    LOADING = 'loading',
    LOADED = 'loaded',
    FAILED = 'failed'
}

export enum AssetType {
    GEOMETRY = 'geometry',
    MATERIAL = 'material',
    TEXTURE = 'texture',
    MODEL = 'model',
    AUDIO = 'audio',
    SCRIPT = 'script',
    DATA = 'data',
    FONT = 'font',
    SHADER = 'shader',
    HTML = 'html',
    CSS = 'css',
    TEXT = 'text',
    JSON = 'json',
}

export abstract class Asset {
    public id: string = crypto.randomUUID().toString();
    public name: string = '';
    public url: string = '';
    public type: AssetType = AssetType.DATA;
    public state: AssetState = AssetState.NOT_LOADED;
    public data: any = null;
    public error: string | null = null;
    public createdAt: number = Date.now();
    public modifiedAt: number = Date.now();
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

    async emitAsync(event: string, ...args: any[]): Promise<void> {
        await this.events.emitAsync(event, ...args);
    }

    destroy(): void {
        this.unload();
        this.events.clear();
    }
}
