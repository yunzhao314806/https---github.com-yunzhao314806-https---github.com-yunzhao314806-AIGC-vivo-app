import React, { useCallback, useRef, useState } from 'react';

interface RadarDataItem {
  subject: string;
  value: number;
  fullMark?: number;
}

interface CapabilityRadarChartProps {
  data: RadarDataItem[];
  color?: string;
  compareData?: RadarDataItem[];
  compareColor?: string;
  height?: number;
  /** 可编辑模式（拖拽调整值）*/
  editable?: boolean;
  onChange?: (data: RadarDataItem[]) => void;
}

const SIZE = 280;       // SVG 尺寸
const CX = SIZE / 2;   // 中心 x
const CY = SIZE / 2;   // 中心 y
const R = 105;          // 最大半径
const LEVELS = 5;       // 同心圆层数
const HANDLE_R = 8;    // 拖拽点半径

function polarToXY(angle: number, radius: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function valueToRadius(value: number) {
  return (Math.max(0, Math.min(100, value)) / 100) * R;
}

function xyToValue(angle: number, mx: number, my: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  // Project (mx-CX, my-CY) onto axis direction
  const dot = (mx - CX) * Math.cos(rad) + (my - CY) * Math.sin(rad);
  return Math.max(0, Math.min(100, Math.round((dot / R) * 100)));
}

export function CapabilityRadarChart({
  data,
  color = 'hsl(217, 72%, 38%)',
  compareData,
  compareColor = 'hsl(22, 89%, 54%)',
  height = 300,
  editable = false,
  onChange,
}: CapabilityRadarChartProps) {
  const [localData, setLocalData] = useState<RadarDataItem[]>(data);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 当 data prop 变化时同步
  const prevDataRef = useRef(data);
  if (data !== prevDataRef.current) {
    prevDataRef.current = data;
    setLocalData(data);
  }

  const activeData = editable ? localData : data;
  const n = activeData.length;
  const angleStep = 360 / n;

  const getSVGPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!editable || draggingIdx === null) return;
    e.preventDefault();
    const { x, y } = getSVGPoint(e);
    const angle = draggingIdx * angleStep;
    const newVal = xyToValue(angle, x, y);
    setLocalData(prev => {
      const next = prev.map((d, i) => i === draggingIdx ? { ...d, value: newVal } : d);
      onChange?.(next);
      return next;
    });
  }, [editable, draggingIdx, angleStep, getSVGPoint, onChange]);

  const handleDragEnd = useCallback(() => {
    setDraggingIdx(null);
  }, []);

  // 构建多边形顶点
  const polyPoints = activeData.map((d, i) => {
    const { x, y } = polarToXY(i * angleStep, valueToRadius(d.value));
    return `${x},${y}`;
  }).join(' ');

  const comparePoints = compareData
    ? compareData.map((d, i) => {
        const { x, y } = polarToXY(i * angleStep, valueToRadius(d.value));
        return `${x},${y}`;
      }).join(' ')
    : null;

  return (
    <div className="w-full min-w-0 overflow-hidden flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        style={{ maxWidth: height, display: 'block', touchAction: editable ? 'none' : 'auto' }}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* 同心圆网格 */}
        {Array.from({ length: LEVELS }).map((_, lvl) => (
          <polygon
            key={lvl}
            points={activeData.map((_, i) => {
              const { x, y } = polarToXY(i * angleStep, R * ((lvl + 1) / LEVELS));
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={0.8}
            opacity={0.6}
          />
        ))}

        {/* 轴线 */}
        {activeData.map((_, i) => {
          const { x, y } = polarToXY(i * angleStep, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={0.8} opacity={0.5} />;
        })}

        {/* 刻度文字（外层） */}
        {activeData.map((d, i) => {
          const { x, y } = polarToXY(i * angleStep, R + 18);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
              fontFamily="system-ui, sans-serif"
            >
              {d.subject}
            </text>
          );
        })}

        {/* 对比多边形（底层） */}
        {comparePoints && (
          <polygon
            points={comparePoints}
            fill={compareColor}
            fillOpacity={0.12}
            stroke={compareColor}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* 主数据多边形 */}
        <polygon
          points={polyPoints}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 拖拽点 */}
        {editable && activeData.map((d, i) => {
          const angle = i * angleStep;
          const { x, y } = polarToXY(angle, valueToRadius(d.value));
          const isDragging = draggingIdx === i;
          const isHovered = hoveredIdx === i;
          return (
            <g key={i}>
              {/* 拖拽时显示轴向辅助线 */}
              {isDragging && (() => {
                const { x: ax, y: ay } = polarToXY(angle, R);
                return <line x1={CX} y1={CY} x2={ax} y2={ay} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />;
              })()}
              {/* 值标签 */}
              {(isDragging || isHovered) && (() => {
                const { x: lx, y: ly } = polarToXY(angle, valueToRadius(d.value) + 16);
                return (
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={600} fill={color} fontFamily="system-ui, sans-serif">
                    {d.value}
                  </text>
                );
              })()}
              {/* 拖拽手柄 */}
              <circle
                cx={x} cy={y}
                r={isDragging ? HANDLE_R + 2 : HANDLE_R}
                fill={isDragging ? color : 'hsl(var(--background))'}
                stroke={color}
                strokeWidth={2}
                style={{ cursor: 'grab', userSelect: 'none' }}
                onMouseDown={e => { e.preventDefault(); setDraggingIdx(i); }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => !isDragging && setHoveredIdx(null)}
                onTouchStart={e => { e.preventDefault(); setDraggingIdx(i); }}
              />
            </g>
          );
        })}

        {/* 非编辑模式：数据点 */}
        {!editable && activeData.map((d, i) => {
          const { x, y } = polarToXY(i * angleStep, valueToRadius(d.value));
          return <circle key={i} cx={x} cy={y} r={3.5} fill={color} stroke="hsl(var(--background))" strokeWidth={1.5} />;
        })}
      </svg>

      {/* 图例（有对比数据时显示） */}
      {compareData && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color, opacity: 0.6 }} />
            个人能力
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: compareColor, opacity: 0.4 }} />
            岗位要求
          </span>
        </div>
      )}

      {/* 编辑模式下的数值摘要 */}
      {editable && (
        <div className="w-full flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
          {activeData.map(d => (
            <span key={d.subject} className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">{d.subject}</span>
              <span className="ml-1" style={{ color }}>
                {d.value}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

