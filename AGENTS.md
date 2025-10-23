# 代理工作日志

# 代理工作日志

## 2025-10-23

- 调整 `src/components/canvas/CanvasPreview.tsx` 的坐标映射函数，使纸张原点位于左上角，并补充教学注释说明缩放与坐标系取舍。
- 通过 `git revert` 回滚 `src/modules/simulation/timeline.ts` 的坐标系改动，恢复最初实现以便定位坐标方向问题。

## 2025-10-12

- 引入 `lucide-react` 并改写 `src/components/icons/ControlIcons.tsx` 的齿轮图标实现，统一复用图标库以避免手绘 SVG 角度不规整。
- 修复 `src/App.tsx` 遗漏的 `App.css` 引入，恢复隐藏文件输入的辅助样式避免“浏览文件”按钮外露。
- 调整 `src/App.tsx` 隐藏文件输入为屏幕阅读器友好的写法，解决无标签告警并抽离样式至 `src/App.css`。
- 优化 `src/components/settings/SimulatorSettingsPanel.css` 数字输入配色并新增自定义纸张尺寸表单，支持宽高输入与提示文本。
- 以 `@supports` 包裹错误面板滚动条样式，规避浏览器兼容性警告。
- 重写 `useSimulationController` 播放循环，避免播放按钮无响应并保持进度同步。
- 新增 `src/components/icons/ControlIcons.tsx` 汇总控制按钮 SVG 图标，顶栏设置按钮改用齿轮图标并添加 ARIA 属性。
- 播放控制条改用图标按钮并保留屏幕阅读器提示文本，统一按钮尺寸。
- 画布纸张改为直角矩形，以贴近真实纸面效果。

## 2025-10-11

- 初始化 Git 仓库，记录现有 Vite + React 项目作为基线。
- 新建本文档，用于在每次修改后同步说明改动范围与待办。
- 安装 `@monaco-editor/react` 与 `monaco-editor` 以便集成可编辑的 G-code 代码区。
- 新建 `src/modules/gcode/types.ts`，梳理仿真所需的核心类型定义，为后续模块解耦打基础。
- 编写 `src/modules/gcode/parser.ts`，完成基础的逐行解析与命令、参数抽取逻辑。
- 增补 `src/modules/validation/gcodeValidator.ts`，用于在解析之外校验运动指令所需的必填参数。
- 添加 `src/modules/gcode/samples.ts`，准备预置示例程序，方便默认展示与教学。
- 实现 `src/hooks/useGCodeDocument.ts`，统一管理 G-code 文本状态与解析结果。
- 开发 `src/components/editor/GCodeEditor.tsx` 与样式文件，实现 Monaco 编辑器封装、错误标记与播放行号高亮。
- 编写 `src/components/errors/ErrorPanel.tsx` 及样式，实现中文错误列表展示与快速定位功能。
- 搭建 `src/components/layout/TopBar.tsx` 与样式，完成顶栏中文界面。
- 新增 `src/components/layout/AppLayout.tsx`，统一页面网格布局与样式。
- 重写 `src/index.css`，设定全局暗色主题与基础排版变量。
- 创建 `src/components/editor/EditorPanel.tsx`，整合编辑器工具条与 Monaco 视图。
- 改写 `src/App.tsx`，接入左侧编辑器与错误面板，右侧暂以占位内容标识后续任务；同步更新布局样式以支持占位视图。
- 新增 `src/modules/simulation/timeline.ts`，实现从 G-code 指令生成运动时间线的核心逻辑。
- 编写 `src/hooks/useSimulationController.ts`，封装播放/暂停/拖动等时间线控制逻辑。
- 新建 `src/modules/simulation/config.ts`，整理默认纸张与笔设置。
- 增加 `src/modules/validation/simulationValidator.ts`，用于检测运动轨迹是否越界。
- 实现 `src/components/canvas/CanvasPreview.tsx` 及样式，完成画布渲染与进度信息展示。
- 编写 `src/components/controls/PlaybackControls.tsx`，提供播放速度与进度调节界面。
- 更新 `src/App.tsx`，整合时间线、画布预览与播放控制，完成基础仿真联动界面。
- 新建 `src/components/settings/SimulatorSettingsPanel.tsx`，实现纸张/笔参数控制面板。
- 再次扩展 `src/App.tsx`，加入文件导入/导出、参数面板接入、错误跳转联动，在清空文档时同步停止播放，并基于错误列表自动禁用播放。
- 调整 `src/components/controls/PlaybackControls.tsx` 与样式，使播放相关控件在存在阻断错误或无轨迹时自动禁用。
- 调整 `src/components/canvas/CanvasPreview.tsx` 的类型导入以兼容 TypeScript verbatimModuleSyntax。
- 调整 `src/components/controls/PlaybackControls.tsx` 的类型导入写法。
- 调整 `src/components/editor/EditorPanel.tsx` 的类型导入写法。
- 调整 `src/components/editor/GCodeEditor.tsx` 的类型导入写法。
- 调整 `src/components/errors/ErrorPanel.tsx` 的类型导入写法。
- 调整 `src/components/layout/AppLayout.tsx` 的类型导入写法。
- 调整 `src/components/settings/SimulatorSettingsPanel.tsx` 的类型导入写法。
- 调整 `src/hooks/useGCodeDocument.ts` 的类型导入写法。
- 调整 `src/hooks/useSimulationController.ts` 的类型导入与定时器清理逻辑，修复 TypeScript 报错，并改用 `null` 管理动画句柄。
- 调整 `src/modules/gcode/parser.ts` 的类型导入写法。
- 调整 `src/modules/simulation/config.ts` 的类型导入写法。
- 调整 `src/modules/simulation/timeline.ts` 的类型导入写法。
- 调整 `src/modules/validation/gcodeValidator.ts` 的类型导入写法。
- 调整 `src/modules/validation/simulationValidator.ts` 的类型导入写法。
- 重写 `README.md`，提供中文功能说明、目录结构与最小使用示例。
- 优化 `src/components/layout/AppLayout.css`，确保桌面端维持左右双栏布局并调整背景风格。
- 重构 `src/components/layout/TopBar.tsx` 与 `.css`，恢复原版 logo，并为“文件/编辑/视图/帮助/设置/访客”提供可用菜单与功能入口。
- 精简 `src/components/editor/EditorPanel.tsx` 与样式，改由顶栏菜单负责导入/下载等操作，并新增编辑器自动换行开关。
- `src/components/editor/GCodeEditor.tsx` 支持通过 props 控制自动换行。
- `src/components/canvas/CanvasPreview.tsx` 新增网格/抬笔轨迹开关支持，与顶栏设置联动。
- 调整 `src/components/layout/AppLayout.tsx`，改由父组件传入顶栏节点以便注入交互逻辑。
- 大幅改写 `src/App.tsx`，整合顶栏菜单回调、网格/抬笔开关、自动换行控制以及帮助/关于弹层。
- 新建全局样式 `src/App.css`，用于弹层与根节点排版。

> 维护提示：后续每次提交前，请追加当日操作条目，保持时间倒序，便于他人快速了解进度。
