// Use Tauri v1 API
let invoke;

function initTauriAPI() {
	if (window.__TAURI__ && window.__TAURI__.invoke) {
		invoke = window.__TAURI__.invoke;
		console.log('Tauri API loaded successfully');
		return true;
	} else {
		console.error('Tauri API not found!', window.__TAURI__);
		return false;
	}
}

let projects = [];
let sortColumn = 'modified';
let sortDirection = 'desc';

// Initialize hub
document.addEventListener('DOMContentLoaded', async () => {
	// Wait a bit for Tauri to inject the API
	let retries = 0;
	while (!initTauriAPI() && retries < 10) {
		await new Promise(resolve => setTimeout(resolve, 100));
		retries++;
	}
	
	if (!invoke) {
		document.getElementById('projects-loading').textContent = 'Error: Tauri API not available';
		console.error('Failed to load Tauri API after retries');
		return;
	}
	
	console.log('Hub initialized, loading projects...');
	await loadProjects();
	setupEventListeners();
});

async function loadProjects() {
	try {
		console.log('Calling list_projects...');
		projects = await invoke('list_projects');
		console.log('Projects loaded:', projects);
		renderProjects();
	} catch (error) {
		console.error('Failed to load projects:', error);
		showError('Failed to load projects: ' + error);
	}
}

function renderProjects() {
	const container = document.getElementById('projects-container');
	const table = document.getElementById('projects-table');
	const tbody = document.getElementById('projects-tbody');
	const loading = document.getElementById('projects-loading');
	
	// Ensure container exists and restore structure if needed
	if (!container) {
		console.error('projects-container not found');
		return;
	}
	
	// If container was replaced with innerHTML, restore the structure
	if (!table || !tbody || !loading) {
		container.innerHTML = `
			<div id="projects-loading" style="display: none; padding: 20px; text-align: center; color: #858585;">Loading projects...</div>
			<table id="projects-table" style="display: none;">
				<thead>
					<tr>
						<th class="col-favorite"></th>
						<th class="col-link"></th>
						<th class="col-name sortable" data-column="name">Name</th>
						<th class="col-path">Path</th>
						<th class="col-modified sortable" data-column="modified">Modified</th>
						<th class="col-actions"></th>
					</tr>
				</thead>
				<tbody id="projects-tbody"></tbody>
			</table>
		`;
		// Re-get references after restoring
		const newTable = document.getElementById('projects-table');
		const newTbody = document.getElementById('projects-tbody');
		const newLoading = document.getElementById('projects-loading');
		if (!newTable || !newTbody || !newLoading) {
			console.error('Failed to restore project table structure');
			return;
		}
		// Update references
		const actualTable = newTable;
		const actualTbody = newTbody;
		const actualLoading = newLoading;
		
		// Re-setup sort handlers
		setupEventListeners();
		
		if (projects.length === 0) {
			actualLoading.style.display = 'none';
			actualTable.style.display = 'none';
			container.innerHTML = `
				<div class="empty-state">
					<div class="empty-state-icon">📁</div>
					<div class="empty-state-text">No projects yet. Click "New project" to create one.</div>
				</div>
			`;
			return;
		}
		
		actualLoading.style.display = 'none';
		actualTable.style.display = 'table';
		
		// Continue with rendering using actualTable and actualTbody
		renderProjectsTable(actualTable, actualTbody);
		return;
	}
	
	if (projects.length === 0) {
		loading.style.display = 'none';
		table.style.display = 'none';
		container.innerHTML = `
			<div class="empty-state">
				<div class="empty-state-icon">📁</div>
				<div class="empty-state-text">No projects yet. Click "New project" to create one.</div>
			</div>
		`;
		return;
	}

	loading.style.display = 'none';
	table.style.display = 'table';
	
	renderProjectsTable(table, tbody);
}

