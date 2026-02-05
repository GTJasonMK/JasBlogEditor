import { useEditorStore } from '@/store';
import { CONTENT_TYPE_UI } from '@/config/contentTypeUi';

export function MetadataPanel() {
  const { currentFile } = useEditorStore();

  if (!currentFile) {
    return (
      <div className="w-72 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex items-center justify-center p-4">
        <div className="text-sm text-[var(--color-text-muted)] text-center">
          选择文件以编辑元数据
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-4">元数据</h3>
        {(() => {
          const MetaForm = CONTENT_TYPE_UI[currentFile.type]?.MetaForm;
          return MetaForm ? <MetaForm /> : null;
        })()}
      </div>
    </div>
  );
}
