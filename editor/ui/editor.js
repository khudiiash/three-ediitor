// Wait for Tauri to be ready
let invoke, listen;

async function initTauri() {
    // Wait for Tauri API to be available
    let attempts = 0;
    while (!window.__TAURI__ && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.__TAURI__) {
        console.error('Tauri API not available after 5 seconds');
        logMessage('[ERROR] Tauri API not available - running in browser mode?');
        return;
    }
    
    invoke = window.__TAURI__.tauri.invoke;
    listen = window.__TAURI__.event.listen;
    console.log('Tauri API loaded successfully');
    logMessage('[INFO] Tauri API loaded');
}

let connected = false;
let playing = false;
let entities = [];
let selectedEntity = null;

// DOM Elements
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const connectionStatus = document.getElementById('connection-status');
const fpsCounter = document.getElementById('fps-counter');
const addEntityBtn = document.getElementById('add-entity-btn');
const entityList = document.getElementById('entity-list');
const inspectorContent = document.getElementById('inspector-content');
const consoleOutput = document.getElementById('console-output');

// Initialize
async function init() {
    logMessage('[INFO] Editor UI initializing...');
    await initTauri();
    setupEventListeners();
    await setupTauriListeners();
    checkConnection();
    logMessage('[INFO] Editor UI initialized');
}

// Setup Tauri event listeners
async function setupTauriListeners() {
    // Listen for engine messages
    await listen('engine-message', (event) => {
        try {
            const message = JSON.parse(event.payload);
            handleMessage(message);
        } catch (e) {
            logMessage('[ERROR] Failed to parse message: ' + e);
        }
    });

    // Listen for frame stats
    await listen('frame-stats', (event) => {
        const { fps, entity_count } = event.payload;
        fpsCounter.textContent = `FPS: ${fps} | Entities: ${entity_count}`;
    });

    logMessage('[INFO] Tauri listeners initialized');
}

// Check connection status periodically
async function checkConnection() {
    if (!invoke) {
        setTimeout(checkConnection, 1000);
        return;
    }
    
    try {
        const isConnected = await invoke('get_connection_status');
        if (isConnected !== connected) {
            connected = isConnected;
            connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
            connectionStatus.className = connected ? 'status-connected' : 'status-disconnected';
            
            if (connected) {
                logMessage('[INFO] Engine connected');
                sendMessage({ type: 'GetSceneState' });
                
                // Reload iframe if it was disconnected
                const iframe = document.getElementById('viewport-frame');
                if (iframe && iframe.src && !iframe.src.includes('?')) {
                    console.log('[Editor] Reloading viewport iframe...');
                    iframe.src = iframe.src + '?t=' + Date.now();
                }
            } else {
                logMessage('[WARN] Engine disconnected');
            }
        }
    } catch (e) {
        console.error('Connection check error:', e);
        logMessage('[ERROR] Failed to check connection: ' + e);
    }
    
    setTimeout(checkConnection, 1000);
}

async function sendMessage(message) {
    try {
        await invoke('send_to_engine', { message: JSON.stringify(message) });
    } catch (e) {
        logMessage('[ERROR] Failed to send message: ' + e);
    }
}

