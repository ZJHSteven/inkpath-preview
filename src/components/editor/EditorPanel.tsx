/**
 * @file EditorPanel.tsx
 * @description
 *  组合顶部工具条与 Monaco 编辑器，提供导入、导出等交互入口。
 *  具体的逻辑由父组件注入，保持展示层的纯粹性。
 */

import type { GCodeIssue } from '../../modules/gcode/types'

import { GCodeEditor } from './GCodeEditor'

import './EditorPanel.css'

export interface EditorPanelProps {
  value: string
  onChange: (next: string) => void
  issues: GCodeIssue[]
  activeLine?: number
  followActiveLine: boolean
  wordWrapEnabled: boolean
}

export function EditorPanel({
  value,
  onChange,
  issues,
  activeLine,
  followActiveLine,
  wordWrapEnabled,
}: EditorPanelProps) {
  return (
    <section className="editor-panel">
      <header className="editor-panel__header">
        <div>
          <h2 className="editor-panel__title">G-code 输入</h2>
          <p className="editor-panel__subtitle">
            支持粘贴或通过“文件”菜单导入 .gcode / .nc / .txt
          </p>
        </div>
      </header>
      <div className="editor-panel__editor">
        <GCodeEditor
          value={value}
          onChange={onChange}
          issues={issues}
          activeLine={activeLine}
          followActiveLine={followActiveLine}
          wordWrapEnabled={wordWrapEnabled}
        />
      </div>
    </section>
  )
}
