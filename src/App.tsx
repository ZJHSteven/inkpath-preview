/**
 * @file App.tsx
 * @description
 *  应用入口，组合编辑器、画布与播放控制等模块。
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { CanvasPreview } from './components/canvas/CanvasPreview'
import { PlaybackControls } from './components/controls/PlaybackControls'
import { EditorPanel } from './components/editor/EditorPanel'
import { ErrorPanel } from './components/errors/ErrorPanel'
import { AppLayout } from './components/layout/AppLayout'
import { SimulatorSettingsPanel } from './components/settings/SimulatorSettingsPanel'
import { useGCodeDocument } from './hooks/useGCodeDocument'
import { useSimulationController } from './hooks/useSimulationController'
import { DEFAULT_SIMULATOR_SETTINGS } from './modules/simulation/config'
import { buildSimulationTimeline } from './modules/simulation/timeline'
import { validateSimulationBounds } from './modules/validation/simulationValidator'
import { DEFAULT_GCODE_SAMPLE } from './modules/gcode/samples'
import { getMarkerInsertionAfterLine, insertMarkerAfterLine } from './modules/gcode/markerInsert'
import { TopBar } from './components/layout/TopBar'
import './App.css' // 引入应用级样式，包含模态层与隐藏文件输入的无障碍写法。

function App() {
  const [settings, setSettings] = useState(DEFAULT_SIMULATOR_SETTINGS)
  const { source, setSource, program, issues: documentIssues } =
    useGCodeDocument({ separatorMarker: settings.separatorMarker })
  const [manualFocusLine, setManualFocusLine] = useState<number | undefined>()
  /** 单独的导航请求序列号，确保连续点击同一错误仍能重新定位光标。 */
  const [navigationRequest, setNavigationRequest] = useState<
    { lineNumber: number; token: number } | undefined
  >()
  /** marker 不改变任何运动参数；插入时临时记下播放进度以供重新解析后恢复。 */
  const restoreProgressRef = useRef<{ source: string; ratio: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showPenUpTrails, setShowPenUpTrails] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const rawTimeline = useMemo(
    () => buildSimulationTimeline(program, settings),
    [program, settings],
  )

  const boundaryIssues = useMemo(
    () => validateSimulationBounds(rawTimeline, settings),
    [rawTimeline, settings],
  )

  const allIssues = useMemo(
    () => [...documentIssues, ...boundaryIssues],
    [documentIssues, boundaryIssues],
  )

  const timeline = useMemo(
    () => ({
      ...rawTimeline,
      playable: allIssues.every((issue) => issue.severity !== 'error'),
    }),
    [rawTimeline, allIssues],
  )

  const controller = useSimulationController(timeline)

  useEffect(() => {
    // 文本变化会触发仿真 Hook 自动重置（适用于一般编辑）。
    // 唯有“插入纯文本 marker”不改变运动几何/时长，适合恢复原来的暂停进度。
    const pending = restoreProgressRef.current
    if (pending?.source !== source) return
    restoreProgressRef.current = null
    controller.seek(pending.ratio)
  }, [source, controller.seek])

  useEffect(() => {
    if (controller.state.playing) {
      setManualFocusLine(undefined)
    }
  }, [controller.state.playing, controller.activeLine])

  const activeLine = manualFocusLine ?? controller.activeLine

  const handleSelectIssue = (line: number) => {
    setManualFocusLine(line)
    setNavigationRequest((prev) => ({ lineNumber: line, token: (prev?.token ?? 0) + 1 }))
    if (timeline.totalDurationMs <= 0) {
      return
    }
    const segment = timeline.segments.find((item) => item.lineNumber === line)
    if (segment) {
      const startMs = segment.cumulativeTimeMs - segment.durationMs
      controller.seek(startMs / timeline.totalDurationMs)
    }
  }

  /**
   * 从暂停时间定位到当前 G-code 指令段末尾，一键插入设置中的分隔标记。
   * 不会在运动段内部拆开指令，也不会把已经存在的相同 marker 叠加一次。
   */
  const markerAfterLine = getMarkerInsertionAfterLine(timeline, controller.state.elapsedMs)
  const canInsertMarker =
    !controller.state.playing &&
    timeline.playable &&
    markerAfterLine !== null &&
    settings.separatorMarker.trim().length > 0

  const handleInsertMarker = () => {
    if (!canInsertMarker || markerAfterLine === null) return

    const result = insertMarkerAfterLine(source, settings.separatorMarker, markerAfterLine)
    if (!result) return

    if (result.changed) {
      // 只有真正改变文本才需恢复进度；纯文本标记不会改变时长。
      restoreProgressRef.current = { source: result.source, ratio: controller.progress }
      setSource(result.source)
    }
    setManualFocusLine(result.markerLine)
    setNavigationRequest((prev) => ({
      lineNumber: result.markerLine,
      token: (prev?.token ?? 0) + 1,
    }))
  }

  const handleRequestImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      setSource(content)
      setManualFocusLine(undefined)
    }
    reader.onerror = () => {
      console.error('读取文件失败', reader.error)
    }
    reader.readAsText(file)
    // 允许用户重复选择同一文件
    event.target.value = ''
  }

  const handleRequestDownload = () => {
    const blob = new Blob([source], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inkpath.gcode'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setSource('')
    setManualFocusLine(undefined)
    controller.stop()
  }

  const handleRestoreSample = () => {
    setSource(DEFAULT_GCODE_SAMPLE)
    setManualFocusLine(undefined)
    controller.stop()
  }

  const topBarNode = (
    <TopBar
      onImportFile={handleRequestImport}
      onDownloadFile={handleRequestDownload}
      onClearDocument={handleClear}
      onRestoreSample={handleRestoreSample}
      onToggleWordWrap={() => setWordWrapEnabled((prev) => !prev)}
      isWordWrapEnabled={wordWrapEnabled}
      onToggleGrid={setShowGrid}
      onTogglePenUpTrails={setShowPenUpTrails}
      showGrid={showGrid}
      showPenUpTrails={showPenUpTrails}
      onOpenGuide={() => setGuideOpen(true)}
      onOpenAbout={() => setAboutOpen(true)}
    />
  )

  return (
    <>
      <input
        type="file"
        accept=".gcode,.nc,.txt"
        ref={fileInputRef}
        className="app__file-input"
        aria-label="导入 G-code 文件"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <AppLayout
        topBar={topBarNode}
        sidebar={
          <>
            <EditorPanel
              value={source}
              onChange={setSource}
              issues={allIssues}
              activeLine={activeLine}
              navigationRequest={navigationRequest}
              wordWrapEnabled={wordWrapEnabled}
            />
            <SimulatorSettingsPanel
              settings={settings}
              onChange={setSettings}
            />
            <ErrorPanel issues={allIssues} onSelectLine={handleSelectIssue} />
          </>
        }
        main={
          <div className="app-main__stack">
            <CanvasPreview
              timeline={timeline}
              progress={controller.progress}
              position={controller.currentPosition}
              settings={settings}
              showGrid={showGrid}
              showPenUpTrails={showPenUpTrails}
            />
            <PlaybackControls
              state={controller.state}
              progress={controller.progress}
              timeline={timeline}
              onPlay={controller.play}
              onPause={controller.pause}
              onStop={controller.stop}
              onSeek={controller.seek}
              onSpeedChange={controller.setSpeed}
              onInsertMarker={handleInsertMarker}
              canInsertMarker={canInsertMarker}
              markerLineHint={markerAfterLine ?? undefined}
            />
          </div>
        }
      />
      {guideOpen ? (
        <div className="app-modal" role="dialog" aria-modal="true">
          <div className="app-modal__content">
            <h3>快速上手指南</h3>
            <ol>
              <li>从“文件”菜单导入 G-code 文件或使用默认示例。</li>
              <li>在左侧编辑器修改代码，错误会在下方列表中即时提示。</li>
              <li>使用底部控制条播放、暂停或拖动查看笔迹动画。</li>
              <li>通过“设置”或“视图”菜单调整网格、抬笔轨迹及自动换行。</li>
            </ol>
            <button type="button" onClick={() => setGuideOpen(false)}>
              知道了
            </button>
          </div>
        </div>
      ) : null}
      {aboutOpen ? (
        <div className="app-modal" role="dialog" aria-modal="true">
          <div className="app-modal__content">
            <h3>关于 InkPath Preview</h3>
            <p>
              InkPath Preview 是一款纯前端的 G-code 演示工具，用于在浏览器中模拟绘图机轨迹，支持导入、编辑、播放控制与参数校验。
            </p>
            <p>
              项目代码、使用说明与扩展建议请参见仓库根目录的 README.md。
            </p>
            <button type="button" onClick={() => setAboutOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default App
