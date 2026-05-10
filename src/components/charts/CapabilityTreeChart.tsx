import React, { useState } from 'react';
import { TreeNode } from '@/types/types';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';

interface CapabilityTreeChartProps {
  data: TreeNode;
  depth?: number;
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  expanded?: boolean;
}

function TreeNodeItem({ node, depth }: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 20;

  const getNodeColor = () => {
    if (depth === 0) return 'text-primary font-semibold text-base';
    if (depth === 1) return 'text-foreground font-medium';
    return 'text-muted-foreground text-sm';
  };

  const getBarColor = () => {
    if (node.value === undefined) return null;
    if (node.value >= 80) return 'bg-primary';
    if (node.value >= 60) return 'bg-chart-2';
    if (node.value >= 40) return 'bg-chart-4';
    return 'bg-muted-foreground';
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 rounded-sm hover:bg-muted/50 cursor-pointer transition-colors ${hasChildren ? '' : 'cursor-default'}`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(v => !v)}
      >
        <span className="shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Circle className="w-2 h-2 text-muted-foreground fill-muted-foreground" />
          )}
        </span>
        <span className={`flex-1 min-w-0 truncate ${getNodeColor()}`}>{node.name}</span>
        {node.value !== undefined && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor()}`}
                style={{ width: `${node.value}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-7 text-right">{node.value}</span>
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNodeItem key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CapabilityTreeChart({ data, depth = 0 }: CapabilityTreeChartProps) {
  return (
    <div className="w-full">
      <TreeNodeItem node={data} depth={depth} />
    </div>
  );
}
