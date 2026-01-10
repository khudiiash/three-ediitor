use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub modified: u64,
}

pub struct ProjectManager {
    projects_dir: PathBuf,
}

impl ProjectManager {
    pub fn new() -> Result<Self, String> {
        let projects_dir = Self::get_projects_directory()?;
        
        if !projects_dir.exists() {
            fs::create_dir_all(&projects_dir)
                .map_err(|e| format!("Failed to create projects directory: {}", e))?;
        } else if !projects_dir.is_dir() {
            return Err(format!("Projects path exists but is not a directory: {:?}", projects_dir));
        } else {
        }

        Ok(ProjectManager { projects_dir })
    }

    fn get_projects_directory() -> Result<PathBuf, String> {
        if let Ok(env_path) = std::env::var("THREE_ENGINE_PROJECTS_DIR") {
            let path = PathBuf::from(env_path);
            if path.is_absolute() {
                return Ok(path);
            }
        }
        
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?;
        
        let base_dir = if cfg!(debug_assertions) {
            std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))? 
        } else {
            exe_path.parent()
                .ok_or("Failed to get executable parent directory")?
                .to_path_buf()
        };
        
        let projects_dir = base_dir.join("projects");
        
        Ok(projects_dir)
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectInfo>, String> {
        let mut projects = Vec::new();

        if !self.projects_dir.exists() {
            return Ok(projects);
        }

        let entries = fs::read_dir(&self.projects_dir)
            .map_err(|e| format!("Failed to read projects directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_dir() {
                let project_info = self.get_project_info(&path)?;
                projects.push(project_info);
            }
        }

        projects.sort_by(|a, b| b.modified.cmp(&a.modified));

        Ok(projects)
    }

    pub fn create_project(&self, name: &str) -> Result<String, String> {
        let sanitized_name = sanitize_filename::sanitize(name);
        if sanitized_name.is_empty() {
            return Err("Invalid project name".to_string());
        }

        if self.projects_dir.exists() {
            if let Ok(entries) = fs::read_dir(&self.projects_dir) {
                let mut entry_count = 0;
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        entry_count += 1;
                    }
                }
                if entry_count == 0 {
                }
            }
        } else {
            fs::create_dir_all(&self.projects_dir)
                .map_err(|e| {
                    format!("Failed to create projects directory: {} (path: {:?})", e, self.projects_dir)
                })?;
        }

        let project_path = self.projects_dir.join(&sanitized_name);
        if project_path.exists() {
            let is_dir = project_path.is_dir();
            if is_dir {
                let metadata_path = project_path.join("project.json");
                let assets_path = project_path.join("assets");
                let builds_path = project_path.join("builds");
                
                let has_metadata = metadata_path.exists();
                let has_assets = assets_path.exists();
                let has_builds = builds_path.exists();
                
                if has_metadata || has_assets || has_builds {
                    return Err(format!("Project '{}' already exists", sanitized_name));
                }
            } else {
                fs::remove_file(&project_path)
                    .map_err(|e| format!("Failed to remove existing file: {}", e))?;
            }
        } else {
        }
        
        fs::create_dir_all(&project_path)
            .map_err(|e| {
                format!("Failed to create project directory: {} (path: {:?})", e, project_path)
            })?;

        fs::create_dir_all(project_path.join("assets"))
            .map_err(|e| {
                format!("Failed to create assets directory: {}", e)
            })?;

        fs::create_dir_all(project_path.join("builds"))
            .map_err(|e| {
                format!("Failed to create builds directory: {}", e)
            })?;

                fs::create_dir_all(project_path.join("build"))
                    .map_err(|e| {
                        format!("Failed to create build directory: {}", e)
                    })?;

                let tsconfig_content = r#"{
                    "compilerOptions": {
                        "target": "ES2020",
                        "module": "ESNext",
                        "lib": ["ES2020", "DOM"],
                        "moduleResolution": "bundler",
                        "strict": false,
                        "esModuleInterop": true,
                        "skipLibCheck": true,
                        "forceConsistentCasingInFileNames": true,
                        "resolveJsonModule": true,
                        "experimentalDecorators": true,
                        "emitDecoratorMetadata": true,
                        "baseUrl": ".",
                        "paths": {
                        "@engine/*": ["../../src/engine/src/*"]
                        },
                        "types": ["three"]
                    },
                    "include": ["assets/**/*.ts"],
                    "exclude": ["node_modules"]
                    }"#;
                let tsconfig_path = project_path.join("tsconfig.json");
                fs::write(&tsconfig_path, tsconfig_content)
                    .map_err(|e| format!("Failed to write tsconfig.json: {}", e))?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let metadata = serde_json::json!({
            "name": name,
            "created": now,
            "modified": now,
            "version": "1.0.0"
        });

        let metadata_path = project_path.join("project.json");
        fs::write(
            &metadata_path,
            serde_json::to_string_pretty(&metadata)
                .map_err(|e| format!("Failed to serialize metadata: {}", e))?
        )
        .map_err(|e| {
            eprintln!("[ProjectManager] Error writing metadata: {}", e);
            format!("Failed to write metadata: {}", e)
        })?;

        if !project_path.exists() {
            return Err(format!("Project directory was not created: {:?}", project_path));
        }
        if !project_path.join("assets").exists() {
            return Err(format!("Assets directory was not created: {:?}", project_path.join("assets")));
        }
        if !project_path.join("builds").exists() {
            return Err(format!("Builds directory was not created: {:?}", project_path.join("builds")));
        }
        if !project_path.join("build").exists() {
            return Err(format!("Build directory was not created: {:?}", project_path.join("build")));
        }
        if !metadata_path.exists() {
            return Err(format!("Metadata file was not created: {:?}", metadata_path));
        }

        Ok(project_path.to_string_lossy().to_string())
    }

    pub fn delete_project(&self, path: &str) -> Result<(), String> {
        let project_path = Path::new(path);
        
        if !project_path.exists() {
            return Err("Project does not exist".to_string());
        }

        if !project_path.starts_with(&self.projects_dir) {
            return Err("Invalid project path".to_string());
        }

        fs::remove_dir_all(project_path)
            .map_err(|e| {
                format!("Failed to delete project: {}", e)
            })?;
        
        if project_path.exists() {
            return Err("Failed to delete project: directory still exists".to_string());
        }

        Ok(())
    }

    fn get_project_info(&self, path: &Path) -> Result<ProjectInfo, String> {
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid project path")?
            .to_string();

        let metadata_path = path.join("project.json");
        let display_name = if metadata_path.exists() {
            if let Ok(content) = fs::read_to_string(&metadata_path) {
                if let Ok(metadata) = serde_json::from_str::<serde_json::Value>(&content) {
                    metadata.get("name")
                        .and_then(|n| n.as_str())
                        .unwrap_or(&name)
                        .to_string()
                } else {
                    name.clone()
                }
            } else {
                name.clone()
            }
        } else {
            name.clone()
        };

        let modified = if metadata_path.exists() {
            if let Ok(content) = fs::read_to_string(&metadata_path) {
                if let Ok(metadata) = serde_json::from_str::<serde_json::Value>(&content) {
                    metadata.get("modified")
                        .or_else(|| metadata.get("created"))
                        .and_then(|m| m.as_u64())
                        .unwrap_or_else(|| {
                            path.metadata()
                                .ok()
                                .and_then(|m| m.modified().ok())
                                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0)
                        })
                } else {
                    path.metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                }
            } else {
                path.metadata()
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0)
            }
        } else {
            path.metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0)
        };

        Ok(ProjectInfo {
            name: display_name,
            path: path.to_string_lossy().to_string(),
            modified,
        })
    }
}