function handleMessage(message) {
    switch (message.type) {
        case 'Connected':
            logMessage('[INFO] Engine acknowledged connection');
            break;
            
        case 'FrameStats':
            fpsCounter.textContent = `FPS: ${message.fps} | Entities: ${message.entity_count}`;
            break;
            
        case 'SceneState':
            updateSceneState(message.scene_json);
            break;
            
        case 'EntityCreated':
            logMessage(`[INFO] Entity created: ${message.name} (ID: ${message.entity_id})`);
            // Debounce scene state requests
            clearTimeout(window.sceneStateTimeout);
            window.sceneStateTimeout = setTimeout(() => {
                sendMessage({ type: 'GetSceneState' });
            }, 100);
            break;
            
        case 'EntityDeleted':
            logMessage(`[INFO] Entity deleted: ID ${message.entity_id}`);
            sendMessage({ type: 'GetSceneState' });
            break;
            
        case 'TransformUpdated':
            // Update the entity's transform in the local entities array
            if (message.entity_id !== undefined) {
                const entity = entities.find(e => e.id === message.entity_id);
                if (entity && entity.components && entity.components.Transform) {
                    const transform = entity.components.Transform;
                    if (message.position) transform.position = message.position;
                    if (message.rotation) transform.rotation = message.rotation;
                    if (message.scale) transform.scale = message.scale;
                    
                    // Update inspector if this entity is selected
                    if (selectedEntity === message.entity_id) {
                        renderInspector(entity);
                    }
                }
            }
            break;
            
        case 'EntitySelected':
            // Entity was selected via click in viewport
            if (message.entity_id !== null && message.entity_id !== undefined) {
                const entity = entities.find(e => e.id === message.entity_id);
                if (entity) {
                    selectEntity(entity);
                }
            } else {
                // Deselect
                selectedEntity = null;
                renderEntityList();
                renderInspector(null);
            }
            break;
            
        case 'Error':
            logMessage(`[ERROR] ${message.message}`);
            break;
            
        default:
            console.log('Unknown message type:', message);
    }
}

// Build a flat map of all entities (including children) for easy lookup
function buildEntityMap(entityTree, map = {}) {
    if (Array.isArray(entityTree)) {
        entityTree.forEach(entity => buildEntityMap(entity, map));
    } else if (entityTree) {
        map[entityTree.id] = entityTree;
        if (entityTree.children && Array.isArray(entityTree.children)) {
            entityTree.children.forEach(child => buildEntityMap(child, map));
        }
    }
    return map;
}

function updateSceneState(sceneJson) {
    try {
        const scene = JSON.parse(sceneJson);
        const entityTree = scene.entities || [];
        
        // Build flat map of all entities for easy lookup
        const entityMap = buildEntityMap(entityTree);
        entities = Object.values(entityMap);
        
        // Convert components array to object for easier access
        entities.forEach(entity => {
            if (Array.isArray(entity.components)) {
                const componentsObj = {};
                entity.components.forEach(comp => {
                    componentsObj[comp.type] = comp;
                });
                entity.components = componentsObj;
            }
        });
        
        // Store the tree structure for hierarchy rendering
        window.entityTree = entityTree;
        
        renderEntityList();
        logMessage(`[INFO] Scene updated: ${entities.length} entities`);
    } catch (e) {
        logMessage('[ERROR] Failed to parse scene: ' + e);
    }
}

// Event Listeners
function setupEventListeners() {
    playBtn.addEventListener('click', () => {
        if (!playing) {
            playing = true;
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            sendMessage({ type: 'SetPlayMode', playing: true });
            logMessage('[INFO] Play mode started');
        }
    });
    
    pauseBtn.addEventListener('click', () => {
        if (playing) {
            playing = false;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            sendMessage({ type: 'SetPlayMode', playing: false });
            logMessage('[INFO] Play mode paused');
        }
    });
    
    stopBtn.addEventListener('click', () => {
        playing = false;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        sendMessage({ type: 'SetPlayMode', playing: false });
        logMessage('[INFO] Play mode stopped');
    });
    
    addEntityBtn.addEventListener('click', () => {
        const entityName = `Entity_${entities.length + 1}`;
        // Only send once, avoid duplicate sends
        if (addEntityBtn.disabled) return;
        
        addEntityBtn.disabled = true;
        setTimeout(() => addEntityBtn.disabled = false, 500);
        
        const message = { 
            type: 'CreateEntity',
            name: entityName,
            components: []
        };
        
        // If an entity is selected, create as child
        if (selectedEntity !== null) {
            message.parent_id = selectedEntity;
            logMessage(`[INFO] Creating entity: ${entityName} as child of entity ${selectedEntity}`);
        } else {
            logMessage(`[INFO] Creating entity: ${entityName}`);
        }
        
        sendMessage(message);
    });
}

