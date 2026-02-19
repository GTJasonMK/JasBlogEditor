import { normalizeSlashes } from '@/utils/path';

// 支持的 diary 文件名：YYYY-MM-DD-HH-mm-title.md / YYYY-MM-DD-HH-mm.md / YYYY-MM-DD.md
const DIARY_FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:-(\d{2})-(\d{2}))?(?:-(.+))?$/;

export const DIARY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DiaryNameInference {
  date: string;
  time: string;
  title: string;
}

export function titleFromSlug(value: string): string {
  return value.replace(/[-_]+/g, ' ').trim();
}

export function inferDiaryFromFileName(fileNameNoExt: string): DiaryNameInference | null {
  const match = fileNameNoExt.match(DIARY_FILE_NAME_PATTERN);
  if (!match) return null;

  const [, date, hour, minute, titleSlug] = match;
  const time = hour && minute ? `${hour}:${minute}` : '';
  const title = titleSlug ? titleFromSlug(titleSlug) : date;

  return { date, time, title };
}

export function resolveDiaryDate(metaDate: string | undefined, inferredDate: string | undefined): string {
  const normalizedMetaDate = (metaDate || '').trim();
  if (DIARY_DATE_PATTERN.test(normalizedMetaDate)) {
    return normalizedMetaDate;
  }

  const normalizedInferredDate = (inferredDate || '').trim();
  if (DIARY_DATE_PATTERN.test(normalizedInferredDate)) {
    return normalizedInferredDate;
  }

  return '';
}

export function buildDiaryEntryId(filePath: string, diaryRootPath: string): string {
  const normalizedPath = normalizeSlashes(filePath);
  const normalizedRoot = normalizeSlashes(diaryRootPath).replace(/\/+$/, '');

  if (normalizedRoot) {
    const prefix = `${normalizedRoot}/`;
    if (normalizedPath.startsWith(prefix)) {
      return normalizedPath.slice(prefix.length).replace(/\.md$/i, '');
    }
  }

  return (normalizedPath.split('/').pop() || normalizedPath).replace(/\.md$/i, '');
}