function renderProjectsTable(table, tbody) {
	
	// Sort projects
	const sortedProjects = [...projects].sort((a, b) => {
		if (sortColumn === 'modified') {
			return sortDirection === 'asc' 
				? a.modified - b.modified 
				: b.modified - a.modified;
		} else if (sortColumn === 'name') {
			return sortDirection === 'asc'
				? a.name.localeCompare(b.name)
				: b.name.localeCompare(a.name);
		}
		return 0;
	});

	tbody.innerHTML = sortedProjects.map((project, index) => {
		// Store path in a data attribute that won't be escaped
		const rowId = `project-row-${index}`;
		return `
		<tr id="${rowId}" data-path="${escapeHtml(project.path)}">
			<td class="col-favorite">
				<span style="color: #858585; cursor: pointer;">☆</span>
			</td>
			<td class="col-link">
				<span style="color: #858585;">🔗</span>
			</td>
			<td class="col-name">${escapeHtml(project.name)}</td>
			<td class="col-path" title="${escapeHtml(project.path)}">${truncatePath(project.path)}</td>
			<td class="col-modified">${formatRelativeDate(project.modified)}</td>
			<td class="col-actions">
				<button class="project-actions-btn" data-project-path="${escapeHtml(project.path)}">⋯</button>
			</td>
		</tr>
		`;
	}).join('');

	// Add click handlers
	tbody.querySelectorAll('tr').forEach(row => {
		row.addEventListener('click', (e) => {
			// Don't open if clicking on action buttons
			if (e.target.closest('.project-actions-btn')) {
				const btn = e.target.closest('.project-actions-btn');
				const path = btn.dataset.projectPath;
				if (path) {
					showProjectMenu(path, e);
				}
				return;
			}
			const path = row.dataset.path;
			if (path) {
				openProject(path);
			}
		});
	});
}

function setupEventListeners() {
	document.getElementById('new-project-btn').addEventListener('click', showNewProjectModal);
	document.getElementById('modal-cancel').addEventListener('click', hideNewProjectModal);
	document.getElementById('modal-create').addEventListener('click', createProject);
	document.getElementById('new-project-form').addEventListener('submit', (e) => {
		e.preventDefault();
		createProject();
	});
	
	// Search
	document.getElementById('search-input').addEventListener('input', (e) => {
		filterProjects(e.target.value);
	});
	
	// Sort columns
	document.querySelectorAll('.sortable').forEach(header => {
		header.addEventListener('click', () => {
			const column = header.dataset.sort;
			if (sortColumn === column) {
				sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				sortColumn = column;
				sortDirection = 'desc';
			}
			updateSortIndicators();
			renderProjects();
		});
	});
}

function updateSortIndicators() {
	document.querySelectorAll('.sort-indicator').forEach(indicator => {
		indicator.textContent = '';
	});
	const activeHeader = document.querySelector(`.sortable[data-sort="${sortColumn}"]`);
	if (activeHeader) {
		const indicator = activeHeader.querySelector('.sort-indicator');
		if (indicator) {
			indicator.textContent = sortDirection === 'asc' ? '▲' : '▼';
		}
	}
}

function filterProjects(query) {
	const rows = document.querySelectorAll('#projects-tbody tr');
	const lowerQuery = query.toLowerCase();
	
	rows.forEach(row => {
		const name = row.querySelector('.col-name').textContent.toLowerCase();
		const path = row.querySelector('.col-path').textContent.toLowerCase();
		const matches = name.includes(lowerQuery) || path.includes(lowerQuery);
		row.style.display = matches ? '' : 'none';
	});
}

function showNewProjectModal() {
	document.getElementById('new-project-modal').classList.add('active');
	document.getElementById('project-name-input').focus();
}

function hideNewProjectModal() {
	document.getElementById('new-project-modal').classList.remove('active');
	document.getElementById('new-project-form').reset();
}

