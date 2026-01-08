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
        
        // User said the projects directory already exists, but verify it
        if !projects_dir.exists() {
            eprintln!("[ProjectManager] Projects directory does not exist, creating: {:?}", projects_dir);
            fs::create_dir_all(&projects_dir)
                .map_err(|e| format!("Failed to create projects directory: {}", e))?;
        } else if !projects_dir.is_dir() {
            return Err(format!("Projects path exists but is not a directory: {:?}", projects_dir));
        } else {
            eprintln!("[ProjectManager] Projects directory exists: {:?}", projects_dir);
        }

        Ok(ProjectManager { projects_dir })
    }

    fn get_projects_directory() -> Result<PathBuf, String> {
        // Use projects directory in the root of the application
        // Get the current executable directory and go up to find the project root
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?;
        
        // For development: use the current working directory
        // For production: use the directory containing the executable
        let base_dir = if cfg!(debug_assertions) {
            // In development, use current working directory (project root)
            std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?
        } else {
            // In production, use the executable's directory
            exe_path.parent()
                .ok_or("Failed to get executable parent directory")?
                .to_path_buf()
        };
        
        let projects_dir = base_dir.join("projects");
        
        // Debug: Print the path
        eprintln!("[ProjectManager] Projects directory: {:?}", projects_dir);
        eprintln!("[ProjectManager] Base directory: {:?}", base_dir);
        
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

        // Sort by modified date (newest first)
        projects.sort_by(|a, b| b.modified.cmp(&a.modified));

        Ok(projects)
    }

    pub fn create_project(&self, name: &str) -> Result<String, String> {
        // Sanitize project name
        let sanitized_name = sanitize_filename::sanitize(name);
        if sanitized_name.is_empty() {
            return Err("Invalid project name".to_string());
        }

        // Debug: Print the project path
        eprintln!("[ProjectManager] Creating project '{}' (sanitized: '{}')", name, sanitized_name);
        eprintln!("[ProjectManager] Projects dir: {:?}", self.projects_dir);
        eprintln!("[ProjectManager] Projects dir exists: {}", self.projects_dir.exists());
        
        // List all existing projects for debugging
        if self.projects_dir.exists() {
            if let Ok(entries) = fs::read_dir(&self.projects_dir) {
                eprintln!("[ProjectManager] Existing entries in projects directory:");
                let mut entry_count = 0;
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        eprintln!("  - {:?} (is_dir: {})", path, path.is_dir());
                        entry_count += 1;
                    }
                }
                if entry_count == 0 {
                    eprintln!("  (directory is empty)");
                }
            }
        } else {
            eprintln!("[ProjectManager] WARNING: Projects directory does not exist!");
            // Create it if it doesn't exist (shouldn't happen since user said it exists)
            fs::create_dir_all(&self.projects_dir)
                .map_err(|e| {
                    eprintln!("[ProjectManager] Error creating projects directory: {}", e);
                    eprintln!("[ProjectManager] Full path: {:?}", self.projects_dir);
                    format!("Failed to create projects directory: {} (path: {:?})", e, self.projects_dir)
                })?;
        }

        let project_path = self.projects_dir.join(&sanitized_name);
        eprintln!("[ProjectManager] Project path: {:?}", project_path);
        eprintln!("[ProjectManager] Project path exists before creation: {}", project_path.exists());
        eprintln!("[ProjectManager] Project path is_dir (if exists): {}", 
            project_path.exists() && project_path.is_dir());

        // Check if project exists - simple direct path check only
        // On Windows, the filesystem is case-insensitive, so this check is sufficient
        eprintln!("[ProjectManager] Checking if project path exists: {:?}", project_path);
        eprintln!("[ProjectManager] Path exists check result: {}", project_path.exists());
        
        if project_path.exists() {
            eprintln!("[ProjectManager] Path exists, checking if it's a directory...");
            let is_dir = project_path.is_dir();
            eprintln!("[ProjectManager] Is directory: {}", is_dir);
            
            if is_dir {
                // Verify it's actually a project directory (has project.json or assets/builds)
                let metadata_path = project_path.join("project.json");
                let assets_path = project_path.join("assets");
                let builds_path = project_path.join("builds");
                
                let has_metadata = metadata_path.exists();
                let has_assets = assets_path.exists();
                let has_builds = builds_path.exists();
                
                eprintln!("[ProjectManager] Project validation - metadata: {}, assets: {}, builds: {}", 
                    has_metadata, has_assets, has_builds);
                
                if has_metadata || has_assets || has_builds {
                    eprintln!("[ProjectManager] ERROR: Valid project directory already exists: {:?}", project_path);
                    return Err(format!("Project '{}' already exists", sanitized_name));
                } else {
                    // Directory exists but doesn't look like a project - might be leftover from failed creation
                    eprintln!("[ProjectManager] Directory exists but doesn't look like a project, removing: {:?}", project_path);
                    match fs::remove_dir_all(&project_path) {
                        Ok(_) => eprintln!("[ProjectManager] Removed incomplete project directory"),
                        Err(e) => {
                            eprintln!("[ProjectManager] Failed to remove incomplete directory: {}", e);
                            return Err(format!("Failed to remove incomplete project directory: {}", e));
                        }
                    }
                }
            } else {
                // If it exists but isn't a directory, remove it
                eprintln!("[ProjectManager] Path exists but is not a directory, removing: {:?}", project_path);
                fs::remove_file(&project_path)
                    .map_err(|e| format!("Failed to remove existing file: {}", e))?;
            }
        } else {
            eprintln!("[ProjectManager] Path does not exist, safe to create");
        }
        
        eprintln!("[ProjectManager] No existing project found, proceeding with creation");
        
        // Create project directory structure
        eprintln!("[ProjectManager] Creating project directory: {:?}", project_path);
        fs::create_dir_all(&project_path)
            .map_err(|e| {
                eprintln!("[ProjectManager] Error creating project directory: {}", e);
                eprintln!("[ProjectManager] Error details - path: {:?}, parent exists: {}", 
                    project_path, project_path.parent().map(|p| p.exists()).unwrap_or(false));
                format!("Failed to create project directory: {} (path: {:?})", e, project_path)
            })?;

        eprintln!("[ProjectManager] Project directory created: {}", project_path.exists());
        eprintln!("[ProjectManager] Project directory is_dir: {}", project_path.is_dir());

        fs::create_dir_all(project_path.join("assets"))
            .map_err(|e| {
                eprintln!("[ProjectManager] Error creating assets directory: {}", e);
                format!("Failed to create assets directory: {}", e)
            })?;

        fs::create_dir_all(project_path.join("builds"))
            .map_err(|e| {
                eprintln!("[ProjectManager] Error creating builds directory: {}", e);
                format!("Failed to create builds directory: {}", e)
            })?;

        // Create project metadata file
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

        // Verify all directories were created
        if !project_path.exists() {
            return Err(format!("Project directory was not created: {:?}", project_path));
        }
        if !project_path.join("assets").exists() {
            return Err(format!("Assets directory was not created: {:?}", project_path.join("assets")));
        }
        if !project_path.join("builds").exists() {
            return Err(format!("Builds directory was not created: {:?}", project_path.join("builds")));
        }
        if !metadata_path.exists() {
            return Err(format!("Metadata file was not created: {:?}", metadata_path));
        }

        eprintln!("[ProjectManager] Project created successfully at: {:?}", project_path);
        eprintln!("[ProjectManager] Project structure verified");
        Ok(project_path.to_string_lossy().to_string())
    }

    pub fn delete_project(&self, path: &str) -> Result<(), String> {
        let project_path = Path::new(path);
        
        eprintln!("[ProjectManager] Delete project - input path: {}", path);
        eprintln!("[ProjectManager] Delete project - path exists: {}", project_path.exists());
        eprintln!("[ProjectManager] Delete project - projects_dir: {:?}", self.projects_dir);
        eprintln!("[ProjectManager] Delete project - path starts with projects_dir: {}", project_path.starts_with(&self.projects_dir));

        if !project_path.exists() {
            eprintln!("[ProjectManager] Project path does not exist: {:?}", project_path);
            return Err("Project does not exist".to_string());
        }

        // Verify it's within the projects directory for safety
        if !project_path.starts_with(&self.projects_dir) {
            eprintln!("[ProjectManager] Invalid project path - not within projects directory");
            return Err("Invalid project path".to_string());
        }

        eprintln!("[ProjectManager] Attempting to remove directory: {:?}", project_path);
        fs::remove_dir_all(project_path)
            .map_err(|e| {
                eprintln!("[ProjectManager] Error removing directory: {}", e);
                format!("Failed to delete project: {}", e)
            })?;
        
        eprintln!("[ProjectManager] Project directory removed successfully");
        
        // Verify deletion
        if project_path.exists() {
            eprintln!("[ProjectManager] Warning: Project path still exists after deletion attempt");
            return Err("Failed to delete project: directory still exists".to_string());
        }

        Ok(())
    }

    fn get_project_info(&self, path: &Path) -> Result<ProjectInfo, String> {
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid project path")?
            .to_string();

        // Try to read metadata
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

        // Get modified time from project.json, fallback to directory modified time
        let modified = if metadata_path.exists() {
            if let Ok(content) = fs::read_to_string(&metadata_path) {
                if let Ok(metadata) = serde_json::from_str::<serde_json::Value>(&content) {
                    // Try to get "modified" field first, fallback to "created"
                    metadata.get("modified")
                        .or_else(|| metadata.get("created"))
                        .and_then(|m| m.as_u64())
                        .unwrap_or_else(|| {
                            // Fallback to directory modified time
                            path.metadata()
                                .ok()
                                .and_then(|m| m.modified().ok())
                                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0)
                        })
                } else {
                    // If JSON parse fails, use directory modified time
                    path.metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                }
            } else {
                // If read fails, use directory modified time
                path.metadata()
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0)
            }
        } else {
            // If project.json doesn't exist, use directory modified time
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

