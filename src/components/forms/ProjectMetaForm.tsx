import { useEditorStore } from '@/store';
import { TagInput } from './TagInput';
import type { ProjectMetadata } from '@/types';

// 简单的 URL 验证
function isValidUrl(url: string): boolean {
  if (!url) return true; // 空值对于可选字段是有效的
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function ProjectMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'project') return null;

  const metadata = currentFile.metadata as ProjectMetadata;

  // 验证
  const isNameEmpty = !metadata.name.trim();
  const isGithubInvalid = metadata.github && !isValidUrl(metadata.github);
  const isDemoInvalid = metadata.demo && !isValidUrl(metadata.demo);

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
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          项目名称 <span className="text-[var(--color-danger)]">*</span>
        </label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => updateMetadata({ name: e.target.value })}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[var(--color-primary)] ${
            isNameEmpty ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          }`}
          required
        />
        {isNameEmpty && (
          <span className="text-xs text-[var(--color-danger)] mt-1">项目名称不能为空</span>
        )}
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
          type="url"
          value={metadata.github}
          onChange={(e) => updateMetadata({ github: e.target.value })}
          placeholder="https://github.com/..."
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[var(--color-primary)] ${
            isGithubInvalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          }`}
        />
        {isGithubInvalid && (
          <span className="text-xs text-[var(--color-danger)] mt-1">请输入有效的 URL</span>
        )}
      </div>

      {/* Demo */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Demo 地址</label>
        <input
          type="url"
          value={metadata.demo || ''}
          onChange={(e) => updateMetadata({ demo: e.target.value || undefined })}
          placeholder="https://..."
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[var(--color-primary)] ${
            isDemoInvalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          }`}
        />
        {isDemoInvalid && (
          <span className="text-xs text-[var(--color-danger)] mt-1">请输入有效的 URL</span>
        )}
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">状态</label>
        <select
          value={metadata.status || 'active'}
          onChange={(e) => updateMetadata({ status: e.target.value as 'active' | 'archived' | 'wip' })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="active">活跃</option>
          <option value="wip">开发中</option>
          <option value="archived">归档</option>
        </select>
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
