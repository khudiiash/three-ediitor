import { Asset, AssetState } from '../core/Asset';
import { Script, ScriptConstructor } from '../core/Script';
import { Entity } from '../core/Entity';
import { registerComponent, attribute } from '../core/decorators';

export class ScriptAsset extends Asset {
    public scriptClass: ScriptConstructor | null = null;
    private compiledCode: string | null = null;

    constructor(name: string, url: string) {
        super(name, url);
    }

    async load(): Promise<void> {
        if (this.state === AssetState.LOADED && this.scriptClass) {
            return;
        }

        try {
            let scriptUrl = this.url;
            if (scriptUrl.startsWith('./')) {
                scriptUrl = scriptUrl.slice(2);
            }
            if (scriptUrl.endsWith('.ts') || scriptUrl.endsWith('.tsx')) {
                scriptUrl = scriptUrl.replace(/\.tsx?$/, '.js');
            }

            let compiledCode: string;

            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
                const invoke = (window as any).__TAURI__.core.invoke;
                let projectPath = (window as any).__editorProjectPath || (window as any).__projectPath;
                if (!projectPath && typeof sessionStorage !== 'undefined') {
                    projectPath = sessionStorage.getItem('editor_project_path');
                }
                
                if (!projectPath) {
                    console.warn(`[ScriptAsset] Project path not found for ${this.name}. Available: __editorProjectPath=${(window as any).__editorProjectPath}, __projectPath=${(window as any).__projectPath}, sessionStorage=${sessionStorage?.getItem('editor_project_path')}`);
                }
                
                if (projectPath && invoke) {
                    let assetPath = scriptUrl;
                    if (assetPath.startsWith('assets/')) {
                        assetPath = assetPath.slice(7);
                    }
                    
                    const originalAssetPath = this.url;
                    let tsPath = originalAssetPath;
                    if (tsPath.startsWith('./')) {
                        tsPath = tsPath.slice(2);
                    }
                    if (tsPath.startsWith('assets/')) {
                        tsPath = tsPath.slice(7);
                    }
                    if (!tsPath.endsWith('.ts') && !tsPath.endsWith('.tsx')) {
                        tsPath = tsPath.replace(/\.js$/, '.ts');
                    }
                    
                    try {
                        const needsRecompile = await (async () => {
                            try {
                                const tsMetadata = await invoke('get_file_metadata', {
                                    projectPath: projectPath,
                                    assetPath: tsPath
                                });
                                const jsMetadata = await invoke('get_file_metadata', {
                                    projectPath: projectPath,
                                    assetPath: assetPath
                                });
                                
                                if (tsMetadata && jsMetadata) {
                                    return tsMetadata > jsMetadata;
                                }
                                return tsMetadata !== null && jsMetadata === null;
                            } catch (e) {
                                return false;
                            }
                        })();
                        
                        if (needsRecompile) {
                            try {
                                const tsBytes = await invoke('read_asset_file', {
                                    projectPath: projectPath,
                                    assetPath: tsPath
                                });
                                const tsSource = new TextDecoder().decode(new Uint8Array(tsBytes));
                                
                                if (typeof window !== 'undefined' && (window as any).ScriptCompiler) {
                                    const ScriptCompiler = (window as any).ScriptCompiler.ScriptCompiler || (window as any).ScriptCompiler;
                                    const compiled = await ScriptCompiler.compileScript(tsPath, tsSource);
                                    if (compiled) {
                                        const compiledContent = Array.from(new TextEncoder().encode(compiled.content));
                                        await invoke('write_asset_file', {
                                            projectPath: projectPath,
                                            assetPath: compiled.path,
                                            content: compiledContent
                                        });
                                    }
                                } else if ((window as any).ts) {
                                    const ts = (window as any).ts;
                                    const compilerOptions = {
                                        target: ts.ScriptTarget.ES2020,
                                        module: ts.ModuleKind.CommonJS,
                                        lib: ['ES2020', 'DOM'],
                                        moduleResolution: ts.ModuleResolutionKind.Bundler,
                                        strict: false,
                                        esModuleInterop: true,
                                        skipLibCheck: true,
                                        declaration: false,
                                        isolatedModules: true
                                    };
                                    const result = ts.transpileModule(tsSource, { compilerOptions });
                                    const compiledContent = Array.from(new TextEncoder().encode(result.outputText));
                                    await invoke('write_asset_file', {
                                        projectPath: projectPath,
                                        assetPath: assetPath,
                                        content: compiledContent
                                    });
                                }
                            } catch (compileError) {
                            }
                        }
                        
                        const fileBytes = await invoke('read_asset_file', {
                            projectPath: projectPath,
                            assetPath: assetPath
                        });
                        compiledCode = new TextDecoder().decode(new Uint8Array(fileBytes));
                    } catch (tauriError) {
                        console.warn(`[ScriptAsset] Failed to load via Tauri (${this.name}):`, tauriError);
                        console.warn(`[ScriptAsset] Project path: ${projectPath}, Asset path: ${assetPath}`);
                        throw new Error(`Failed to load script via Tauri: ${tauriError}`);
                    }
                } else {
                    console.warn(`[ScriptAsset] Tauri available but project path not set for ${this.name}`);
                    throw new Error(`Project path not available for script: ${this.name}`);
                }
            } else {
                let fetchUrl = scriptUrl;
                if (!fetchUrl.startsWith('./') && !fetchUrl.startsWith('/') && !fetchUrl.startsWith('http')) {
                    fetchUrl = './' + fetchUrl;
                }
                try {
                    const response = await fetch(fetchUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    compiledCode = await response.text();
                } catch (fetchError) {
                    console.warn(`[ScriptAsset] Failed to load script via fetch (${this.name}) from ${fetchUrl}:`, fetchError);
                    throw new Error(`Failed to load script: ${this.name} - ${fetchError}`);
                }
            }

            if (typeof window !== 'undefined') {
                if (!(window as any).__engineExports) {
                    (window as any).__engineExports = {};
                }

                const engineExports = (window as any).__engineExports;
                
                if (!engineExports.Script) {
                    engineExports.Script = Script;
                }
                
                if (!engineExports.registerComponent) {
                    engineExports.registerComponent = registerComponent;
                    engineExports.attribute = attribute;
                }
            }

            compiledCode = compiledCode.replace(
                /import\s+{([^}]+)}\s+from\s+['"]@engine\/core\/([^'"]+)['"];?/g,
                (match, imports, module) => {
                    const importList = imports.split(',').map((i: string) => i.trim());
                    const requireCalls = importList.map((imp: string) => {
                        const parts = imp.split(' as ');
                        const name = parts[0].trim();
                        const alias = parts[1] ? parts[1].trim() : name;
                        return `const ${alias} = require('@engine/core/${module}').${name};`;
                    }).join('\n');
                    return requireCalls;
                }
            );

            compiledCode = compiledCode.replace(
                /import\s+(\w+)\s+from\s+['"]@engine\/core\/([^'"]+)['"];?/g,
                (match, defaultImport, module) => {
                    return `const ${defaultImport} = require('@engine/core/${module}');`;
                }
            );

            compiledCode = compiledCode.replace(
                /import\s+\*\s+as\s+(\w+)\s+from\s+['"]@engine\/core\/([^'"]+)['"];?/g,
                (match, namespace, module) => {
                    return `const ${namespace} = require('@engine/core/${module}');`;
                }
            );

            compiledCode = compiledCode.replace(
                /import\s+{([^}]+)}\s+from\s+['"]three['"];?/g,
                (match, imports) => {
                    const importList = imports.split(',').map((i: string) => i.trim());
                    const requireCalls = importList.map((imp: string) => {
                        const parts = imp.split(' as ');
                        const name = parts[0].trim();
                        const alias = parts[1] ? parts[1].trim() : name;
                        return `const ${alias} = require('three').${name};`;
                    }).join('\n');
                    return requireCalls;
                }
            );

            compiledCode = compiledCode.replace(
                /import\s+\*\s+as\s+(\w+)\s+from\s+['"]three['"];?/g,
                (match, namespace) => {
                    return `const ${namespace} = require('three');`;
                }
            );

            this.compiledCode = compiledCode;

            const moduleExports: any = {};
            const module = { exports: moduleExports };
            
            const require = (name: string): any => {
                if (name === '@engine/core/Script') {
                    return { Script: (window as any).__engineExports?.Script };
                }
                if (name === '@engine/core/decorators') {
                    return (window as any).__engineExports;
                }
                if (name === 'three') {
                    return (window as any).THREE;
                }
                throw new Error(`Module '${name}' not found`);
            };

            const decoratorHelpers = `
                var __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
                    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
                    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
                    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
                    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
                    var _, done = false;
                    for (var i = decorators.length - 1; i >= 0; i--) {
                        var context = {};
                        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
                        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
                        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
                        if (contextIn.metadata) {
                            context.metadata = contextIn.metadata;
                        }
                        if (kind === "class" && ctor) {
                            if (contextIn.metadata && !contextIn.metadata.__class) {
                                contextIn.metadata.__class = ctor;
                            }
                            if (context.metadata && !context.metadata.__class) {
                                context.metadata.__class = ctor;
                            }
                        }
                        var decoratorValue = kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : (descriptor[key] !== undefined ? descriptor[key] : undefined);
                        var result = decorators[i](decoratorValue, context);
                        if (kind === "accessor") {
                            if (result === void 0) continue;
                            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
                            if (_ = accept(result.get)) descriptor.get = _;
                            if (_ = accept(result.set)) descriptor.set = _;
                            if (_ = accept(result.init)) initializers.unshift(_);
                        }
                        else if (_ = accept(result)) {
                            if (kind === "field") initializers.unshift(_);
                            else descriptor[key] = _;
                        }
                    }
                    if (target) Object.defineProperty(target, contextIn.name, descriptor);
                    done = true;
                };
                var __runInitializers = function (thisArg, initializers, value) {
                    var useValue = arguments.length > 2;
                    for (var i = 0; i < initializers.length; i++) {
                        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
                    }
                    return useValue ? value : void 0;
                };
                var __setFunctionName = function (f, name, prefix) {
                    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
                    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
                };
            `;

            const fullCode = decoratorHelpers + '\n' + this.compiledCode;
            const func = new Function('module', 'exports', 'require', fullCode);
            func(module, moduleExports, require);

            const scriptClass = moduleExports.default || moduleExports;
            if (typeof scriptClass !== 'function') {
                throw new Error('Script must export a default class');
            }

            this.scriptClass = scriptClass as ScriptConstructor;
            this.data = this.scriptClass;
        } catch (error: any) {
            this.error = error.message || String(error);
            throw error;
        }
    }

    unload(): void {
        this.scriptClass = null;
        this.compiledCode = null;
        this.data = null;
    }

    instantiate(entity: Entity): Script | null {
        if (!this.scriptClass) {
            return null;
        }

        return new this.scriptClass(entity);
    }
}
