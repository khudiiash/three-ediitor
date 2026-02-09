/**
 * Builds a Three.js NodeMaterial (e.g. MeshStandardNodeMaterial, MeshPhysicalNodeMaterial)
 * from a serialized node graph. Used by the editor and by runtime material loading.
 * The editor must call setNodeMaterialBackend() with TSL and material classes from three/webgpu.
 */

export interface NodeMaterialGraph {
	name?: string;
	nodes?: Record<string, GraphNode>;
	connections?: Array<{ from: string; to: string; toPin?: string }>;
	color?: number;
	roughness?: number;
	metalness?: number;
}

interface GraphNode {
	type: string;
	position?: { x: number; y: number };
	materialClass?: string;
	value?: number;
	x?: number;
	y?: number;
	z?: number;
	w?: number;
	r?: number;
	g?: number;
	b?: number;
	color?: number;
	roughness?: number;
	metalness?: number;
	emissive?: number;
	opacity?: number;
	ao?: number;
	clearcoat?: number;
	clearcoatRoughness?: number;
	sheen?: number;
	sheenRoughness?: number;
	iridescence?: number;
	transmission?: number;
	thickness?: number;
	ior?: number;
	dispersion?: number;
	anisotropy?: number;
	attenuationColor?: number;
	attenuationDistance?: number;
	specularColor?: number;
	specularIntensity?: number;
	iridescenceIOR?: number;
	iridescenceThickness?: number;
	side?: number;
	transparent?: boolean;
	depthWrite?: boolean;
	/** Custom Fn node: TSL code string (e.g. Fn(([a,b]) => { return a.add(b); })) */
	code?: string;
	/** Custom Fn node: input handle ids for resolving connections */
	inputs?: Array<{ id: string; label?: string }>;
	/** Custom Fn node: inferred output type from return expression ('float' | 'vec2' | 'vec3' | 'vec4' | 'color') */
	outputType?: string;
}

export interface NodeMaterialBackend {
	TSL: any;
	/** Optional time node getter from three/tsl (() => node). If not set, TSL.time() is used. */
	time?: () => any;
	/** vec2(x,y) from three/tsl - set by editor for Vec2 node resolution */
	vec2?: (x: number, y: number) => any;
	/** vec3(x,y,z) / color(r,g,b) from three/tsl - set by editor for Vec3→Color */
	vec3?: (x: number, y: number, z: number) => any;
	vec4?: (x: number, y: number, z: number, w: number) => any;
	color?: (r: number, g: number, b: number) => any;
	MeshStandardNodeMaterial: new (opts: any) => any;
	MeshPhysicalNodeMaterial?: new (opts: any) => any;
	MeshBasicNodeMaterial?: new (opts: any) => any;
	MeshPhongNodeMaterial?: new (opts: any) => any;
	MeshSSSNodeMaterial?: new (opts: any) => any;
	MeshToonNodeMaterial?: new (opts: any) => any;
	MeshLambertNodeMaterial?: new (opts: any) => any;
	MeshNormalNodeMaterial?: new (opts: any) => any;
	PointsNodeMaterial?: new (opts: any) => any;
}

let backend: NodeMaterialBackend | null = null;

export function setNodeMaterialBackend(b: NodeMaterialBackend | Record<string, unknown>): void {
	backend = (backend ? { ...backend, ...b } : b) as NodeMaterialBackend;
}

const FLOAT_LIKE = new Set([
	'float', 'Float', 'time', 'Time', 'sin', 'Sin', 'add', 'Add', 'mul', 'Mul', 'multiply', 'mix', 'Mix',
	'subtract', 'divide', 'min', 'max', 'abs', 'floor', 'ceil', 'round', 'saturate', 'negate', 'oneMinusX', 'oneDivX',
	'pow2', 'pow3', 'pow4', 'sqrt', 'exp', 'log', 'clamp', 'step', 'smoothstep', 'mod', 'power', 'fract', 'sign',
	'cos', 'tan', 'degrees', 'radians', 'dot', 'length', 'distance',
	'customFn' // custom Fn node output is float-like (e.g. a.add(b)); coerce to vec3 when used as color
]);

const VEC_LIKE = new Set(['color', 'Color', 'vec2', 'Vec2', 'vec3', 'Vec3', 'vec4', 'Vec4']);

