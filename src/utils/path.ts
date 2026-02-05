/**
 * 路径字符串工具（跨平台：Windows/Unix）
 *
 * 说明：前端侧无法依赖 Node.js 的 `path`，因此使用轻量字符串处理。
 */

export function getPathSeparator(filePath: string): '/' | '\\' {
  return filePath.includes('\\') ? '\\' : '/';
}

export function getParentDir(filePath: string): string {
  const sep = getPathSeparator(filePath);
  const idx = filePath.lastIndexOf(sep);
  if (idx <= 0) return '';
  return filePath.substring(0, idx);
}

export function renameSiblingPath(oldPath: string, newBaseName: string, ext: string): string {
  const sep = getPathSeparator(oldPath);
  const parentDir = getParentDir(oldPath);
  const safeName = newBaseName.trim();
  if (!parentDir) return `${safeName}${ext}`;
  return `${parentDir}${sep}${safeName}${ext}`;
}

