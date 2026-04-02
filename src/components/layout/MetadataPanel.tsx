import { useEditorStore } from '@/store';
import { CONTENT_TYPE_UI } from '@/config/contentTypeUi';
import { AgentOperatorPanel } from '@/components/agent/AgentOperatorPanel';

export function MetadataPanel() {
  const { currentFile } = useEditorStore();

  return (
    <div className="w-80 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {currentFile ? (
          <>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-4">元数据</h3>
            {(() => {
              const MetaForm = CONTENT_TYPE_UI[currentFile.type]?.MetaForm;
              return MetaForm ? <MetaForm /> : null;
            })()}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-[var(--color-text-muted)] text-center">
              选择文件以编辑元数据
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] overflow-y-auto max-h-[48%] bg-[var(--color-surface)]">
        <AgentOperatorPanel />
      </div>
    </div>
  );
}
