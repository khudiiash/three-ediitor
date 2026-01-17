
export class ProjectLoader {
    static getProjectPath(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        const projectPath = urlParams.get('project');
        
        if (projectPath) {
            return decodeURIComponent(projectPath);
        }
        
        // Check window.__editorProjectPath (set by editor in play mode)
        if (typeof window !== 'undefined' && (window as any).__editorProjectPath) {
            return (window as any).__editorProjectPath;
        }
        
        // Check sessionStorage (set by Tauri when opening project)
        if (typeof sessionStorage !== 'undefined') {
            const sessionPath = sessionStorage.getItem('editor_project_path');
            if (sessionPath) {
                return sessionPath;
            }
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
        const encodedProjectName = encodeURIComponent(projectName || '');
        const apiPath = `/api/projects/${encodedProjectName}/scene.json`;
        
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
        const encodedProjectName = encodeURIComponent(projectName || '');
        const encodedAssetPath = encodeURIComponent(assetPath);
        const apiPath = `/api/projects/${encodedProjectName}/assets/${encodedAssetPath}`;
        
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