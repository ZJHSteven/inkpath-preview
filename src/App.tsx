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

function App() {
  const { source, setSource, program, issues: documentIssues } = useGCodeDocument()
  const [settings, setSettings] = useState(DEFAULT_SIMULATOR_SETTINGS)
  const [manualFocusLine, setManualFocusLine] = useState<number | undefined>()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const timeline = useMemo(
    () => buildSimulationTimeline(program, settings),
    [program, settings],
  )

  const boundaryIssues = useMemo(
    () => validateSimulationBounds(timeline, settings),
    [timeline, settings],
  )

  const allIssues = useMemo(
    () => [...documentIssues, ...boundaryIssues],
    [documentIssues, boundaryIssues],
  )

  const controller = useSimulationController(timeline)

  useEffect(() => {
    if (controller.state.playing) {
      setManualFocusLine(undefined)
    }
  }, [controller.state.playing, controller.activeLine])

  const activeLine = manualFocusLine ?? controller.activeLine

  const handleSelectIssue = (line: number) => {
    setManualFocusLine(line)
    if (timeline.totalDurationMs <= 0) {
      return
    }
    const segment = timeline.segments.find((item) => item.lineNumber === line)
    if (segment) {
      const startMs = segment.cumulativeTimeMs - segment.durationMs
      controller.seek(startMs / timeline.totalDurationMs)
    }
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

  return (
    <>
      <input
        type="file"
        accept=".gcode,.nc,.txt"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <AppLayout
        sidebar={
          <>
            <EditorPanel
              value={source}
              onChange={setSource}
              issues={allIssues}
              activeLine={activeLine}
              onRequestClear={handleClear}
              onRequestImport={handleRequestImport}
              onRequestDownload={handleRequestDownload}
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
            />
          </div>
        }
      />
    </>
  )
}

export default App
