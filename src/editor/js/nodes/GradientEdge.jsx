import { memo } from 'react';
import { getBezierPath, BaseEdge, Position } from 'reactflow';

/**
 * Edge that shows a gradient between source and target handle type colors
 * when they differ; otherwise a solid stroke. Uses React Flow's getBezierPath.
 */
function GradientEdge( {
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  data,
  style = {},
  markerEnd,
  markerStart,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth = 20,
} ) {
  const [ path, labelX, labelY ] = getBezierPath( {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  } );

  const typeColor = data?.typeColor;
  const targetTypeColor = data?.targetTypeColor;
  const useGradient =
    typeColor &&
    targetTypeColor &&
    typeColor !== targetTypeColor;

  const strokeWidth = style?.strokeWidth ?? 2;

  if ( useGradient ) {
    const gradientId = `tsl-edge-gradient-${id.replace( /[^a-z0-9-]/gi, '_' )}`;
    return (
      <>
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
          >
            <stop offset="0%" stopColor={typeColor} />
            <stop offset="100%" stopColor={targetTypeColor} />
          </linearGradient>
        </defs>
        <path
          id={id}
          d={path}
          fill="none"
          style={{ stroke: `url(#${gradientId})`, strokeWidth }}
          className="react-flow__edge-path tsl-edge-path"
          markerEnd={markerEnd}
          markerStart={markerStart}
        />
        {interactionWidth > 0 && (
          <path
            d={path}
            fill="none"
            strokeOpacity={0}
            strokeWidth={interactionWidth}
            className="react-flow__edge-interaction"
          />
        )}
      </>
    );
  }

  const solidColor = typeColor || targetTypeColor || '#555';
  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={{ ...style, stroke: solidColor, strokeWidth }}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  );
}

GradientEdge.displayName = 'GradientEdge';

export default memo( GradientEdge );
