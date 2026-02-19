/**
 * 路径字符串工具（跨平台：Windows/Unix）
 *
 * 说明：前端侧无法依赖 Node.js 的 `path`，因此使用轻量字符串处理。
 */

export function normalizeSlashes(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function isSamePath(a: string, b: string): boolean {
  return normalizeSlashes(a).toLowerCase() === normalizeSlashes(b).toLowerCase();
}

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
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  const safeName = newBaseName
    .trim()
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .pop() || 'untitled';
  const lowerExt = normalizedExt.toLowerCase();
  const baseName = safeName.toLowerCase().endsWith(lowerExt)
    ? safeName.slice(0, safeName.length - normalizedExt.length)
    : safeName;
  const finalName = baseName || 'untitled';

  if (!parentDir) return `${finalName}${normalizedExt}`;
  return `${parentDir}${sep}${finalName}${normalizedExt}`;
}
