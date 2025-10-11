/**
 * @file App.tsx
 * @description
 *  应用入口，组合编辑器、画布与播放控制等模块。
 */

import { useEffect, useMemo, useState } from 'react'

import { CanvasPreview } from './components/canvas/CanvasPreview'
import { PlaybackControls } from './components/controls/PlaybackControls'
import { EditorPanel } from './components/editor/EditorPanel'
import { ErrorPanel } from './components/errors/ErrorPanel'
import { AppLayout } from './components/layout/AppLayout'
import { useGCodeDocument } from './hooks/useGCodeDocument'
import { useSimulationController } from './hooks/useSimulationController'
import { DEFAULT_SIMULATOR_SETTINGS } from './modules/simulation/config'
import { buildSimulationTimeline } from './modules/simulation/timeline'
import { validateSimulationBounds } from './modules/validation/simulationValidator'

function App() {
  const { source, setSource, program, issues: documentIssues } =
    useGCodeDocument()
  const [settings] = useState(DEFAULT_SIMULATOR_SETTINGS)
  const [manualFocusLine, setManualFocusLine] = useState<number | undefined>()

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

  return (
    <AppLayout
      sidebar={
        <>
          <EditorPanel
            value={source}
            onChange={setSource}
            issues={allIssues}
            activeLine={activeLine}
            onRequestClear={() => setSource('')}
          />
          <ErrorPanel
            issues={allIssues}
            onSelectLine={(line) => setManualFocusLine(line)}
          />
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
  )
}

export default App
