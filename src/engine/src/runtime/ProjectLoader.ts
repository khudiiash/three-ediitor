
export class ProjectLoader {
    static getProjectPath(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        const projectPath = urlParams.get('project');
        
        if (projectPath) {
            return decodeURIComponent(projectPath);
        }
        
        const storedPath = localStorage.getItem('projectPath');
        if (storedPath) {
            return storedPath;
        }
        
        return null;
    }

    static async loadSceneJson(projectPath: string | null): Promise<any> {
        if (!projectPath) {
            throw new Error('No project path provided');
        }

        const projectName = projectPath.split(/[/\\]/).pop();
        const apiPath = `/api/projects/${projectName}/scene.json`;
        
        try {
            const response = await fetch(apiPath);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('[ProjectLoader] Failed to load scene.json:', error);
        }

        try {
            const response = await fetch('./scene.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('[ProjectLoader] Failed to load scene.json:', error);
        }

        throw new Error(`Failed to load scene.json`);
    }

    static async loadAsset(projectPath: string | null, assetPath: string): Promise<Blob> {
        if (!projectPath) {
            throw new Error('No project path provided');
        }

        const projectName = projectPath.split(/[/\\]/).pop();
        const apiPath = `/api/projects/${projectName}/assets/${assetPath}`;
        
        try {
            const response = await fetch(apiPath);
            if (response.ok) {
                return await response.blob();
            }
        } catch (error) {
            console.warn('[ProjectLoader] Failed to load asset:', error);
        }

        throw new Error(`Failed to load asset ${assetPath}`);
    }
}