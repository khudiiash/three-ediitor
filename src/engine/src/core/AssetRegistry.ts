import { Asset, AssetState, AssetType } from './Asset';

export class AssetRegistry {
    private assets: Map<string, Asset> = new Map();
    private assetsByUrl: Map<string, Asset> = new Map();
    private assetsByName: Map<string, Asset> = new Map();

    register(asset: Asset): void {
        this.assets.set(asset.id, asset);
        this.assetsByName.set(asset.name, asset);
        this.assetsByUrl.set(asset.url, asset);
    }

    unregister(id: string): void {
        const asset = this.assets.get(id);
        if (asset) {
            this.assets.delete(id);
            this.assetsByName.delete(asset.name);
            this.assetsByUrl.delete(asset.url);
            asset.destroy();
        }
    }

    unregisterByUrl(url: string): void {
        const asset = this.assetsByUrl.get(url);
        if (asset) {
            this.unregister(asset.id);
        }
    }

    getByType(type: AssetType): Asset[] {
        return Array.from(this.assets.values()).filter(asset => asset.type === type);
    }

    get(id: string): Asset | undefined {
        return this.assets.get(id);
    }

    getByName(name: string): Asset | undefined {
        return this.assetsByName.get(name);
    }

    getByUrl(url: string): Asset | undefined {
        return this.assetsByUrl.get(url);
    }

    hasName(name: string): boolean {
        return this.assetsByName.has(name);
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
                asset.once('loaded', () => resolve());
                asset.once('error', (error: any) => reject(error instanceof Error ? error : new Error(String(error))));
            });
        }

        asset.state = AssetState.LOADING;
        try {
            await asset.load();
            asset.state = AssetState.LOADED;
            asset.emit('loaded');
        } catch (error: any) {
            asset.state = AssetState.FAILED;
            asset.error = error?.message || String(error);
            asset.emit('error', asset.error);
            throw error;
        }
    }

    async loadAll(): Promise<void> {
        const loadPromises = Array.from(this.assets.values())
            .filter(asset => asset.state === AssetState.NOT_LOADED)
            .map(asset => this.load(asset.id).catch(() => {}));

        await Promise.all(loadPromises);
    }

    unload(id: string): void {
        const asset = this.assets.get(id);
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
        this.assetsByName.clear();
        this.assetsByUrl.clear();
    }
}
