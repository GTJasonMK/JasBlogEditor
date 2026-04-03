import { CONTENT_DIRS, type JasBlogContentType } from '@/types';
import { normalizeSlashes } from '@/utils/path';

export function supportsNestedJasBlogContent(contentType: JasBlogContentType): boolean {
  return contentType === 'diary';
}

export function getJasBlogRelativePathError(
  contentType: JasBlogContentType,
  input: string
): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const segments = trimmed
    .replace(/^[\\/]+/, '')
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return '路径不能包含 . 或 .. 段。';
  }

  if (!supportsNestedJasBlogContent(contentType) && segments.length > 1) {
    return '该类型只支持一级文件名，不允许子目录。';
  }

  return null;
}

export function isPublishableJasBlogPath(
  workspacePath: string | null,
  filePath: string,
  contentType: JasBlogContentType
): boolean {
  if (!workspacePath) {
    return true;
  }

  const normalizedWorkspace = normalizeSlashes(workspacePath).replace(/\/+$/, '');
  const normalizedPath = normalizeSlashes(filePath);
  const moduleRoot = `${normalizedWorkspace}/content/${CONTENT_DIRS[contentType]}`;

  if (!normalizedPath.startsWith(`${moduleRoot}/`) || !normalizedPath.toLowerCase().endsWith('.md')) {
    return false;
  }

  const relativePath = normalizedPath.slice(moduleRoot.length + 1);
  return supportsNestedJasBlogContent(contentType) || !relativePath.includes('/');
}
