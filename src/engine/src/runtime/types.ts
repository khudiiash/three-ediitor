/**
 * Messages sent from editor to engine
 */
export type EditorMessage =
    | { type: 'LoadScene'; scene_json: string }
    | { type: 'UpdateTransform'; entity_id: number; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }
    | { type: 'CreateEntity'; name: string; components: string[]; parent_id?: number }
    | { type: 'DeleteEntity'; entity_id: number }
    | { type: 'SelectEntity'; entity_id: number }
    | { type: 'SetPlayMode'; playing: boolean }
    | { type: 'GetSceneState' };

/**
 * Messages sent from engine to editor
 */
export type EngineMessage =
    | { type: 'SceneState'; scene_json: string }
    | { type: 'EntityCreated'; entity_id: number; name: string }
    | { type: 'EntityDeleted'; entity_id: number }
    | { type: 'FrameStats'; fps: number; entity_count: number }
    | { type: 'Connected' }
    | { type: 'Error'; message: string }
    | { type: 'TransformUpdated'; entity_id: number; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }
    | { type: 'EntitySelected'; entity_id: number | null };