async function createProject() {
	const name = document.getElementById('project-name-input').value.trim();
	
	if (!name) {
		showError('Please enter a project name');
		return;
	}

	// Disable the button to prevent double-clicks
	const submitBtn = document.querySelector('#new-project-form button[type="submit"]');
	if (submitBtn) {
		submitBtn.disabled = true;
	}

	try {
		console.log('Creating project with name:', name);
		const path = await invoke('create_project', { name });
		console.log('Project created successfully at path:', path);
		
		// Reload projects list to show the new project
		await loadProjects();
		console.log('Projects list reloaded');
		
		// Hide modal and reset form
		hideNewProjectModal();
	} catch (error) {
		console.error('Create project error:', error);
		const errorStr = String(error);
		
		// If error is "already exists", check if project was actually created
		if (errorStr.includes('already exists')) {
			// Reload projects to check if it exists
			await loadProjects();
			const projectExists = projects.some(p => {
				const projectName = p.name.toLowerCase();
				const inputName = name.toLowerCase();
				return projectName === inputName || p.path.toLowerCase().includes(inputName);
			});
			
			if (projectExists) {
				console.log('Project already exists in list - creation may have succeeded');
				hideNewProjectModal();
				return; // Don't show error if project exists
			}
		}
		
		// Show error for other cases
		showError('Failed to create project: ' + error);
	} finally {
		// Re-enable the button
		if (submitBtn) {
			submitBtn.disabled = false;
		}
	}
}

async function openProject(path) {
	try {
		console.log('Opening project:', path);
		await invoke('open_project', { path });
		console.log('Project opened successfully');
	} catch (error) {
		console.error('Failed to open project:', error);
		showError('Failed to open project: ' + error);
	}
}

async function deleteProject(path) {
	// Show custom confirmation modal
	const confirmed = await showDeleteConfirmModal();
	if (!confirmed) {
		return;
	}

	try {
		console.log('Deleting project - raw path:', path);
		console.log('Deleting project - path type:', typeof path);
		console.log('Deleting project - path length:', path?.length);
		
		// Ensure path is a string and properly formatted
		const cleanPath = String(path).trim();
		console.log('Deleting project - cleaned path:', cleanPath);
		
		await invoke('delete_project', { path: cleanPath });
		console.log('Project deleted successfully');
		await loadProjects();
	} catch (error) {
		console.error('Failed to delete project:', error);
		showError('Failed to delete project: ' + error);
	}
}

function showDeleteConfirmModal() {
	return new Promise((resolve) => {
		const modal = document.createElement('div');
		modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
		
		const dialog = document.createElement('div');
		dialog.style.cssText = 'background: #252526; border: 1px solid #3e3e42; border-radius: 4px; padding: 20px; min-width: 300px; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
		
		const title = document.createElement('div');
		title.textContent = 'Delete Project';
		title.style.cssText = 'font-size: 16px; font-weight: 600; color: #cccccc; margin-bottom: 12px;';
		
		const message = document.createElement('div');
		message.textContent = 'Are you sure you want to delete this project? This action cannot be undone.';
		message.style.cssText = 'color: #cccccc; margin-bottom: 20px; line-height: 1.5;';
		
		const buttons = document.createElement('div');
		buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
		
		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.style.cssText = 'padding: 6px 16px; background: transparent; border: 1px solid #3e3e42; color: #cccccc; cursor: pointer; border-radius: 2px;';
		cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(255,255,255,0.1)';
		cancelBtn.onmouseout = () => cancelBtn.style.background = 'transparent';
		cancelBtn.onclick = () => {
			document.body.removeChild(modal);
			resolve(false);
		};
		
		const deleteBtn = document.createElement('button');
		deleteBtn.textContent = 'Delete';
		deleteBtn.style.cssText = 'padding: 6px 16px; background: #c72e2e; border: none; color: #ffffff; cursor: pointer; border-radius: 2px;';
		deleteBtn.onmouseover = () => deleteBtn.style.background = '#d73a3a';
		deleteBtn.onmouseout = () => deleteBtn.style.background = '#c72e2e';
		deleteBtn.onclick = () => {
			document.body.removeChild(modal);
			resolve(true);
		};
		
		buttons.appendChild(cancelBtn);
		buttons.appendChild(deleteBtn);
		
		dialog.appendChild(title);
		dialog.appendChild(message);
		dialog.appendChild(buttons);
		modal.appendChild(dialog);
		document.body.appendChild(modal);
		
		// Close on escape key
		const escapeHandler = (e) => {
			if (e.key === 'Escape') {
				document.body.removeChild(modal);
				document.removeEventListener('keydown', escapeHandler);
				resolve(false);
			}
		};
		document.addEventListener('keydown', escapeHandler);
	});
}

