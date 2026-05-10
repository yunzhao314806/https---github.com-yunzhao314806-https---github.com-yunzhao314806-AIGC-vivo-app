import React, { useState } from 'react';
import { TreeNode } from '@/types/types';
import { ChevronRight, ChevronDown, Circle, GripVertical } from 'lucide-react';

// 互联网/科技行业默认能力树（组件内置兜底数据）
const TECH_DEFAULT_TREE: TreeNode = {
  name: '互联网/科技综合能力',
  children: [
    {
      name: '编程语言',
      children: [
        { name: 'JavaScript', value: 75 },
        { name: 'TypeScript', value: 70 },
        { name: 'Python', value: 80 },
        { name: 'Java', value: 65 },
        { name: 'Go', value: 50 },
      ],
    },
    {
      name: '前端技术',
      children: [
        { name: 'React', value: 78 },
        { name: 'Vue', value: 65 },
        { name: 'CSS/Tailwind', value: 72 },
        { name: '性能优化', value: 60 },
      ],
    },
    {
      name: '后端与架构',
      children: [
        { name: 'Node.js', value: 68 },
        { name: 'Spring Boot', value: 62 },
        { name: '微服务', value: 55 },
        { name: 'RESTful API', value: 75 },
      ],
    },
    {
      name: '数据与AI',
      children: [
        { name: 'MySQL', value: 72 },
        { name: 'Redis', value: 60 },
        { name: '机器学习', value: 55 },
        { name: '数据分析', value: 65 },
      ],
    },
    {
      name: '工程与运维',
      children: [
        { name: 'Git', value: 85 },
        { name: 'Docker', value: 63 },
        { name: 'CI/CD', value: 58 },
        { name: 'Linux', value: 70 },
      ],
    },
  ],
};

interface CapabilityTreeChartProps {
  data?: TreeNode;
  depth?: number;
  /** 可编辑模式：叶节点支持拖拽调整值 */
  editable?: boolean;
  onChange?: (newData: TreeNode) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  editable: boolean;
  onLeafChange?: (name: string, value: number) => void;
}

function getBarColor(value?: number) {
  if (value === undefined) return null;
  if (value >= 80) return 'bg-primary';
  if (value >= 60) return 'bg-chart-2';
  if (value >= 40) return 'bg-chart-4';
  return 'bg-muted-foreground';
}

function deepUpdate(node: TreeNode, leafName: string, newValue: number): TreeNode {
  if (!node.children || node.children.length === 0) {
    return node.name === leafName ? { ...node, value: newValue } : node;
  }
  return { ...node, children: node.children.map(c => deepUpdate(c, leafName, newValue)) };
}

function TreeNodeItem({ node, depth, editable, onLeafChange }: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [dragging, setDragging] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const indent = depth * 20;
  const barColor = getBarColor(node.value);

  // 拖拽调整值
  const handleBarDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editable || !isLeaf || node.value === undefined) return;
    const barEl = e.currentTarget;
    const rect = barEl.getBoundingClientRect();
    setDragging(true);

    const update = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onLeafChange?.(node.name, Math.round(ratio * 100));
    };
    update(e.clientX);

    const onMove = (ev: MouseEvent) => update(ev.clientX);
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // 触摸拖拽
  const handleBarTouchDrag = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!editable || !isLeaf || node.value === undefined) return;
    const barEl = e.currentTarget;
    const rect = barEl.getBoundingClientRect();
    setDragging(true);

    const update = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onLeafChange?.(node.name, Math.round(ratio * 100));
    };

    const onMove = (ev: TouchEvent) => { ev.preventDefault(); update(ev.touches[0].clientX); };
    const onEnd = () => {
      setDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const getNodeColor = () => {
    if (depth === 0) return 'text-primary font-semibold text-base';
    if (depth === 1) return 'text-foreground font-medium';
    return 'text-muted-foreground text-sm';
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 rounded-sm transition-colors ${
          hasChildren ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(v => !v)}
      >
        <span className="shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Circle className="w-2 h-2 text-muted-foreground fill-muted-foreground" />
          )}
        </span>
        <span className={`flex-1 min-w-0 truncate ${getNodeColor()}`}>{node.name}</span>

        {node.value !== undefined && (
          <div className="flex items-center gap-2 shrink-0 pr-2">
            {/* 可拖拽进度条 */}
            <div
              className={`relative w-24 h-3 bg-muted rounded-full overflow-hidden ${
                editable && isLeaf ? 'cursor-ew-resize select-none' : ''
              } ${dragging ? 'ring-1 ring-primary' : ''}`}
              onMouseDown={editable && isLeaf ? handleBarDrag : undefined}
              onTouchStart={editable && isLeaf ? handleBarTouchDrag : undefined}
              title={editable && isLeaf ? '拖拽调整能力值' : undefined}
            >
              <div
                className={`h-full rounded-full transition-all ${barColor ?? 'bg-muted-foreground'}`}
                style={{ width: `${node.value}%` }}
              />
              {/* 编辑模式拖拽手柄标识 */}
              {editable && isLeaf && (
                <div
                  className="absolute top-0 h-full flex items-center pointer-events-none"
                  style={{ left: `${Math.max(0, node.value - 8)}%` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-background border border-primary opacity-80" />
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
              {node.value}
            </span>
            {editable && isLeaf && (
              <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNodeItem
              key={i}
              node={child}
              depth={depth + 1}
              editable={editable}
              onLeafChange={onLeafChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CapabilityTreeChart({ data, depth = 0, editable = false, onChange }: CapabilityTreeChartProps) {
  // 无外部数据时使用互联网/科技内置模板
  const activeData: TreeNode = (data && data.name) ? data : TECH_DEFAULT_TREE;

  const handleLeafChange = (leafName: string, value: number) => {
    const updated = deepUpdate(activeData, leafName, value);
    onChange?.(updated);
  };

  return (
    <div className="w-full">
      {editable && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          拖拽蓝色进度条可调整技能掌握程度
        </p>
      )}
      <TreeNodeItem
        node={activeData}
        depth={depth}
        editable={editable}
        onLeafChange={handleLeafChange}
      />
    </div>
  );
}

