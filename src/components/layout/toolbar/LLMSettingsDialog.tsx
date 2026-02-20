import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store';
import { LLMClient } from '@/services/llm';

interface LLMSettingsDialogProps {
  onClose: () => void;
}

export function LLMSettingsDialog({ onClose }: LLMSettingsDialogProps) {
  const { settings, saveLLMSettings } = useSettingsStore();

  const [apiKey, setApiKey] = useState(settings.llm?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings.llm?.baseUrl || '');
  const [model, setModel] = useState(settings.llm?.model || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // 每次打开时同步最新设置
  useEffect(() => {
    setApiKey(settings.llm?.apiKey || '');
    setBaseUrl(settings.llm?.baseUrl || '');
    setModel(settings.llm?.model || '');
  }, [settings.llm]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await saveLLMSettings({
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('请先填写 API Key');
      return;
    }

    setTestStatus('testing');
    setTestMessage('正在测试连接...');

    try {
      const client = LLMClient.createFromConfig(
        {
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          model: model.trim() || undefined,
        },
        true,
        true,
      );

      const result = await client.streamAndCollect({
        messages: [{ role: 'user', content: '请回复"连接成功"四个字' }],
        model: model.trim() || 'gpt-3.5-turbo',
        maxTokens: 32,
        timeout: 30,
      });

      if (result.content) {
        setTestStatus('success');
        setTestMessage(`连接成功：${result.content.slice(0, 50)}`);
      } else {
        setTestStatus('error');
        setTestMessage('未收到响应内容');
      }
    } catch (e) {
      setTestStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setTestMessage(`连接失败：${msg.slice(0, 100)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
        <h3 className="text-lg font-medium mb-4">LLM 设置</h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">API 地址（可选）</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              留空使用官方地址，填写中转站地址时自动追加路径
            </p>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">模型（可选）</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              含"claude"字样自动使用 Anthropic 格式，其余使用 OpenAI 格式
            </p>
          </div>
        </div>

        {/* 测试状态 */}
        {testStatus !== 'idle' && (
          <div
            className={`mb-4 px-3 py-2 rounded-md text-sm ${
              testStatus === 'testing'
                ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                : testStatus === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {testMessage}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-50 rounded-md transition-colors"
          >
            {testStatus === 'testing' ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
