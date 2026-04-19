import { useEffect, useMemo, useRef, useState } from "react";
import { HelpModalActivePanel } from "./help/helpModalActivePanel";
import {
  filterHelpTabs,
  groupHelpTabs,
  type HelpTabDefinition,
  type HelpTabId,
} from "./help/helpModalSchema";
import { HelpModalSidebar } from "./help/helpModalSidebar";
import { HELP_MODAL_TABS } from "./help/helpModalTabs";

const DEFAULT_TAB_ID: HelpTabId = "markdown";
const SECTION_SCROLL_GAP = 16;

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

function HelpModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4">
      <div className="min-w-0 flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 14h.01M16 10h.01M9 16h6M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
        渲染帮助
      </div>
      <div className="flex-1" />
      <button
        onClick={onClose}
        className="shrink-0 rounded-md px-2 py-1 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        title="关闭 (Esc)"
        aria-label="关闭帮助面板"
      >
        关闭
      </button>
    </div>
  );
}

function getActiveTab(
  tabs: readonly HelpTabDefinition[],
  activeId: HelpTabId | null
): HelpTabDefinition | null {
  return tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const [activeId, setActiveId] = useState<HelpTabId>(DEFAULT_TAB_ID);
  const [searchKeyword, setSearchKeyword] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const filteredTabs = useMemo(
    () => filterHelpTabs(HELP_MODAL_TABS, searchKeyword),
    [searchKeyword]
  );
  const groupedTabs = useMemo(
    () => groupHelpTabs(filteredTabs),
    [filteredTabs]
  );
  const activeTab = getActiveTab(filteredTabs, activeId);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setActiveId(DEFAULT_TAB_ID);
    setSearchKeyword("");
  }, [open]);

  useEffect(() => {
    if (!filteredTabs.length) return;
    if (filteredTabs.some((tab) => tab.id === activeId)) return;
    setActiveId(filteredTabs[0].id);
  }, [filteredTabs, activeId]);

  useEffect(() => {
    if (!open) return;
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open, activeId]);

  if (!open) return null;

  const scrollToSection = (sectionId: string) => {
    const container = contentRef.current;
    const target = container?.querySelector<HTMLElement>(`#${sectionId}`);
    if (!container || !target) return;

    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const nextTop =
      container.scrollTop +
      targetTop -
      containerTop -
      SECTION_SCROLL_GAP;

    container.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl h-[85vh] max-h-[85vh] min-h-0 flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-2xl">
          <HelpModalHeader onClose={onClose} />
          <div className="min-h-0 flex flex-1 flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
            <HelpModalSidebar
              keyword={searchKeyword}
              total={HELP_MODAL_TABS.length}
              filteredCount={filteredTabs.length}
              groupedTabs={groupedTabs}
              activeId={activeTab?.id ?? null}
              onChange={setSearchKeyword}
              onClear={() => setSearchKeyword("")}
              onSelect={setActiveId}
            />
            <HelpModalActivePanel
              activeTab={activeTab}
              contentRef={contentRef}
              summaryRef={summaryRef}
              onScrollToSection={scrollToSection}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
