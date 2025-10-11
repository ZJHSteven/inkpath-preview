/**
 * @file EditorPanel.tsx
 * @description
 *  组合顶部工具条与 Monaco 编辑器，提供导入、导出等交互入口。
 *  具体的逻辑由父组件注入，保持展示层的纯粹性。
 */

import { GCodeIssue } from '../../modules/gcode/types'

import { GCodeEditor } from './GCodeEditor'

import './EditorPanel.css'

export interface EditorPanelProps {
  value: string
  onChange: (next: string) => void
  issues: GCodeIssue[]
  activeLine?: number
  onRequestImport?: () => void
  onRequestDownload?: () => void
  onRequestClear?: () => void
}

export function EditorPanel({
  value,
  onChange,
  issues,
  activeLine,
  onRequestImport,
  onRequestDownload,
  onRequestClear,
}: EditorPanelProps) {
  return (
    <section className="editor-panel">
      <header className="editor-panel__header">
        <div>
          <h2 className="editor-panel__title">G-code 输入</h2>
          <p className="editor-panel__subtitle">
            支持直接粘贴或导入 .gcode / .nc / .txt 文件
          </p>
        </div>
        <div className="editor-panel__actions">
          <button
            type="button"
            className="editor-panel__button"
            onClick={onRequestImport}
          >
            导入文件
          </button>
          <button
            type="button"
            className="editor-panel__button"
            onClick={onRequestDownload}
          >
            下载当前
          </button>
          <button
            type="button"
            className="editor-panel__button editor-panel__button--danger"
            onClick={onRequestClear}
          >
            清空
          </button>
        </div>
      </header>
      <div className="editor-panel__editor">
        <GCodeEditor
          value={value}
          onChange={onChange}
          issues={issues}
          activeLine={activeLine}
        />
      </div>
    </section>
  )
}
