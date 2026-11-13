# InkPath Preview 项目状态快照

## 2026-11-14 第二轮需求（进行中）
- 目标：修复错误/警告过多后显示为黄色薄条；错误项始终可读可点击到编辑器目标行；暂停到某段轨迹后按钮一键插入当前可配置的 marker。
- 已核对：ErrorPanel 列表 `max-height:220px; display:flex; flex-direction:column; overflow-y:auto`，其中每条 `li` 为默认可收缩项且 `overflow:hidden`；播放器暂没有插入按钮；错误跳转目前只通过 `activeLine` 间接请求滚动，同一条反复点击可能不触发。
- 现阶段：复现、修复、测试及重新部署。
- 已实测正式站：45 条越界警告时列表 clientHeight=220、第一条 li 高度=0 但 scrollHeight=85，直接坐实 Flex 子项被挤成零高度，而不是解析出错。
- 已实现：`li flex:0 0 auto` 和列表滚动；错误行跳转独立 token 请求；播放区新增“插入 Marker”按钮及纯文本插入工具（保留行尾换行并防重复）。
- 已完成 App 接线：暂停段定位到当前完整 G-code 行之后；`t=0` 在第一条运动之前；插入只增添整行、光标跳转到 marker 行，播放时间线重解析后恢复原暂停进度；禁用播放中/无轨迹/有阻断错误/marker 为空时的插入操作。

## 当前结论
- 现状：仓库 `D:\Workspace\Inkagination\inkpath-preview`，线上 `https://inkpath-preview.zjhstudio.com/`。
- 已完成：查明 `G1 F...` 被 `validateMotionArguments` 错判；`###` 被 `parseLine` 判不支持；Monaco `revealLineInCenter` 可能在键入时抢滚动位置。
- 已完成：解析器识别可配置整行 marker；F-only 指令通过语义校验并沿用既有模态速度计算；Monaco 不在普通编辑时自动强制滚动；设置面板加入 marker 输入。
- 已完成：新增 7 项独立回归测试，覆盖 F-only/原始行号/默认及自定义 marker/英寸单位/暂停与异常输入。
- 已完成：`npm test` 7/7、ESLint 和生产构建均通过；Chrome CDP 中默认 marker + F-only 的 49 行程序显示 0 个问题，末行按 Enter 并追加 marker 后，视口仍停留在末尾（未返回第一行）；修改设置中的 marker 会即时改变解析结果。
- 正在做：精简测试环境的无害 Vite 关闭警告，复测并发布 GitHub 关联的 Cloudflare Pages 生产站。
- 下一步：本地测试、部署 Cloudflare Pages、生产回归验证。

## 关键决策与理由
- `F` 是模态进给速度；无坐标的 `G1 F...` 可以仅更新状态而无需创建轨迹。
- marker 是整行文本分隔符，保留在编辑文档中，跳过解析，不改变运动命令。
- 编辑器聚焦时不自动滚动到播放行，防止换行后视图跳走。
- 已复核旧行为：编辑器失焦时仍应允许拖动播放进度条或选择错误行自动定位，因此只按输入焦点限制滚动，不额外限制暂停状态下的手动定位。
- 已复测焦点保护优化：50 行 G-code 输入 Enter 并继续输入默认 marker 后，当前显示 34–50 行，错误列表为 0。
- 已确认生产部署与 GitHub `master` 联动，核心修复版 `3af7d46` 通过 Cloudflare Pages 全部阶段和正式域名 smoke；文档与最后的焦点回归优化随下一次提交发布。

## 常见坑 / 复现方法
- `G21\nG90\nG1 F1200\nG1 X20 Y-20`：此前第三行误报缺少坐标。
- `G1 X1 Y-1\n###\nG1 X2 Y-2`：此前第二行报不支持命令。
- Monaco 中间某行按 Enter：此前可能被自动 `revealLineInCenter` 拉回顶部。
