/**
 * @file App.tsx
 * @description
 *  应用入口，组合布局、编辑器与（待实现的）画布模块。
 *  本次提交聚焦左侧编辑区与错误列表，右侧画布后续补充。
 */

import { useState } from 'react'

import { EditorPanel } from './components/editor/EditorPanel'
import { ErrorPanel } from './components/errors/ErrorPanel'
import { AppLayout } from './components/layout/AppLayout'
import { useGCodeDocument } from './hooks/useGCodeDocument'

function App() {
  const { source, setSource, issues } = useGCodeDocument()
  const [focusedLine, setFocusedLine] = useState<number | undefined>()

  const handleSelectIssue = (line: number) => {
    setFocusedLine(line)
  }

  return (
    <AppLayout
      sidebar={
        <>
          <EditorPanel
            value={source}
            onChange={setSource}
            issues={issues}
            activeLine={focusedLine}
            onRequestClear={() => setSource('')}
          />
          <ErrorPanel issues={issues} onSelectLine={handleSelectIssue} />
        </>
      }
      main={
        <div className="app__placeholder">
          <h2>画布预览模块开发中</h2>
          <p>下一步将接入 G-code 仿真动画与控制面板。</p>
        </div>
      }
    />
  )
}

export default App
