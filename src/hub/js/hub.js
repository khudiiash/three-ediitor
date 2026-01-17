let invoke;

function initTauriAPI() {
	try {
		if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
			invoke = window.__TAURI__.core.invoke;
			return true;
		}
		if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.core && window.__TAURI_INTERNALS__.core.invoke) {
			invoke = window.__TAURI_INTERNALS__.core.invoke;
			return true;
		}
	} catch (e) {
		console.warn('Error checking for Tauri API:', e);
	}
	return false;
}

let projects = [];
let sortColumn = 'modified';
let sortDirection = 'desc';

async function waitForTauriAPI() {
	let retries = 0;
	const maxRetries = 100;
	
	while (!initTauriAPI() && retries < maxRetries) {
		await new Promise(resolve => setTimeout(resolve, 100));
		retries++;
	}
	
	return invoke !== undefined;
}

async function initialize() {
	if (document.readyState === 'loading') {
		await new Promise(resolve => {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', resolve);
			} else {
				resolve();
			}
		});
	}
	
	await new Promise(resolve => {
		if (document.readyState === 'complete') {
			resolve();
		} else {
			window.addEventListener('load', resolve);
		}
	});
	
	const tauriAvailable = await waitForTauriAPI();
	
	if (!tauriAvailable) {
		const loadingEl = document.getElementById('projects-loading');
		if (loadingEl) {
			loadingEl.textContent = 'Error: Tauri API not available. Make sure you are running this in a Tauri application.';
		}
		console.error('Tauri API not available after waiting');
		return;
	}
	
	try {
		await loadProjects();
		setupEventListeners();
	} catch (error) {
		console.error('Failed to initialize hub:', error);
		const loadingEl = document.getElementById('projects-loading');
		if (loadingEl) {
			loadingEl.textContent = 'Error: ' + (error.message || String(error));
		}
	}
}

initialize();

async function loadProjects() {
	try {
		projects = await invoke('list_projects');
		renderProjects();
	} catch (error) {
		showError('Failed to load projects: ' + error);
	}
}

function renderProjects() {
	const container = document.getElementById('projects-container');
	const table = document.getElementById('projects-table');
	const tbody = document.getElementById('projects-tbody');
	const loading = document.getElementById('projects-loading');
	
	if (!container) {
		return;
	}
	
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
		const newTable = document.getElementById('projects-table');
		const newTbody = document.getElementById('projects-tbody');
		const newLoading = document.getElementById('projects-loading');
		if (!newTable || !newTbody || !newLoading) {
			return;
		}
		const actualTable = newTable;
		const actualTbody = newTbody;
		const actualLoading = newLoading;
		
		setupEventListeners();
		
		if (projects.length === 0) {
			actualLoading.classList.add( 'loading-hidden' );
			actualTable.classList.remove( 'table-visible' );
			container.innerHTML = `
				<div class="empty-state">
					<div class="empty-state-icon">📁</div>
					<div class="empty-state-text">No projects yet. Click "New project" to create one.</div>
				</div>
			`;
			return;
		}
		
		actualLoading.classList.add( 'loading-hidden' );
		actualTable.style.display = '';
		actualTable.classList.add( 'table-visible' );
		
		renderProjectsTable(actualTable, actualTbody);
		return;
	}
	
	if (projects.length === 0) {
		loading.classList.add( 'loading-hidden' );
		table.classList.remove( 'table-visible' );
		container.innerHTML = `
			<div class="empty-state">
				<div class="empty-state-icon">📁</div>
				<div class="empty-state-text">No projects yet. Click "New project" to create one.</div>
			</div>
		`;
		return;
	}

	loading.classList.add( 'loading-hidden' );
	table.style.display = '';
	table.classList.add( 'table-visible' );
	
	renderProjectsTable(table, tbody);
}

