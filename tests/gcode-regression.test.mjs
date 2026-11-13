/**
 * InkPath Preview 的 G-code 回归测试。
 *
 * 直接利用项目已有的 Vite 将 TypeScript 模块加载到 Node 测试进程，
 * 无须增加新的测试框架依赖。每条测试只观察解析/校验/时间线结果，
 * 避免依赖浏览器的动态布局，交互层另用 CDP 真机浏览器检验。
 */
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({
  configFile: false,
  // 单元测试只需 Vite 的 TS 加载能力，不需要扫描页面入口并预打包浏览器依赖。
  // 关闭依赖发现可避免用例退出时，后台预扫描还未结束的无意义报错。
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})

after(async () => {
  await vite.close()
})

const { parseGCode } = await vite.ssrLoadModule('/src/modules/gcode/parser.ts')
const { validateProgram } = await vite.ssrLoadModule('/src/modules/validation/gcodeValidator.ts')
const { buildSimulationTimeline } = await vite.ssrLoadModule('/src/modules/simulation/timeline.ts')
const { DEFAULT_SIMULATOR_SETTINGS } = await vite.ssrLoadModule('/src/modules/simulation/config.ts')
const { insertMarkerAfterLine, getMarkerInsertionAfterLine } =
  await vite.ssrLoadModule('/src/modules/gcode/markerInsert.ts')

/** 模拟文档 Hook 中的“解析 + 校验”流程，断言真实播放门槛使用的错误集合。 */
function analyze(source, marker) {
  const program = marker === undefined ? parseGCode(source) : parseGCode(source, marker)
  return { program, issues: [...program.issues, ...validateProgram(program)] }
}

test('G1 F-only 设置速度而不产生虚假运动，随后运动沿用速度', () => {
  const { program, issues } = analyze('G21\nG90\nG1 F600\nG1 X20 Y-10')
  const timeline = buildSimulationTimeline(program, DEFAULT_SIMULATOR_SETTINGS)
  assert.deepEqual(issues, [])
  assert.equal(timeline.segments.length, 1)
  assert.equal(timeline.segments[0].lineNumber, 4)
  assert.equal(timeline.segments[0].end.feedRate, 600)
  assert.ok(timeline.totalDurationMs > 0)
})

test('G0/G00/G01 的 F-only 同样合法；快速移动不覆盖后续进给速度', () => {
  const { program, issues } = analyze('G00 F300\nG0 X10\nG01 X20')
  const timeline = buildSimulationTimeline(program, DEFAULT_SIMULATOR_SETTINGS)
  assert.deepEqual(issues, [])
  assert.equal(timeline.segments.length, 2)
  assert.equal(timeline.segments[0].end.feedRate, 3600)
  assert.equal(timeline.segments[1].end.feedRate, 300)
})

test('裸 G1/G0 仍提示错误；非法数字仍会阻止播放', () => {
  const { issues } = analyze('G1\nG0\nG1 Fabc')
  assert.ok(issues.some((issue) => issue.lineNumber === 1 && issue.type === 'MISSING_PARAMETER'))
  assert.ok(issues.some((issue) => issue.lineNumber === 2 && issue.type === 'MISSING_PARAMETER'))
  assert.ok(issues.some((issue) => issue.lineNumber === 3 && issue.type === 'INVALID_NUMBER'))
})

test('默认 ### 在任何行号、出现任意次均不会解析为指令；行号不偏移', () => {
  const source = 'G21\r\n###\r\nG1 F450\r\nG1 X10 Y-10\r\n   ###   \r\nG1 X20 Y-20'
  const { program, issues } = analyze(source)
  const timeline = buildSimulationTimeline(program, DEFAULT_SIMULATOR_SETTINGS)
  assert.deepEqual(issues, [])
  assert.deepEqual(program.commands.map((command) => command.raw.lineNumber), [1, 3, 4, 6])
  assert.deepEqual(timeline.segments.map((segment) => segment.lineNumber), [4, 6])
  assert.equal(source.includes('###'), true) // 解析不修改原始待下载文本。
})

test('自定义 marker 只有整行匹配才生效，默认 marker 不再被错误吞掉', () => {
  const custom = analyze('G1 F500\n--SECTION--\nG1 X5', '--SECTION--')
  assert.deepEqual(custom.issues, [])
  assert.equal(custom.program.commands.length, 2)
  const old = analyze('###\nG1 F500', '--SECTION--')
  assert.ok(old.issues.some((issue) => issue.type === 'UNSUPPORTED_COMMAND'))
  const inline = analyze('G1 X5 --SECTION--', '--SECTION--')
  assert.ok(inline.issues.some((issue) => issue.type === 'INVALID_NUMBER'))
})

