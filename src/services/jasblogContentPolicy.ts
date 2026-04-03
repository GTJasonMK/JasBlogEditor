import { CONTENT_DIRS, type JasBlogContentType } from '@/types';
import { normalizeSlashes } from '@/utils/path';

export function supportsNestedJasBlogContent(contentType: JasBlogContentType): boolean {
  return contentType === 'diary';
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
