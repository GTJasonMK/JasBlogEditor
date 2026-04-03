# 新建考研日志默认相对路径设计

## 目标

让编辑器在新建 `diary` 时自动预填一个基于创建时间的相对路径，减少手输目录层级的成本，同时保持用户仍可手动修改路径。

## 设计结论

- 仅对 `diary` 生效，`note / project / graph / roadmap` 保持现状。
- 新建对话框中的输入框默认值改为当前本地时间生成的相对路径：
  - 格式：`YYYY/MM/YYYY-MM-DD-HH-mm`
  - 示例：`2026/04/2026-04-03-21-35`
- 用户仍然可以直接修改整个相对路径，创建逻辑不增加任何静默限制。

## 作用范围

- 变更入口仅限新建对话框 [TemplatePickerDialog.tsx](/mnt/e/code/jas/JasBlogEditor/src/components/layout/toolbar/TemplatePickerDialog.tsx)。
- 路径格式生成提炼为内容服务层 helper，避免在 UI 中手写日期拼接。
- 现有的 [buildJasblogFilePath](/mnt/e/code/jas/JasBlogEditor/src/services/contentTemplates.ts) 继续负责把相对路径拼成最终文件路径。

## 交互约束

- 打开 `diary` 新建对话框时自动填入当前时间路径。
- 切换到其他内容类型时不预填该值。
- 再次打开 `diary` 对话框时重新按当下时间生成默认值，不复用上一次输入。

## 测试

- 添加纯逻辑测试，验证默认相对路径格式符合 `YYYY/MM/YYYY-MM-DD-HH-mm`。
- 添加 UI 源码契约测试，验证 `TemplatePickerDialog` 对 `diary` 使用该 helper 作为默认值。
- 运行 `npm test`。
- 运行 Windows 环境 `npm run build`。
