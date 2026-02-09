/**
 * Each TSL node type has its own component (JSX definition).
 * Custom nodes (e.g. MeshStandardMaterial) use dedicated components; rest use TSLNode.
 */
import { TSLNode } from './TSLNode.jsx';
import { MeshStandardMaterialNode } from './MeshStandardMaterialNode.jsx';
import { MeshBasicMaterialNode } from './MeshBasicMaterialNode.jsx';
import { MeshPhongMaterialNode } from './MeshPhongMaterialNode.jsx';
import { MeshPhysicalMaterialNode } from './MeshPhysicalMaterialNode.jsx';
import { SimpleMaterialNode } from './SimpleMaterialNode.jsx';
import {
  ColorNode,
  FloatNode,
  IntNode,
  Vec2Node,
  Vec3Node,
  Vec4Node,
} from './constants/index.js';
import { GeometryNode, GEOMETRY_NODE_DEFS } from './geometry/index.js';
import { MathNode } from './math/index.js';
import { NODE_CATEGORIES } from './nodeList.js';
import { GroupNode } from './GroupNode.jsx';

const nodeTypeMap = {
  group: GroupNode,
  customFn: function CustomFnNode( props ) {
    return (
      <MathNode
        {...props}
        data={{
          ...props.data,
          nodeType: 'customFn',
          category: 'math',
          label: props.data?.label ?? 'Custom',
        }}
      />
    );
  },
  meshStandardMaterial: MeshStandardMaterialNode,
  meshBasicMaterial: MeshBasicMaterialNode,
  meshPhongMaterial: MeshPhongMaterialNode,
  meshPhysicalMaterial: MeshPhysicalMaterialNode,
  meshSSSMaterial: ( props ) => <SimpleMaterialNode { ...props } data={ { ...props.data, nodeType: 'meshSSSMaterial' } } />,
  meshToonMaterial: ( props ) => <SimpleMaterialNode { ...props } data={ { ...props.data, nodeType: 'meshToonMaterial' } } />,
  meshLambertMaterial: ( props ) => <SimpleMaterialNode { ...props } data={ { ...props.data, nodeType: 'meshLambertMaterial' } } />,
  meshNormalMaterial: ( props ) => <SimpleMaterialNode { ...props } data={ { ...props.data, nodeType: 'meshNormalMaterial' } } />,
  pointsMaterial: ( props ) => <SimpleMaterialNode { ...props } data={ { ...props.data, nodeType: 'pointsMaterial' } } />,
  color: ColorNode,
  float: FloatNode,
  int: IntNode,
  vec2: Vec2Node,
  vec3: Vec3Node,
  vec4: Vec4Node,
};

Object.keys( GEOMETRY_NODE_DEFS ).forEach( ( geometryId ) => {
  nodeTypeMap[ geometryId ] = function GeometryNodeWrapper( props ) {
    return (
      <GeometryNode
        {...props}
        data={{ ...props.data, nodeType: geometryId, label: props.data?.label }}
      />
    );
  };
} );

NODE_CATEGORIES.forEach( ( cat ) => {
  const isMath = cat.id === 'math';
  cat.nodes.forEach( ( n ) => {
    if ( nodeTypeMap[ n.id ] ) return;
    if ( isMath ) {
      nodeTypeMap[ n.id ] = function MathNodeWrapper( props ) {
        return (
          <MathNode
            {...props}
            data={{ ...props.data, nodeType: n.id, label: n.label, category: cat.id }}
          />
        );
      };
      return;
    }
    nodeTypeMap[ n.id ] = function NodeComponent( props ) {
      return (
        <TSLNode
          {...props}
          data={{ ...props.data, nodeType: n.id, label: n.label }}
        />
      );
    };
  } );
});

export const NODE_TYPE_COMPONENTS = nodeTypeMap;