test('marker 清空后禁用识别，不应吞掉非空指令或空白行', () => {
  const disabled = analyze('###\n\nG1 F500\nG1 X5', '')
  assert.ok(disabled.issues.some((issue) => issue.lineNumber === 1 && issue.type === 'UNSUPPORTED_COMMAND'))
  assert.deepEqual(disabled.program.commands.map((command) => command.raw.lineNumber), [1, 3, 4])
})

test('英寸模式下 F-only 正确换算，且暂停 G4 不受 marker 干扰', () => {
  const { program, issues } = analyze('G20\nG1 F10\n###\nG1 X1\nG4 P2')
  const timeline = buildSimulationTimeline(program, DEFAULT_SIMULATOR_SETTINGS)
  assert.deepEqual(issues, [])
  assert.equal(timeline.segments.length, 2)
  assert.equal(timeline.segments[0].end.x, 25.4)
  assert.equal(timeline.segments[0].end.feedRate, 254)
  assert.ok(Math.abs(timeline.segments[0].durationMs - 6000) < 1e-6)
  assert.equal(timeline.segments[1].durationMs, 2000)
})

test('插入 Marker 保持运动指令内容完整及正确的物理行号', () => {
  const before = 'G21\nG90\nG1 X10 Y-10\nG1 X20 Y-20'
  const result = insertMarkerAfterLine(before, '###', 3)
  assert.deepEqual(result, {
    source: 'G21\nG90\nG1 X10 Y-10\n###\nG1 X20 Y-20',
    markerLine: 4,
    changed: true,
  })
  assert.deepEqual(analyze(result.source).issues, [])
})

test('同一段重复点击插入不生成重复 marker；可使用自定义 marker', () => {
  const first = insertMarkerAfterLine('G1 X1\nG1 X2', '--STOP--', 1)
  assert.ok(first?.changed)
  const second = insertMarkerAfterLine(first.source, '--STOP--', 1)
  assert.deepEqual(second, { ...first, changed: false })
  assert.deepEqual(analyze(second.source, '--STOP--').issues, [])
})

test('插入 marker 保留 CRLF、文末换行、开头插入与无换行的单行文档', () => {
  assert.equal(insertMarkerAfterLine('G21\r\nG1 X1\r\n', '###', 2)?.source, 'G21\r\nG1 X1\r\n###\r\n')
  assert.equal(insertMarkerAfterLine('G1 X1', '###', 1)?.source, 'G1 X1\n###')
  assert.equal(insertMarkerAfterLine('G1 X1', '###', 0)?.source, '###\nG1 X1')
})

test('拒绝无效 Marker、非整数行号、越界行号及空白 marker', () => {
  assert.equal(insertMarkerAfterLine('G1 X1', '', 1), null)
  assert.equal(insertMarkerAfterLine('G1 X1', ' \n ', 1), null)
  assert.equal(insertMarkerAfterLine('G1 X1', '###', -1), null)
  assert.equal(insertMarkerAfterLine('G1 X1', '###', 3), null)
  assert.equal(insertMarkerAfterLine('G1 X1', '###', 0.5), null)
})

test('从暂停进度定位运动段末尾；起始位置在首条运动前，结束位置在末段后', () => {
  const program = analyze('G21\nG90\nG1 F600\nG1 X10 Y-10\nG1 X20 Y-20').program
  const t = buildSimulationTimeline(program, DEFAULT_SIMULATOR_SETTINGS)
  assert.equal(getMarkerInsertionAfterLine(t, 0), 3)
  assert.equal(getMarkerInsertionAfterLine(t, t.segments[0].cumulativeTimeMs / 2), 4)
  assert.equal(getMarkerInsertionAfterLine(t, t.segments[0].cumulativeTimeMs), 4)
  assert.equal(getMarkerInsertionAfterLine(t, t.totalDurationMs * 0.99), 5)
  assert.equal(getMarkerInsertionAfterLine(t, t.totalDurationMs), 5)
  assert.equal(getMarkerInsertionAfterLine(t, Number.NaN), null)
  assert.equal(getMarkerInsertionAfterLine({ segments: [], totalDurationMs: 0 }, 0), null)
})
