import { Asset, AssetState } from './Asset';

export class AssetRegistry {
    private assets: Map<string, Asset> = new Map();
    private assetsByUrl: Map<string, Asset> = new Map();

    register(asset: Asset): void {
        this.assets.set(asset.name, asset);
        this.assetsByUrl.set(asset.url, asset);
    }

    unregister(name: string): void {
        const asset = this.assets.get(name);
        if (asset) {
            this.assets.delete(name);
            this.assetsByUrl.delete(asset.url);
            asset.destroy();
        }
    }

    get(name: string): Asset | undefined {
        return this.assets.get(name);
    }

    getByUrl(url: string): Asset | undefined {
        return this.assetsByUrl.get(url);
    }

    has(name: string): boolean {
        return this.assets.has(name);
    }

    getAll(): Asset[] {
        return Array.from(this.assets.values());
    }

    async load(name: string): Promise<void> {
        const asset = this.assets.get(name);
        if (!asset) {
            throw new Error(`Asset '${name}' not found in registry`);
        }

        if (asset.state === AssetState.LOADED) {
            return;
        }

        if (asset.state === AssetState.LOADING) {
            return new Promise((resolve, reject) => {
                asset.once('load', () => resolve());
                asset.once('error', (error: string) => reject(new Error(error)));
            });
        }

        asset.state = AssetState.LOADING;
        try {
            await asset.load();
            asset.state = AssetState.LOADED;
            asset.emit('load', asset);
        } catch (error: any) {
            asset.state = AssetState.FAILED;
            asset.error = error.message || String(error);
            asset.emit('error', asset.error);
            throw error;
        }
    }

    async loadAll(): Promise<void> {
        const loadPromises = Array.from(this.assets.values())
            .filter(asset => asset.state === AssetState.NOT_LOADED)
            .map(asset => this.load(asset.name).catch(() => {}));

        await Promise.all(loadPromises);
    }

    unload(name: string): void {
        const asset = this.assets.get(name);
        if (asset) {
            asset.unload();
            asset.state = AssetState.NOT_LOADED;
            asset.data = null;
            asset.error = null;
        }
    }

    unloadAll(): void {
        this.assets.forEach(asset => {
            asset.unload();
            asset.state = AssetState.NOT_LOADED;
            asset.data = null;
            asset.error = null;
        });
    }

    clear(): void {
        this.unloadAll();
        this.assets.forEach(asset => asset.destroy());
        this.assets.clear();
        this.assetsByUrl.clear();
    }
}
