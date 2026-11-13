# InkPath Preview 项目状态快照

## 当前结论
- 现状：仓库 `D:\Workspace\Inkagination\inkpath-preview`，线上 `https://inkpath-preview.zjhstudio.com/`。
- 已完成：查明 `G1 F...` 被 `validateMotionArguments` 错判；`###` 被 `parseLine` 判不支持；Monaco `revealLineInCenter` 可能在键入时抢滚动位置。
- 已完成：解析器识别可配置整行 marker；F-only 指令通过语义校验并沿用既有模态速度计算；Monaco 不在普通编辑时自动强制滚动；设置面板加入 marker 输入。
- 正在做：增加独立测试并校验浏览器交互。
- 下一步：本地测试、部署 Cloudflare Pages、生产回归验证。

## 关键决策与理由
- `F` 是模态进给速度；无坐标的 `G1 F...` 可以仅更新状态而无需创建轨迹。
- marker 是整行文本分隔符，保留在编辑文档中，跳过解析，不改变运动命令。
- 编辑器聚焦时不自动滚动到播放行，防止换行后视图跳走。

## 常见坑 / 复现方法
- `G21\nG90\nG1 F1200\nG1 X20 Y-20`：此前第三行误报缺少坐标。
- `G1 X1 Y-1\n###\nG1 X2 Y-2`：此前第二行报不支持命令。
- Monaco 中间某行按 Enter：此前可能被自动 `revealLineInCenter` 拉回顶部。
