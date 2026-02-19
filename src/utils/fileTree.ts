import type { ContentType } from '@/types';
import type { FileTreeNode } from '@/store/fileStore';

// 递归收集文件树叶子节点（文件）
export function collectLeafFiles(nodes?: FileTreeNode[]): FileTreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  const results: FileTreeNode[] = [];
  const queue = [...nodes];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.isDir) {
      if (node.children?.length) {
        queue.push(...node.children);
      }
      continue;
    }

    results.push(node);
  }

  return results;
}

export function collectLeafFilesByType(nodes: FileTreeNode[], contentType: ContentType): FileTreeNode[] {
  return collectLeafFiles(nodes).filter((node) => node.contentType === contentType);
}