export function createMaterialFromGraph(graph: NodeMaterialGraph): any {
	if (!graph) return null;
	if (!backend?.TSL || !backend.MeshStandardNodeMaterial) {
		console.warn('[createMaterialFromGraph] No node material backend set. Call setNodeMaterialBackend() from the editor or game.');
		return null;
	}

	const TSL = backend.TSL;
	const nodes = graph.nodes || {};
	const connections = graph.connections || [];

	// Editor sends material node as type 'output'; fallback: treat first material-type node as output
	const MATERIAL_OUTPUT_TYPES = new Set([
		'output', 'meshStandardMaterial', 'meshBasicMaterial', 'meshPhongMaterial', 'meshPhysicalMaterial',
		'meshSSSMaterial', 'meshToonMaterial', 'meshLambertMaterial', 'meshNormalMaterial', 'pointsMaterial', 'spriteNodeMaterial'
	]);
	let outputNodeEntry = Object.entries(nodes).find(([, node]) => !!node && node.type === 'output');
	if (!outputNodeEntry) {
		outputNodeEntry = Object.entries(nodes).find(([id, node]) => !!node && MATERIAL_OUTPUT_TYPES.has(String(node.type)));
	}
	const outputNodeId = outputNodeEntry ? outputNodeEntry[0] : null;
	const outputNodeRaw = outputNodeEntry ? outputNodeEntry[1] : null;
	// Normalize: if editor sent meshStandardMaterial etc., treat as output for base opts and materialClass
	const outputNode = outputNodeRaw && outputNodeRaw.type !== 'output'
		? { ...outputNodeRaw, type: 'output', materialClass: outputNodeRaw.materialClass ?? String(outputNodeRaw.type).replace(/^mesh/, 'Mesh').replace(/Material$/, 'NodeMaterial') }
		: outputNodeRaw;
	const base = outputNode || graph;
	const color = base.color !== undefined ? base.color : 0xffffff;
	const roughness = typeof base.roughness === 'number' ? base.roughness : 0.5;
	const metalness = typeof base.metalness === 'number' ? base.metalness : 0;

	const materialClass = outputNode ? String(outputNode.materialClass || '') : '';
	const MaterialCtor =
		(materialClass === 'MeshSSSNodeMaterial' && backend.MeshSSSNodeMaterial) ? backend.MeshSSSNodeMaterial! :
		(materialClass === 'MeshToonNodeMaterial' && backend.MeshToonNodeMaterial) ? backend.MeshToonNodeMaterial! :
		(materialClass === 'MeshLambertNodeMaterial' && backend.MeshLambertNodeMaterial) ? backend.MeshLambertNodeMaterial! :
		(materialClass === 'MeshNormalNodeMaterial' && backend.MeshNormalNodeMaterial) ? backend.MeshNormalNodeMaterial! :
		(materialClass === 'PointsNodeMaterial' && backend.PointsNodeMaterial) ? backend.PointsNodeMaterial! :
		(materialClass === 'MeshPhysicalNodeMaterial' && backend.MeshPhysicalNodeMaterial) ? backend.MeshPhysicalNodeMaterial! :
		(materialClass === 'MeshBasicNodeMaterial' && backend.MeshBasicNodeMaterial) ? backend.MeshBasicNodeMaterial! :
		(materialClass === 'MeshPhongNodeMaterial' && backend.MeshPhongNodeMaterial) ? backend.MeshPhongNodeMaterial! :
		backend.MeshStandardNodeMaterial;
	const isPhysical = MaterialCtor === backend.MeshPhysicalNodeMaterial;
	const isSSS = MaterialCtor === backend.MeshSSSNodeMaterial;

	if (Object.keys(nodes).length === 0 || connections.length === 0) {
		const opts: Record<string, unknown> = {
			color,
			roughness,
			metalness,
			name: graph.name || 'NodeMaterial'
		};
		if ((isPhysical || isSSS) && outputNode) {
			if (outputNode.emissive !== undefined) opts.emissive = outputNode.emissive;
			if (typeof outputNode.clearcoat === 'number') opts.clearcoat = outputNode.clearcoat;
			if (typeof outputNode.clearcoatRoughness === 'number') opts.clearcoatRoughness = outputNode.clearcoatRoughness;
			if (outputNode.sheen !== undefined) opts.sheen = outputNode.sheen;
			if (typeof outputNode.sheenRoughness === 'number') opts.sheenRoughness = outputNode.sheenRoughness;
			if (typeof outputNode.iridescence === 'number') opts.iridescence = outputNode.iridescence;
			if (typeof outputNode.transmission === 'number') opts.transmission = outputNode.transmission;
			if (typeof outputNode.thickness === 'number') opts.thickness = outputNode.thickness;
			if (typeof outputNode.ior === 'number') opts.ior = outputNode.ior;
			if (typeof outputNode.dispersion === 'number') opts.dispersion = outputNode.dispersion;
			if (typeof outputNode.anisotropy === 'number') opts.anisotropy = outputNode.anisotropy;
			if (typeof outputNode.attenuationColor === 'number') opts.attenuationColor = outputNode.attenuationColor;
			if (typeof outputNode.attenuationDistance === 'number') opts.attenuationDistance = outputNode.attenuationDistance;
			if (typeof outputNode.specularColor === 'number') opts.specularColor = outputNode.specularColor;
			if (typeof outputNode.specularIntensity === 'number') opts.specularIntensity = outputNode.specularIntensity;
			if (typeof outputNode.iridescenceIOR === 'number') opts.iridescenceIOR = outputNode.iridescenceIOR;
			if (typeof outputNode.iridescenceThickness === 'number') opts.iridescenceThickness = outputNode.iridescenceThickness;
			if (typeof outputNode.ao === 'number') opts.aoMapIntensity = outputNode.ao;
		}
		if (outputNode && !isPhysical && !isSSS) {
			if (outputNode.emissive !== undefined) opts.emissive = outputNode.emissive;
			if (outputNode.opacity !== undefined) opts.opacity = outputNode.opacity;
		}
		const mat = new MaterialCtor(opts);
		if (mat && typeof mat === 'object') mat.name = graph.name || mat.name || 'NodeMaterial';
		return mat;
	}

	const resolved: Record<string, any> = {};
	const visited = new Set<string>();

	function connTo(targetId: string, pin: string): { from: string } | undefined {
		const pinLower = pin.toLowerCase();
		return connections.find((c) => {
			if (c.to !== targetId) return false;
			const toPin = String((c as any).toPin ?? (c as any).targetHandle ?? '');
			if (!toPin) return false;
			const toPinLower = toPin.toLowerCase();
			if (toPin === pin || toPinLower === pinLower) return true;
			// Match compound ids e.g. "vec3:z" -> pin "z"
			const suffix = toPin.includes(':') ? toPin.split(':').pop()! : toPin;
			return suffix.toLowerCase() === pinLower;
		});
	}
	function inputOrDefault(nodeId: string, pin: string, defaultNum: number): any {
		const c = connTo(nodeId, pin);
		if (c) return resolveNode(c.from);
		return TSL.float ? TSL.float(defaultNum) : undefined;
	}
	function vecInputs(nodeId: string, keys: ('x' | 'y' | 'z' | 'w')[], node: GraphNode): any[] {
		const defs = keys.map((k) => (typeof (node as any)[k] === 'number' ? (node as any)[k] : 0));
		return keys.map((k, i) => inputOrDefault(nodeId, k, defs[i]));
	}

	function resolveNode(nodeId: string): any {
		if (resolved[nodeId] !== undefined) return resolved[nodeId];
		if (nodeId === 'output') return undefined;
		const node = nodes[nodeId];
		if (!node?.type) return undefined;
		const type = String(node.type);
		let value: any;
		if (type === 'float' || type === 'Float') {
			const v = typeof node.value === 'number' ? node.value : 0;
			value = TSL.float ? TSL.float(v) : v;
		} else if (type === 'color' || type === 'Color') {
			const r = typeof node.r === 'number' ? node.r : 1;
			const g = typeof node.g === 'number' ? node.g : 1;
			const b = typeof node.b === 'number' ? node.b : 1;
			value = TSL.color ? TSL.color(r, g, b) : undefined;
		} else if (type === 'vec2' || type === 'Vec2') {
			const [xVal, yVal] = vecInputs(nodeId, ['x', 'y'], node);
			const vec2Fn = (backend as any)?.vec2 ?? (TSL as any).vec2;
			value = vec2Fn && xVal !== undefined && yVal !== undefined ? vec2Fn(xVal, yVal) : undefined;
		} else if (type === 'vec3' || type === 'Vec3') {
			const [xVal, yVal, zVal] = vecInputs(nodeId, ['x', 'y', 'z'], node);
			const vec3Fn = (backend as any)?.vec3 ?? (TSL as any).vec3 ?? TSL.color;
			value = vec3Fn && xVal !== undefined && yVal !== undefined && zVal !== undefined ? vec3Fn(xVal, yVal, zVal) : undefined;
		} else if (type === 'vec4' || type === 'Vec4') {
			const [xVal, yVal, zVal, wVal] = vecInputs(nodeId, ['x', 'y', 'z', 'w'], node);
			const vec4Fn = (backend as any)?.vec4 ?? (TSL as any).vec4;
			value = vec4Fn && xVal !== undefined && yVal !== undefined && zVal !== undefined && wVal !== undefined ? vec4Fn(xVal, yVal, zVal, wVal) : undefined;
		} else if (type === 'time' || type === 'Time') {
			// Prefer backend.time (editor passes from three/tsl); fallback to TSL.time so Time node always resolves
			const timeFn = (backend as any)?.time ?? (TSL as any)?.time;
			value = timeFn ?? undefined;
		} else if (type === 'positionWorld') {
			value = (backend as any)?.positionWorld ?? (TSL as any).positionWorld;
		} else if (type === 'positionLocal') {
			value = (backend as any)?.positionLocal ?? (TSL as any).positionLocal;
		} else if (type === 'positionView') {
			value = (backend as any)?.positionView ?? (TSL as any).positionView;
		} else if (type === 'positionViewDirection') {
			value = (backend as any)?.positionViewDirection ?? (TSL as any).positionViewDirection;
		} else if (type === 'normalLocal') {
			value = (backend as any)?.normalLocal ?? (TSL as any).normalLocal;
		} else if (type === 'normalView') {
			value = (backend as any)?.normalView ?? (TSL as any).normalView;
		} else if (type === 'normalWorld') {
			value = (backend as any)?.normalWorld ?? (TSL as any).normalWorld;
		} else if (type === 'uv') {
			const uvSrc = (backend as any)?.uv ?? (TSL as any).uv;
			if (uvSrc) {
				const idx = typeof (node as any).index === 'number' ? (node as any).index : 0;
				value = typeof uvSrc === 'function' ? uvSrc(idx) : uvSrc;
			}
		} else if (type === 'screenUV') {
			value = (backend as any)?.screenUV ?? (TSL as any).screenUV;
		} else if (type === 'resolution') {
			value = (backend as any)?.resolution ?? (TSL as any).resolution;
		} else if (type === 'tangentLocal') {
			value = (backend as any)?.tangentLocal ?? (TSL as any).tangentLocal;
		} else if (type === 'modelPosition') {
			value = (backend as any)?.modelPosition ?? (TSL as any).modelPosition;
		} else if (type === 'modelViewPosition') {
			value = (backend as any)?.modelViewPosition ?? (TSL as any).modelViewPosition;
		} else if (type === 'modelNormalMatrix') {
			value = (backend as any)?.modelNormalMatrix ?? (TSL as any).modelNormalMatrix;
		} else if (type === 'modelViewMatrix') {
			value = (backend as any)?.modelViewMatrix ?? (TSL as any).modelViewMatrix;
		} else if (type === 'modelWorldMatrix') {
			value = (backend as any)?.modelWorldMatrix ?? (TSL as any).modelWorldMatrix;
		} else if (type === 'modelScale') {
			value = (backend as any)?.modelScale ?? (TSL as any).modelScale;
		} else if (type === 'modelDirection') {
			value = (backend as any)?.modelDirection ?? (TSL as any).modelDirection;
		} else if (type === 'triNoise3d' && (TSL as any).triNoise3D) {
			const posConn = connTo(nodeId, 'position') ?? connTo(nodeId, 'a');
			const speedConn = connTo(nodeId, 'speed') ?? connTo(nodeId, 'b');
			const timeConn = connTo(nodeId, 'time') ?? connTo(nodeId, 'c');
			const pos = posConn ? resolveNode(posConn.from) : ((TSL as any).positionWorld ? ((TSL as any).positionWorld?.() ?? (TSL as any).positionWorld) : undefined);
			const speed = speedConn ? resolveNode(speedConn.from) : (TSL.float ? TSL.float(1) : 1);
			const timeVal = timeConn ? resolveNode(timeConn.from) : (TSL.time ?? (TSL.float ? TSL.float(0) : 0));
			if (pos !== undefined) value = (TSL as any).triNoise3D(pos, speed, timeVal);
		} else if (type === 'interleavedGradientNoise' && (TSL as any).interleavedGradientNoise) {
			const posConn = connTo(nodeId, 'position') ?? connTo(nodeId, 'a');
			const pos = posConn ? resolveNode(posConn.from) : ((TSL as any).uv && (TSL as any).screenUV ? (TSL as any).uv(0) : undefined);
			if (pos !== undefined) value = (TSL as any).interleavedGradientNoise(pos);
		} else if (type === 'sin' || type === 'Sin') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.sin ? TSL.sin(input) : undefined;
		} else if (type === 'add' || type === 'Add') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.add ? TSL.add(a, b) : undefined;
		} else if (type === 'mul' || type === 'Mul' || type === 'multiply') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(1) : 1);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.mul ? TSL.mul(a, b) : undefined;
		} else if (type === 'mix' || type === 'Mix') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const cc = connTo(nodeId, 'c') ?? connTo(nodeId, 't') ?? connTo(nodeId, 'factor');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(1) : 1);
			const t = cc ? resolveNode(cc.from) : (TSL.float ? TSL.float(0.5) : 0.5);
			value = TSL.mix ? TSL.mix(a, b, t) : undefined;
		} else if (type === 'subtract' || type === 'Subtract' || type === 'Sub') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.sub ? TSL.sub(a, b) : undefined;
		} else if (type === 'divide' || type === 'Divide' || type === 'Div') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(1) : 1);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.div ? TSL.div(a, b) : undefined;
		} else if (type === 'OneMinusX') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			const one = TSL.float ? TSL.float(1) : 1;
			value = TSL.sub ? TSL.sub(one, input) : undefined;
		} else if (type === 'OneDivX') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(1) : 1);
			const one = TSL.float ? TSL.float(1) : 1;
			value = TSL.div ? TSL.div(one, input) : undefined;
		} else if (type === 'min' || type === 'Min') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.min ? TSL.min(a, b) : undefined;
		} else if (type === 'max' || type === 'Max') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.max ? TSL.max(a, b) : undefined;
		} else if (type === 'clamp' || type === 'Clamp') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const cc = connTo(nodeId, 'c') ?? connTo(nodeId, 'C');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			const c = cc ? resolveNode(cc.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.clamp ? TSL.clamp(a, b, c) : undefined;
		} else if (type === 'power' || type === 'Power' || type === 'Pow') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(1) : 1);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.pow ? TSL.pow(a, b) : undefined;
		} else if (type === 'step' || type === 'Step') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.step ? TSL.step(a, b) : undefined;
		} else if (type === 'smoothstep' || type === 'Smoothstep') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const cc = connTo(nodeId, 'c') ?? connTo(nodeId, 'C');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(0.5) : 0.5);
			const c = cc ? resolveNode(cc.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.smoothstep ? TSL.smoothstep(a, b, c) : undefined;
		} else if (type === 'mod' || type === 'Mod') {
			const ca = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const cb = connTo(nodeId, 'b') ?? connTo(nodeId, 'B');
			const a = ca ? resolveNode(ca.from) : (TSL.float ? TSL.float(0) : 0);
			const b = cb ? resolveNode(cb.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.mod ? TSL.mod(a, b) : undefined;
		} else if (type === 'cos' || type === 'Cos') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.cos ? TSL.cos(input) : undefined;
		} else if (type === 'tan' || type === 'Tan') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.tan ? TSL.tan(input) : undefined;
		} else if (type === 'abs' || type === 'Abs') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.abs ? TSL.abs(input) : undefined;
		} else if (type === 'floor' || type === 'Floor') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.floor ? TSL.floor(input) : undefined;
		} else if (type === 'ceil' || type === 'Ceil') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.ceil ? TSL.ceil(input) : undefined;
		} else if (type === 'round' || type === 'Round') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.round ? TSL.round(input) : undefined;
		} else if (type === 'sqrt' || type === 'Sqrt') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.sqrt ? TSL.sqrt(input) : undefined;
		} else if (type === 'fract' || type === 'Fract') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.fract ? TSL.fract(input) : undefined;
		} else if (type === 'saturate' || type === 'Saturate') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.saturate ? TSL.saturate(input) : undefined;
		} else if (type === 'negate' || type === 'Negate') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.negate ? TSL.negate(input) : undefined;
		} else if (type === 'acos' || type === 'ACos' || type === 'Acos') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.acos ? TSL.acos(input) : undefined;
		} else if (type === 'asin' || type === 'ASin' || type === 'Asin') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.asin ? TSL.asin(input) : undefined;
		} else if (type === 'atan' || type === 'ATan' || type === 'Atan') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.atan ? TSL.atan(input) : undefined;
		} else if (type === 'exp' || type === 'Exp') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.exp ? TSL.exp(input) : undefined;
		} else if (type === 'exp2' || type === 'Exp2') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).exp2 ? (TSL as any).exp2(input) : undefined;
		} else if (type === 'log' || type === 'Log') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(1) : 1);
			value = TSL.log ? TSL.log(input) : undefined;
		} else if (type === 'log2' || type === 'Log2') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(1) : 1);
			value = (TSL as any).log2 ? (TSL as any).log2(input) : undefined;
		} else if (type === 'sign' || type === 'Sign') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.sign ? TSL.sign(input) : undefined;
		} else if (type === 'cbrt' || type === 'Cbrt') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).cbrt ? (TSL as any).cbrt(input) : undefined;
		} else if (type === 'degrees' || type === 'Degrees') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.degrees ? TSL.degrees(input) : undefined;
		} else if (type === 'radians' || type === 'Radians') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = TSL.radians ? TSL.radians(input) : undefined;
		} else if (type === 'pow2' || type === 'Pow2') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).pow2 ? (TSL as any).pow2(input) : undefined;
		} else if (type === 'pow3' || type === 'Pow3') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).pow3 ? (TSL as any).pow3(input) : undefined;
		} else if (type === 'pow4' || type === 'Pow4') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).pow4 ? (TSL as any).pow4(input) : undefined;
		} else if (type === 'trunc' || type === 'Trunc') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(0) : 0);
			value = (TSL as any).trunc ? (TSL as any).trunc(input) : undefined;
		} else if (type === 'inverseSqrt' || type === 'InverseSqrt') {
			const conn = connTo(nodeId, 'a') ?? connTo(nodeId, 'A');
			const input = conn ? resolveNode(conn.from) : (TSL.float ? TSL.float(1) : 1);
			value = (TSL as any).inverseSqrt ? (TSL as any).inverseSqrt(input) : undefined;
		} else if (type === 'epsilon' || type === 'Epsilon') {
			value = (TSL as any).EPSILON !== undefined ? (TSL as any).EPSILON : (TSL.float ? TSL.float(1e-6) : undefined);
		} else if (type === 'halfPi' || type === 'HalfPi') {
			value = (TSL as any).HALF_PI !== undefined ? (TSL as any).HALF_PI : (TSL.float ? TSL.float(Math.PI / 2) : undefined);
		} else if (type === 'pi' || type === 'Pi') {
			value = (TSL as any).PI !== undefined ? (TSL as any).PI : (TSL.float ? TSL.float(Math.PI) : undefined);
		} else if (type === 'twoPi' || type === 'TwoPi') {
			value = (TSL as any).TWO_PI !== undefined ? (TSL as any).TWO_PI : (TSL.float ? TSL.float(2 * Math.PI) : undefined);
		} else if (type === 'infinity' || type === 'Infinity') {
			value = (TSL as any).INFINITY !== undefined ? (TSL as any).INFINITY : (TSL.float ? TSL.float(1e30) : undefined);
		} else if (type === 'customFn') {
			const code = (node as GraphNode).code;
			if (!code || typeof code !== 'string') return undefined;
			const inputs = (node as GraphNode).inputs;
			const inputIds = inputs?.map((i) => i.id) ?? ['a', 'b'];
			const resolvedInputs: any[] = [];
			for (const id of inputIds) {
				const c = connTo(nodeId, id) ?? connTo(nodeId, id.toUpperCase());
				resolvedInputs.push(c ? resolveNode(c.from) : (TSL.float ? TSL.float(0) : 0));
			}
			try {
				// Expose all TSL exports so user code can use vec3(), sin(), add(), etc. without TSL. prefix
				const tslAny = TSL as Record<string, unknown>;
				const injectParts: string[] = [];
				for (const k of Object.keys(tslAny)) {
					if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) && (typeof tslAny[k] === 'function' || (typeof tslAny[k] === 'object' && tslAny[k] !== null))) {
						injectParts.push(k + '=TSL.' + k);
					}
				}
				const inject = injectParts.length ? 'var ' + injectParts.join(',') + '; ' : '';
				const fnFactory = new Function('TSL', inject + 'return (' + code.trim() + ')');
				const fnResult = fnFactory(TSL);
				// TSL Fn() may return a function or a callable object; try calling it either way
				if (fnResult != null) {
					const hasArrayDestructure = /Fn\s*\(\s*\(?\s*\[/.test(code.trim());
					const callable = typeof fnResult === 'function' ? fnResult : (fnResult as any);
					value = hasArrayDestructure ? callable(resolvedInputs) : callable(...resolvedInputs);
				}
			} catch (err) {
				console.warn('[createMaterialFromGraph] customFn failed:', err);
			}
		} else {
			return undefined;
		}
		// Only invoke for constant node types (float, color, constants). Never invoke time, sin, abs, vec3, etc.
		// so TSL node references stay live and are evaluated per-frame in the shader.
		const CONSTANT_TYPES = new Set([
			'float', 'Float', 'int', 'Int', 'color', 'Color',
			'epsilon', 'Epsilon', 'halfPi', 'HalfPi', 'pi', 'Pi', 'twoPi', 'TwoPi', 'infinity', 'Infinity'
		]);
		if (value !== undefined && typeof value === 'function' && CONSTANT_TYPES.has(type)) {
			value = value();
		}
		if (value !== undefined) {
			resolved[nodeId] = value;
			visited.add(nodeId);
		}
		return value;
	}

	const nodeIds = new Set<string>();
	connections.forEach((c) => {
		nodeIds.add(c.from);
		nodeIds.add(c.to);
	});
	const order: string[] = [];
	function sort(id: string) {
		if (order.includes(id) || !nodes[id]) return;
		connections.filter((c) => c.to === id).forEach((c) => sort(c.from));
		order.push(id);
	}
	[...nodeIds].forEach(sort);
	order.forEach((id) => resolveNode(id));

	const GEOMETRY_VEC2 = new Set(['uv', 'screenUV', 'resolution']);
	const GEOMETRY_POSITION_VEC3 = new Set(['positionWorld', 'positionLocal', 'positionView', 'positionViewDirection']);

	function coerceTo(val: any, sourceNodeId: string, targetType: 'float' | 'vec2' | 'vec3' | 'vec4'): any {
		if (val === undefined) return val;
		const node = nodes[sourceNodeId];
		const st = node ? String(node.type || '') : '';
		const customOutputType = st === 'customFn' ? ((node as GraphNode).outputType || 'float') : '';
		const isFloatLike = FLOAT_LIKE.has(st);
		const isVecLike = VEC_LIKE.has(st) || /^vec[234]$/i.test(st);
		if (targetType === 'vec3') {
			if (st === 'customFn' && (customOutputType === 'vec3' || customOutputType === 'color' || customOutputType === 'vec4')) {
				return val;
			}
			if (GEOMETRY_VEC2.has(st) && val !== undefined) {
				return val;
			}
			if (GEOMETRY_POSITION_VEC3.has(st) && val !== undefined && TSL.add && TSL.mul && TSL.float) {
				const one = TSL.float(1);
				const half = TSL.float(0.5);
				return TSL.mul(TSL.add(val, one), half);
			}
			if (isFloatLike) {
				const halfVal = TSL.float ? TSL.float(0.5) : 0.5;
				const one = TSL.float ? TSL.float(1) : 1;
				const remap = (st === 'sin' || st === 'Sin') && TSL.add && TSL.mul
					? TSL.mul(TSL.add(val, one), halfVal)
					: val;
				return TSL.vec3 ? TSL.vec3(remap, remap, remap) : val;
			}
			return val;
		}
		if (targetType === 'float') {
			if (isFloatLike) return val;
			if (isVecLike && TSL.split) return TSL.split(val, 'x');
			return val;
		}
		if (targetType === 'vec2' && isFloatLike && TSL.vec2) return TSL.vec2(val, val);
		if (targetType === 'vec4' && isFloatLike && TSL.vec4) return TSL.vec4(val, val, val, val);
		return val;
	}

	const toOutput = (c: { to?: string; toPin?: string }, pin: string, pinNode: string) =>
		c.toPin === pinNode || c.toPin === pin || (c.to === 'output' && c.toPin === pin);
	// Prefer color connection that targets the output (material) node
	const colorConn = (outputNodeId != null ? connections.find((c) => c.to === outputNodeId && (c.toPin === 'colorNode' || c.toPin === 'color')) : undefined)
		?? connections.find((c) => toOutput(c, 'color', 'colorNode'));
	const colorSourceId = colorConn?.from;
	const roughnessSourceId = connections.find((c) => toOutput(c, 'roughness', 'roughnessNode'))?.from;
	const metalnessSourceId = connections.find((c) => toOutput(c, 'metalness', 'metalnessNode'))?.from;
	const emissiveSourceId = connections.find((c) => toOutput(c, 'emissive', 'emissiveNode'))?.from;
	const normalSourceId = connections.find((c) => toOutput(c, 'normal', 'normalNode'))?.from;

	const resolvedColor = colorSourceId ? resolveNode(colorSourceId) : undefined;
	let colorNode = colorSourceId ? coerceTo(resolvedColor, colorSourceId, 'vec3') : undefined;
	const GEOMETRY_TYPES = new Set(['positionWorld', 'positionLocal', 'positionView', 'positionViewDirection', 'normalLocal', 'normalView', 'normalWorld', 'uv', 'screenUV', 'resolution', 'tangentLocal']);
	const colorSourceType = colorSourceId && nodes[colorSourceId] ? String((nodes[colorSourceId] as any).type || '') : '';
	// If there is a color connection but the source didn't resolve, use a fallback
	if (colorSourceId && colorNode === undefined && TSL.color) {
		console.warn('[createMaterialFromGraph] Color connection did not resolve; using fallback. Source type:', colorSourceType);
		if (GEOMETRY_TYPES.has(colorSourceType)) {
			colorNode = TSL.color(0.5, 0.5, 0.5);
		} else {
			colorNode = TSL.color(1, 1, 1);
		}
	}
	const roughnessNode = roughnessSourceId ? coerceTo(resolveNode(roughnessSourceId), roughnessSourceId, 'float') : undefined;
	const metalnessNode = metalnessSourceId ? coerceTo(resolveNode(metalnessSourceId), metalnessSourceId, 'float') : undefined;
	const emissiveNode = emissiveSourceId ? coerceTo(resolveNode(emissiveSourceId), emissiveSourceId, 'vec3') : undefined;
	const normalNode = normalSourceId ? coerceTo(resolveNode(normalSourceId), normalSourceId, 'vec3') : undefined;

	const baseOpts: Record<string, unknown> = {
		color,
		roughness,
		metalness,
		name: graph.name || 'NodeMaterial'
	};
	if ((isPhysical || isSSS) && outputNode) {
		if (outputNode.emissive !== undefined) baseOpts.emissive = outputNode.emissive;
		if (typeof outputNode.clearcoat === 'number') baseOpts.clearcoat = outputNode.clearcoat;
		if (typeof outputNode.clearcoatRoughness === 'number') baseOpts.clearcoatRoughness = outputNode.clearcoatRoughness;
		if (outputNode.sheen !== undefined) baseOpts.sheen = outputNode.sheen;
		if (typeof outputNode.sheenRoughness === 'number') baseOpts.sheenRoughness = outputNode.sheenRoughness;
		if (typeof outputNode.iridescence === 'number') baseOpts.iridescence = outputNode.iridescence;
		if (typeof outputNode.transmission === 'number') baseOpts.transmission = outputNode.transmission;
		if (typeof outputNode.thickness === 'number') baseOpts.thickness = outputNode.thickness;
		if (typeof outputNode.ior === 'number') baseOpts.ior = outputNode.ior;
		if (typeof outputNode.dispersion === 'number') baseOpts.dispersion = outputNode.dispersion;
		if (typeof outputNode.anisotropy === 'number') baseOpts.anisotropy = outputNode.anisotropy;
		if (typeof outputNode.attenuationColor === 'number') baseOpts.attenuationColor = outputNode.attenuationColor;
		if (typeof outputNode.attenuationDistance === 'number') baseOpts.attenuationDistance = outputNode.attenuationDistance;
		if (typeof outputNode.specularColor === 'number') baseOpts.specularColor = outputNode.specularColor;
		if (typeof outputNode.specularIntensity === 'number') baseOpts.specularIntensity = outputNode.specularIntensity;
		if (typeof outputNode.iridescenceIOR === 'number') baseOpts.iridescenceIOR = outputNode.iridescenceIOR;
		if (typeof outputNode.iridescenceThickness === 'number') baseOpts.iridescenceThickness = outputNode.iridescenceThickness;
		if (typeof outputNode.ao === 'number') baseOpts.aoMapIntensity = outputNode.ao;
	}
	if (outputNode && !isPhysical && !isSSS) {
		if (outputNode.emissive !== undefined) baseOpts.emissive = outputNode.emissive;
		if (outputNode.opacity !== undefined) baseOpts.opacity = outputNode.opacity;
	}

	const mat = new MaterialCtor(baseOpts);
	if (mat && typeof mat === 'object') {
		mat.name = graph.name || mat.name || 'NodeMaterial';
		if (colorNode !== undefined && 'colorNode' in mat) mat.colorNode = colorNode;
		if (roughnessNode !== undefined && 'roughnessNode' in mat) mat.roughnessNode = roughnessNode;
		if (metalnessNode !== undefined && 'metalnessNode' in mat) mat.metalnessNode = metalnessNode;
		if (emissiveNode !== undefined && 'emissiveNode' in mat) mat.emissiveNode = emissiveNode;
		if (normalNode !== undefined && 'normalNode' in mat) mat.normalNode = normalNode;
		if (typeof (mat as any).needsUpdate !== 'undefined') (mat as any).needsUpdate = true;
	}
	return mat;
}
