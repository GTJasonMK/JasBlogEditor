import { useEditorStore } from '@/store';
import { NoteMetaForm } from '../forms/NoteMetaForm';
import { ProjectMetaForm } from '../forms/ProjectMetaForm';
import { RoadmapMetaForm } from '../forms/RoadmapMetaForm';
import { GraphMetaForm } from '../forms/GraphMetaForm';

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

        {currentFile.type === 'note' && <NoteMetaForm />}
        {currentFile.type === 'project' && <ProjectMetaForm />}
        {currentFile.type === 'roadmap' && <RoadmapMetaForm />}
        {currentFile.type === 'graph' && <GraphMetaForm />}
      </div>
    </div>
  );
}
