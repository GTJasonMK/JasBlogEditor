import { useEffect, useRef, useState } from "react";
import { ExamplePreviewPane } from "./ExamplePreviewPane";
import { FrontmatterHelpExamplePreview } from "./FrontmatterHelpExamplePreview";
import {
  ExamplePreviewErrorState,
  PreviewErrorBoundary,
} from "./ExamplePreviewBoundary";
import { ExamplePreviewToolbar } from "./ExamplePreviewToolbar";
import { useSynchronizedPaneScroll } from "./useSynchronizedPaneScroll";
import {
  buildExamplePreviewUrl,
  EXAMPLE_PREVIEW_NAVIGATE_EVENT,
  getAdjacentExampleId,
  getFrontmatterHelpExampleById,
  getFrontmatterHelpExamplesByType,
  type ExamplePreviewNavigatePayload,
} from "./examplePreviewModel";
import type { FrontmatterHelpExample } from "@/components/layout/toolbar/help/frontmatterHelpData";
import { isTauri } from "@/platform/runtime";

interface ExamplePreviewWindowProps {
  initialExampleId: string | null;
}

function getFirstExampleIdByType(type: FrontmatterHelpExample["type"]) {
  return getFrontmatterHelpExamplesByType(type)[0]?.id ?? null;
}

function useExamplePreviewNavigation(initialExampleId: string | null) {
  const [selectedExampleId, setSelectedExampleId] = useState(initialExampleId);
  const currentExample = getFrontmatterHelpExampleById(selectedExampleId);

  useEffect(() => {
    if (!selectedExampleId) return;
    window.history.replaceState(
      null,
      "",
      buildExamplePreviewUrl(window.location.href, selectedExampleId)
    );
  }, [selectedExampleId]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    void import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) =>
      WebviewWindow.getCurrent()
        .listen<ExamplePreviewNavigatePayload>(
          EXAMPLE_PREVIEW_NAVIGATE_EVENT,
          (event) => setSelectedExampleId(event.payload.exampleId)
        )
        .then((dispose) => {
          unlisten = dispose;
        })
    );

    return () => {
      unlisten?.();
    };
  }, []);

  return { currentExample, selectedExampleId, setSelectedExampleId };
}

function useCopyStatus(currentExample: FrontmatterHelpExample | null) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => setCopyStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  async function handleCopyRaw() {
    if (!currentExample) return;

    try {
      await navigator.clipboard.writeText(currentExample.raw);
      setCopyStatus("原始文档已复制到剪贴板");
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败";
      setCopyStatus(`复制失败：${message}`);
    }
  }

  return { copyStatus, handleCopyRaw };
}

function ExamplePreviewLayout({
  currentExample,
  copyStatus,
  syncScroll,
  setSelectedExampleId,
  onCopy,
  onClose,
  onToggleSyncScroll,
}: {
  currentExample: FrontmatterHelpExample;
  copyStatus: string | null;
  syncScroll: boolean;
  setSelectedExampleId: (exampleId: string | null) => void;
  onCopy: () => Promise<void>;
  onClose: () => Promise<void>;
  onToggleSyncScroll: () => void;
}) {
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useSynchronizedPaneScroll(syncScroll, leftPaneRef, rightPaneRef);

  useEffect(() => {
    leftPaneRef.current?.scrollTo({ top: 0 });
    rightPaneRef.current?.scrollTo({ top: 0 });
  }, [currentExample.id]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <ExamplePreviewToolbar
        currentExample={currentExample}
        syncScroll={syncScroll}
        copyStatus={copyStatus}
        onTypeChange={(event) =>
          setSelectedExampleId(
            getFirstExampleIdByType(
              event.target.value as FrontmatterHelpExample["type"]
            )
          )
        }
        onExampleChange={(event) => setSelectedExampleId(event.target.value)}
        onStep={(offset) =>
          setSelectedExampleId(getAdjacentExampleId(currentExample.id, offset))
        }
        onCopy={onCopy}
        onToggleSyncScroll={onToggleSyncScroll}
        onClose={onClose}
      />
      <main className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-[linear-gradient(180deg,var(--color-bg),var(--color-surface))] p-4 lg:grid-cols-2">
        <ExamplePreviewPane title="原始文档">
          <div ref={leftPaneRef} className="min-h-0 flex-1 overflow-auto p-4">
            <pre className="editor-textarea whitespace-pre-wrap break-words text-sm text-[var(--color-text)]">
              <code>{currentExample.raw}</code>
            </pre>
          </div>
        </ExamplePreviewPane>
        <ExamplePreviewPane title="渲染结果">
          <div ref={rightPaneRef} className="min-h-0 flex-1 overflow-auto p-4">
            <PreviewErrorBoundary resetKey={currentExample.id}>
              <FrontmatterHelpExamplePreview
                example={currentExample}
                variant="window"
              />
            </PreviewErrorBoundary>
          </div>
        </ExamplePreviewPane>
      </main>
    </div>
  );
}

async function closeExamplePreviewWindow() {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
    return;
  }

  window.close();
}

export function ExamplePreviewWindow({
  initialExampleId,
}: ExamplePreviewWindowProps) {
  const { currentExample, selectedExampleId, setSelectedExampleId } =
    useExamplePreviewNavigation(initialExampleId);
  const [syncScroll, setSyncScroll] = useState(true);
  const { copyStatus, handleCopyRaw } = useCopyStatus(currentExample);

  if (!selectedExampleId) {
    return (
      <ExamplePreviewErrorState
        reason="缺少 exampleId 查询参数，无法确定要展示哪个示例文档。"
        onClose={closeExamplePreviewWindow}
      />
    );
  }

  if (!currentExample) {
    return (
      <ExamplePreviewErrorState
        reason={`未找到示例文档：${selectedExampleId}`}
        onClose={closeExamplePreviewWindow}
      />
    );
  }

  return (
    <ExamplePreviewLayout
      currentExample={currentExample}
      copyStatus={copyStatus}
      syncScroll={syncScroll}
      setSelectedExampleId={setSelectedExampleId}
      onCopy={handleCopyRaw}
      onClose={closeExamplePreviewWindow}
      onToggleSyncScroll={() => setSyncScroll((enabled) => !enabled)}
    />
  );
}