let currentMenu = null;

function showProjectMenu(path, event) {
	event.stopPropagation();
	event.preventDefault();
	
	// Remove existing menu if any
	if (currentMenu && currentMenu.parentNode) {
		currentMenu.parentNode.removeChild(currentMenu);
	}
	
	// Create a simple context menu
	const menu = document.createElement('div');
	menu.style.cssText = 'position: fixed; background: #252526; border: 1px solid #3e3e42; border-radius: 4px; padding: 4px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); min-width: 120px;';
	menu.style.left = event.clientX + 'px';
	menu.style.top = event.clientY + 'px';
	
	const deleteBtn = document.createElement('button');
	deleteBtn.textContent = 'Delete';
	deleteBtn.style.cssText = 'display: block; width: 100%; padding: 8px 16px; background: transparent; border: none; color: #cccccc; text-align: left; cursor: pointer; font-size: 13px;';
	deleteBtn.onmouseover = () => deleteBtn.style.background = 'rgba(255,255,255,0.1)';
	deleteBtn.onmouseout = () => deleteBtn.style.background = 'transparent';
	deleteBtn.onclick = (e) => {
		e.stopPropagation();
		if (menu.parentNode) {
			menu.parentNode.removeChild(menu);
		}
		currentMenu = null;
		// Use the path from the closure, not from event
		const projectPath = path;
		console.log('Delete button clicked, path from closure:', projectPath);
		deleteProject(projectPath);
	};
	
	menu.appendChild(deleteBtn);
	document.body.appendChild(menu);
	currentMenu = menu;
	
	// Close menu when clicking outside
	const closeMenu = (e) => {
		if (menu.parentNode && !menu.contains(e.target)) {
			menu.parentNode.removeChild(menu);
			currentMenu = null;
			document.removeEventListener('click', closeMenu);
		}
	};
	setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function truncatePath(path) {
	if (path.length > 50) {
		return '...' + path.slice(-47);
	}
	return path;
}

function formatRelativeDate(timestamp) {
	if (!timestamp) return 'Unknown';
	const now = Math.floor(Date.now() / 1000);
	const diff = now - timestamp;
	
	if (diff < 60) return 'Just now';
	if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
	if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
	if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
	if (diff < 2592000) return Math.floor(diff / 604800) + ' weeks ago';
	if (diff < 31536000) return Math.floor(diff / 2592000) + ' months ago';
	return Math.floor(diff / 31536000) + ' years ago';
}

function showError(message) {
	// Create a custom error modal instead of using alert()
	const modal = document.createElement('div');
	modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
	
	const dialog = document.createElement('div');
	dialog.style.cssText = 'background: #252526; border: 1px solid #c72e2e; border-radius: 4px; padding: 20px; min-width: 300px; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
	
	const title = document.createElement('div');
	title.textContent = 'Error';
	title.style.cssText = 'font-size: 16px; font-weight: 600; color: #c72e2e; margin-bottom: 12px;';
	
	const messageEl = document.createElement('div');
	messageEl.textContent = message;
	messageEl.style.cssText = 'color: #cccccc; margin-bottom: 20px; line-height: 1.5;';
	
	const button = document.createElement('button');
	button.textContent = 'OK';
	button.style.cssText = 'padding: 6px 16px; background: #007acc; border: none; color: #ffffff; cursor: pointer; border-radius: 2px; float: right;';
	button.onmouseover = () => button.style.background = '#0086d1';
	button.onmouseout = () => button.style.background = '#007acc';
	button.onclick = () => {
		document.body.removeChild(modal);
	};
	
	dialog.appendChild(title);
	dialog.appendChild(messageEl);
	dialog.appendChild(button);
	modal.appendChild(dialog);
	document.body.appendChild(modal);
}

// Make functions available globally
window.deleteProject = deleteProject;
window.showProjectMenu = showProjectMenu;
