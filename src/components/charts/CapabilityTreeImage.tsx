import React, { useMemo } from 'react';
import { TreeNode } from '@/types/types';

// ─── 颜色配置（蓝色系）───────────────────────────────────────────
const NODE_COLORS = [
  { fill: '#1A4FA8', text: '#ffffff', stroke: '#1A4FA8' }, // 根节点：深蓝
  { fill: '#2563EB', text: '#ffffff', stroke: '#2563EB' }, // 一级：亮蓝
  { fill: '#3B82F6', text: '#ffffff', stroke: '#3B82F6' }, // 二级：中蓝
  { fill: '#DBEAFE', text: '#1e3a8a', stroke: '#93C5FD' }, // 三级：浅蓝
];

const EDGE_COLOR = '#BFDBFE';
const BAR_BG = '#E0EFFE';
const BAR_FG_HIGH = '#1A4FA8';
const BAR_FG_MID = '#3B82F6';
const BAR_FG_LOW = '#93C5FD';
const VALUE_COLOR = '#1e3a8a';

// ─── 布局常量 ────────────────────────────────────────────────────
const NODE_W = 90;     // 节点宽
const NODE_H = 32;     // 节点高
const RADIUS = 8;      // 圆角
const H_GAP = 20;      // 同层节点水平间距
const V_GAP = 60;      // 层间垂直间距
const LEAF_BAR_H = 8;  // 叶子节点值条高度
const PADDING = 16;    // 整体边距

// ─── 布局计算 ────────────────────────────────────────────────────
interface LayoutNode {
  node: TreeNode;
  x: number;       // 中心 x
  y: number;       // 顶部 y
  depth: number;
  width: number;   // 子树宽度
  children: LayoutNode[];
}

function calcLeafWidth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return NODE_W;
  return node.children.reduce((sum, c) => sum + calcLeafWidth(c) + H_GAP, -H_GAP);
}

function buildLayout(node: TreeNode, depth: number, offsetX: number): LayoutNode {
  const subtreeW = calcLeafWidth(node);
  const cx = offsetX + subtreeW / 2;
  const y = PADDING + depth * (NODE_H + V_GAP);

  if (!node.children || node.children.length === 0) {
    return { node, x: cx, y, depth, width: subtreeW, children: [] };
  }

  let childX = offsetX;
  const children: LayoutNode[] = node.children.map(child => {
    const cw = calcLeafWidth(child);
    const laid = buildLayout(child, depth + 1, childX);
    childX += cw + H_GAP;
    return laid;
  });

  return { node, x: cx, y, depth, width: subtreeW, children };
}

function collectNodes(layout: LayoutNode, acc: LayoutNode[] = []): LayoutNode[] {
  acc.push(layout);
  layout.children.forEach(c => collectNodes(c, acc));
  return acc;
}

function collectEdges(layout: LayoutNode, acc: { from: LayoutNode; to: LayoutNode }[] = []) {
  layout.children.forEach(c => {
    acc.push({ from: layout, to: c });
    collectEdges(c, acc);
  });
  return acc;
}

// ─── 单节点渲染 ────────────────────────────────────────────────────
function NodeRect({ layout }: { layout: LayoutNode }) {
  const { node, x, y, depth } = layout;
  const color = NODE_COLORS[Math.min(depth, NODE_COLORS.length - 1)];
  const nx = x - NODE_W / 2;
  const isLeaf = !node.children || node.children.length === 0;
  const hasValue = isLeaf && node.value !== undefined;

  const barFill =
    node.value !== undefined
      ? node.value >= 75 ? BAR_FG_HIGH
        : node.value >= 50 ? BAR_FG_MID
        : BAR_FG_LOW
      : BAR_FG_LOW;

  const barWidth = hasValue ? Math.round((node.value! / 100) * (NODE_W - 16)) : 0;

  return (
    <g>
      {/* 节点背景 */}
      <rect
        x={nx}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={RADIUS}
        ry={RADIUS}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth={1.5}
      />
      {/* 节点标签 */}
      <text
        x={x}
        y={y + (hasValue ? 12 : NODE_H / 2 + 4.5)}
        textAnchor="middle"
        fontSize={depth === 0 ? 12 : 11}
        fontWeight={depth <= 1 ? 600 : 400}
        fill={color.text}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {node.name.length > 7 ? node.name.slice(0, 6) + '…' : node.name}
      </text>
      {/* 能力值条 */}
      {hasValue && (
        <>
          <rect
            x={nx + 8}
            y={y + NODE_H - LEAF_BAR_H - 4}
            width={NODE_W - 16}
            height={LEAF_BAR_H}
            rx={3}
            fill={BAR_BG}
          />
          <rect
            x={nx + 8}
            y={y + NODE_H - LEAF_BAR_H - 4}
            width={barWidth}
            height={LEAF_BAR_H}
            rx={3}
            fill={barFill}
          />
          <text
            x={nx + NODE_W + 3}
            y={y + NODE_H - 4}
            fontSize={9}
            fill={VALUE_COLOR}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {node.value}
          </text>
        </>
      )}
    </g>
  );
}

// ─── 连线（贝塞尔曲线）────────────────────────────────────────────
function Edge({ from, to }: { from: LayoutNode; to: LayoutNode }) {
  const x1 = from.x;
  const y1 = from.y + NODE_H;
  const x2 = to.x;
  const y2 = to.y;
  const cy1 = y1 + (y2 - y1) * 0.5;
  const cy2 = y1 + (y2 - y1) * 0.5;
  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
      fill="none"
      stroke={EDGE_COLOR}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────
interface CapabilityTreeImageProps {
  data: TreeNode;
  className?: string;
}

export function CapabilityTreeImage({ data, className = '' }: CapabilityTreeImageProps) {
  const { layout, svgWidth, svgHeight } = useMemo(() => {
    const layout = buildLayout(data, 0, PADDING);
    const allNodes = collectNodes(layout);
    // 计算画布尺寸
    const maxX = Math.max(...allNodes.map(n => n.x + NODE_W / 2 + PADDING));
    const maxY = Math.max(...allNodes.map(n => n.y + NODE_H + PADDING + (n.node.value !== undefined ? 14 : 0)));
    return {
      layout,
      svgWidth: Math.max(maxX + PADDING, 280),
      svgHeight: Math.max(maxY + PADDING, 120),
    };
  }, [data]);

  const allNodes = collectNodes(layout);
  const allEdges = collectEdges(layout);

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ minWidth: Math.min(svgWidth, 280), maxWidth: svgWidth, display: 'block' }}
        aria-label="能力树图"
        role="img"
      >
        {/* 背景 */}
        <rect width={svgWidth} height={svgHeight} fill="#F0F7FF" rx={12} />
        {/* 连线（先渲染，在节点下层） */}
        <g>
          {allEdges.map((e, i) => (
            <Edge key={i} from={e.from} to={e.to} />
          ))}
        </g>
        {/* 节点 */}
        <g>
          {allNodes.map((n, i) => (
            <NodeRect key={i} layout={n} />
          ))}
        </g>
      </svg>
    </div>
  );
}