// Entity List Rendering - Recursive tree view
function renderEntityList() {
    entityList.innerHTML = '';
    
    const tree = window.entityTree || [];
    const expandedNodes = window.expandedNodes || new Set();
    
    function renderEntityNode(entity, depth = 0) {
        const item = document.createElement('div');
        item.className = 'entity-item';
        item.style.paddingLeft = `${depth * 16}px`;
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '4px';
        
        if (selectedEntity === entity.id) {
            item.classList.add('selected');
        }
        
        // Add expand/collapse indicator if entity has children
        const hasChildren = entity.children && entity.children.length > 0;
        if (hasChildren) {
            const indicator = document.createElement('span');
            indicator.className = 'entity-expand';
            const isExpanded = expandedNodes.has(entity.id);
            indicator.textContent = isExpanded ? '▼' : '▶';
            indicator.style.marginRight = '4px';
            indicator.style.display = 'inline-block';
            indicator.style.cursor = 'pointer';
            indicator.style.userSelect = 'none';
            indicator.style.width = '12px';
            indicator.style.textAlign = 'center';
            
            indicator.addEventListener('click', (e) => {
                e.stopPropagation();
                if (expandedNodes.has(entity.id)) {
                    expandedNodes.delete(entity.id);
                } else {
                    expandedNodes.add(entity.id);
                }
                window.expandedNodes = expandedNodes;
                renderEntityList();
            });
            
            item.appendChild(indicator);
        } else {
            // Spacer for alignment
            const spacer = document.createElement('span');
            spacer.style.width = '12px';
            spacer.style.display = 'inline-block';
            item.appendChild(spacer);
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = entity.name || `Entity ${entity.id}`;
        nameSpan.style.cursor = 'pointer';
        nameSpan.style.flex = '1';
        nameSpan.addEventListener('click', () => selectEntity(entity));
        item.appendChild(nameSpan);
        
        entityList.appendChild(item);
        
        // Render children if expanded
        if (hasChildren && expandedNodes.has(entity.id)) {
            entity.children.forEach(child => {
                renderEntityNode(child, depth + 1);
            });
        }
    }
    
    // Initialize expanded nodes if not exists
    if (!window.expandedNodes) {
        window.expandedNodes = new Set();
    }
    
    // Render root entities
    tree.forEach(entity => {
        renderEntityNode(entity, 0);
    });
}

function selectEntity(entity) {
    // entity might be from the tree structure, so find it in the flat list
    const flatEntity = entities.find(e => e.id === entity.id) || entity;
    selectedEntity = flatEntity.id;
    renderEntityList();
    renderInspector(flatEntity);
    sendMessage({
        type: 'SelectEntity',
        entity_id: flatEntity.id
    });
}

// Inspector Rendering
function renderInspector(entity) {
    if (!entity) {
        inspectorContent.innerHTML = '<p class="inspector-empty">Select an entity to inspect</p>';
        return;
    }
    
    let html = `
        <div class="inspector-section">
            <div class="inspector-section-title">Entity</div>
            <div class="inspector-field">
                <label class="inspector-label">Name</label>
                <input type="text" class="inspector-input" value="${entity.name || 'Unnamed'}" 
                       onchange="updateEntityName(${entity.id}, this.value)">
            </div>
        </div>
    `;
    
    // Transform Component
    if (entity.components && entity.components.Transform) {
        const t = entity.components.Transform;
        html += `
            <div class="inspector-section">
                <div class="inspector-section-title">Transform</div>
                <div class="inspector-field">
                    <label class="inspector-label">Position</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                        <input type="number" class="inspector-input" placeholder="X" 
                               data-property="position" data-axis="0" data-entity-id="${entity.id}"
                               value="${t.position[0].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'position', 0, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Y" 
                               data-property="position" data-axis="1" data-entity-id="${entity.id}"
                               value="${t.position[1].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'position', 1, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Z" 
                               data-property="position" data-axis="2" data-entity-id="${entity.id}"
                               value="${t.position[2].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'position', 2, parseFloat(this.value))">
                    </div>
                </div>
                <div class="inspector-field">
                    <label class="inspector-label">Rotation</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                        <input type="number" class="inspector-input" placeholder="X" 
                               data-property="rotation" data-axis="0" data-entity-id="${entity.id}"
                               value="${t.rotation[0].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'rotation', 0, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Y" 
                               data-property="rotation" data-axis="1" data-entity-id="${entity.id}"
                               value="${t.rotation[1].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'rotation', 1, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Z" 
                               data-property="rotation" data-axis="2" data-entity-id="${entity.id}"
                               value="${t.rotation[2].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'rotation', 2, parseFloat(this.value))">
                    </div>
                </div>
                <div class="inspector-field">
                    <label class="inspector-label">Scale</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                        <input type="number" class="inspector-input" placeholder="X" 
                               data-property="scale" data-axis="0" data-entity-id="${entity.id}"
                               value="${t.scale[0].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'scale', 0, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Y" 
                               data-property="scale" data-axis="1" data-entity-id="${entity.id}"
                               value="${t.scale[1].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'scale', 1, parseFloat(this.value))">
                        <input type="number" class="inspector-input" placeholder="Z" 
                               data-property="scale" data-axis="2" data-entity-id="${entity.id}"
                               value="${t.scale[2].toFixed(2)}" step="0.1"
                               onchange="updateTransform(${entity.id}, 'scale', 2, parseFloat(this.value))">
                    </div>
                </div>
            </div>
        `;
    }
    
    inspectorContent.innerHTML = html;
}

// Global functions for inline event handlers
window.updateTransform = function(entityId, property, axis, value) {
    const entity = entities.find(e => e.id === entityId);
    if (!entity || !entity.components || !entity.components.Transform) {
        console.error('Entity or Transform not found:', entityId, entity);
        return;
    }
    
    // Read current values from the input fields to ensure we have the latest UI state
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;
    
    // Find all input fields for this entity's transform using data attributes
    const position = [0, 0, 0];
    const rotation = [0, 0, 0];
    const scale = [1, 1, 1];
    
    // Read position values
    for (let i = 0; i < 3; i++) {
        const input = inspector.querySelector(`input[data-property="position"][data-axis="${i}"][data-entity-id="${entityId}"]`);
        if (input) {
            position[i] = parseFloat(input.value) || 0;
        }
    }
    
    // Read rotation values
    for (let i = 0; i < 3; i++) {
        const input = inspector.querySelector(`input[data-property="rotation"][data-axis="${i}"][data-entity-id="${entityId}"]`);
        if (input) {
            rotation[i] = parseFloat(input.value) || 0;
        }
    }
    
    // Read scale values
    for (let i = 0; i < 3; i++) {
        const input = inspector.querySelector(`input[data-property="scale"][data-axis="${i}"][data-entity-id="${entityId}"]`);
        if (input) {
            scale[i] = parseFloat(input.value) || 1;
        }
    }
    
    // Update the specific axis that was changed (in case the input value wasn't found)
    if (property === 'position') position[axis] = value;
    else if (property === 'rotation') rotation[axis] = value;
    else if (property === 'scale') scale[axis] = value;
    
    // Also update the local entity object to keep it in sync
    const transform = entity.components.Transform;
    transform.position = position;
    transform.rotation = rotation;
    transform.scale = scale;
    
    const message = {
        type: 'UpdateTransform',
        entity_id: entityId,
        position: position,
        rotation: rotation,
        scale: scale
    };
    
    console.log('Sending UpdateTransform:', message);
    sendMessage(message);
    
    logMessage(`[INFO] Updated ${property}[${axis}] of entity ${entityId} to ${value}`);
};

window.updateEntityName = function(entityId, newName) {
    // For now, just log - we'd need to add UpdateEntityName message type
    logMessage(`[INFO] Entity rename not yet implemented: ${newName}`);
    console.log('Rename entity:', entityId, newName);
};


// Console Logging
function logMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'console-message';
    messageDiv.textContent = message;
    consoleOutput.appendChild(messageDiv);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Start the editor
init();

