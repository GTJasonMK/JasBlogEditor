import { useEffect, useMemo, useRef, useState } from "react";
import { invokeTauri } from "@/platform/tauri";
import { useFileStore } from "@/store";
import {
  buildJasBlogSearchIndex,
  buildSearchFilesSignature,
  collectJasBlogSearchFiles,
  type SearchFileRef,
  type SearchIndexItem,
  type SearchSourceFile,
} from "@/services/jasblogSearch";

interface SearchIndexState {
  index: SearchIndexItem[];
  indexing: boolean;
  indexError: string | null;
}

function resetIndexCache(
  signatureRef: React.MutableRefObject<string | null>,
  sizeRef: React.MutableRefObject<number>
): void {
  signatureRef.current = null;
  sizeRef.current = 0;
}

function clearIndexState(
  setIndex: React.Dispatch<React.SetStateAction<SearchIndexItem[]>>,
  setIndexError: React.Dispatch<React.SetStateAction<string | null>>,
  setIndexing: React.Dispatch<React.SetStateAction<boolean>>,
  signatureRef: React.MutableRefObject<string | null>,
  sizeRef: React.MutableRefObject<number>,
  clearIndex: boolean
): void {
  resetIndexCache(signatureRef, sizeRef);
  if (clearIndex) setIndex([]);
  setIndexError(null);
  setIndexing(false);
}

function canReuseCachedIndex(
  filesSignature: string,
  signatureRef: React.MutableRefObject<string | null>,
  sizeRef: React.MutableRefObject<number>
): boolean {
  return signatureRef.current === filesSignature && sizeRef.current > 0;
}

async function readSearchSources(files: readonly SearchFileRef[]): Promise<SearchSourceFile[]> {
  return Promise.all(
    files.map(async (file) => ({
      ...file,
      raw: await invokeTauri("read_file", { path: file.path }),
    }))
  );
}

export function useJasBlogSearchIndex(open: boolean): SearchIndexState {
  const { fileTree, workspaceType, fileTreeVersion } = useFileStore();
  const files = useMemo(() => collectJasBlogSearchFiles(fileTree), [fileTree]);
  const filesSignature = useMemo(
    () => buildSearchFilesSignature(files, fileTreeVersion),
    [files, fileTreeVersion]
  );

  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const cachedSignatureRef = useRef<string | null>(null);
  const cachedSizeRef = useRef(0);

  useEffect(() => {
    if (!open || workspaceType !== "jasblog") {
      clearIndexState(setIndex, setIndexError, setIndexing, cachedSignatureRef, cachedSizeRef, false);
      return;
    }
    if (files.length === 0) {
      clearIndexState(setIndex, setIndexError, setIndexing, cachedSignatureRef, cachedSizeRef, true);
      return;
    }
    if (canReuseCachedIndex(filesSignature, cachedSignatureRef, cachedSizeRef)) return;

    let cancelled = false;
    const requestId = ++requestIdRef.current;
    setIndexError(null);
    setIndexing(true);

    void loadIndex();
    return () => {
      cancelled = true;
    };

    async function loadIndex() {
      try {
        const rawFiles = await readSearchSources(files);
        if (cancelled || requestId !== requestIdRef.current) return;

        const nextIndex = buildJasBlogSearchIndex(rawFiles);
        setIndex(nextIndex);
        cachedSignatureRef.current = filesSignature;
        cachedSizeRef.current = nextIndex.length;
      } catch (error) {
        console.error("构建搜索索引失败:", error);
        if (!cancelled && requestId === requestIdRef.current) {
          setIndex([]);
          setIndexError(String(error));
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIndexing(false);
        }
      }
    }
  }, [files, filesSignature, open, workspaceType]);

  return { index, indexing, indexError };
}
