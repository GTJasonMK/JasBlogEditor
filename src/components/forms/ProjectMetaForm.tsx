import { useEditorStore } from '@/store';
import { TagInput } from './TagInput';
import type { ProjectMetadata } from '@/types';

export function ProjectMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'project') return null;

  const metadata = currentFile.metadata as ProjectMetadata;

  // 技术栈：TechStackItem[] <-> string[] 转换
  const techStackItems = metadata.techStack || [];
  const techStackNames = techStackItems.map(item => item.name);
  const handleTechStackChange = (names: string[]) => {
    // 尽量保留已有的 icon/color 配置（与 JasBlog techStack 结构兼容）
    const next = names.map((name) => techStackItems.find((item) => item.name === name) ?? { name });
    updateMetadata({ techStack: next });
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">项目名称</label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => updateMetadata({ name: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">描述</label>
        <textarea
          value={metadata.description}
          onChange={(e) => updateMetadata({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] resize-none"
        />
      </div>

      {/* GitHub */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">GitHub 地址</label>
        <input
          type="text"
          value={metadata.github}
          onChange={(e) => updateMetadata({ github: e.target.value })}
          placeholder="https://github.com/..."
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Demo */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Demo 地址</label>
        <input
          type="text"
          value={metadata.demo || ''}
          onChange={(e) => updateMetadata({ demo: e.target.value || undefined })}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 技术栈 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">技术栈</label>
        <TagInput
          tags={techStackNames}
          onChange={handleTechStackChange}
          placeholder="输入技术名称，按回车添加"
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">标签</label>
        <TagInput
          tags={metadata.tags || []}
          onChange={(tags) => updateMetadata({ tags })}
        />
      </div>
    </div>
  );
}