function renderProjectsTable(table, tbody) {
	
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
		const rowId = `project-row-${index}`;
		return `
		<tr id="${rowId}" data-path="${escapeHtml(project.path)}">
			<td class="col-favorite">
				<span class="icon-muted">☆</span>
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

	tbody.querySelectorAll('tr').forEach(row => {
		row.addEventListener('click', (e) => {
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
	
	document.getElementById('search-input').addEventListener('input', (e) => {
		filterProjects(e.target.value);
	});
	
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
		if (matches) {
			row.classList.remove( 'table-row-hidden' );
		} else {
			row.classList.add( 'table-row-hidden' );
		}
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

	const submitBtn = document.querySelector('#new-project-form button[type="submit"]');
	if (submitBtn) {
		submitBtn.disabled = true;
	}

	try {
		const path = await invoke('create_project', { name });
		
		await loadProjects();
		
		hideNewProjectModal();
	} catch (error) {
		const errorStr = String(error);
		
		if (errorStr.includes('already exists')) {
			await loadProjects();
			const projectExists = projects.some(p => {
				const projectName = p.name.toLowerCase();
				const inputName = name.toLowerCase();
				return projectName === inputName || p.path.toLowerCase().includes(inputName);
			});
			
			if (projectExists) {
				hideNewProjectModal();
				return;
			}
		}
		
		showError('Failed to create project: ' + error);
	} finally {
		if (submitBtn) {
			submitBtn.disabled = false;
		}
	}
}

async function openProject(path) {
	try {
		await invoke('open_project', { path });
	} catch (error) {
		showError('Failed to open project: ' + error);
	}
}

async function deleteProject(path) {
	const confirmed = await showDeleteConfirmModal();
	if (!confirmed) {
		return;
	}

	try {
		const cleanPath = String(path).trim();
		await invoke('delete_project', { path: cleanPath });
		await loadProjects();
	} catch (error) {
		showError('Failed to delete project: ' + error);
	}
}

function showDeleteConfirmModal() {
	return new Promise((resolve) => {
		const modal = document.createElement('div');
		modal.className = 'modal-overlay';
		
		const dialog = document.createElement('div');
		dialog.className = 'dialog';
		
		const title = document.createElement('div');
		title.className = 'dialog-title';
		title.textContent = 'Delete Project';
		
		const message = document.createElement('div');
		message.className = 'dialog-message';
		message.textContent = 'Are you sure you want to delete this project? This action cannot be undone.';
		
		const buttons = document.createElement('div');
		buttons.className = 'dialog-buttons';
		
		const cancelBtn = document.createElement('button');
		cancelBtn.className = 'dialog-btn dialog-btn-cancel';
		cancelBtn.textContent = 'Cancel';
		cancelBtn.onclick = () => {
			document.body.removeChild(modal);
			resolve(false);
		};
		
		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'dialog-btn dialog-btn-delete';
		deleteBtn.textContent = 'Delete';
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
	
	if (currentMenu && currentMenu.parentNode) {
		currentMenu.parentNode.removeChild(currentMenu);
	}
	
	const menu = document.createElement('div');
	menu.className = 'context-menu';
	menu.style.left = (event.clientX - 120) + 'px';
	menu.style.top = event.clientY + 'px';
	
	const deleteBtn = document.createElement('button');
	deleteBtn.className = 'context-menu-btn';
	deleteBtn.textContent = 'Delete';
	deleteBtn.onclick = (e) => {
		e.stopPropagation();
		if (menu.parentNode) {
			menu.parentNode.removeChild(menu);
		}
		currentMenu = null;
		const projectPath = path;
		deleteProject(projectPath);
	};
	
	menu.appendChild(deleteBtn);
	document.body.appendChild(menu);
	currentMenu = menu;
	
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
	const modal = document.createElement('div');
	modal.className = 'modal-overlay';
	
	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-error';
	
	const title = document.createElement('div');
	title.className = 'dialog-title dialog-title-error';
	title.textContent = 'Error';
	
	const messageEl = document.createElement('div');
	messageEl.className = 'dialog-message';
	messageEl.textContent = message;
	
	const button = document.createElement('button');
	button.className = 'dialog-btn dialog-btn-ok';
	button.textContent = 'OK';
	button.onclick = () => {
		document.body.removeChild(modal);
	};
	
	dialog.appendChild(title);
	dialog.appendChild(messageEl);
	dialog.appendChild(button);
	modal.appendChild(dialog);
	document.body.appendChild(modal);
}

window.deleteProject = deleteProject;
window.showProjectMenu = showProjectMenu;
