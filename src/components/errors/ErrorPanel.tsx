/**
 * @file ErrorPanel.tsx
 * @description
 *  显示解析与校验过程中收集到的错误/警告列表。
 *  支持点击定位至对应行，为调试提供便利。
 */

import { GCodeIssue } from '../../modules/gcode/types'

import './ErrorPanel.css'

export interface ErrorPanelProps {
  issues: GCodeIssue[]
  onSelectLine?: (lineNumber: number) => void
}

function renderSeverityLabel(severity: GCodeIssue['severity']) {
  return severity === 'error' ? '错误' : '警告'
}

export function ErrorPanel({ issues, onSelectLine }: ErrorPanelProps) {
  if (issues.length === 0) {
    return (
      <section className="error-panel">
        <header className="error-panel__header">
          <h3 className="error-panel__title">错误列表</h3>
          <span className="error-panel__counter">0</span>
        </header>
        <div className="error-panel__empty">当前没有检测到错误或警告。</div>
      </section>
    )
  }

  return (
    <section className="error-panel">
      <header className="error-panel__header">
        <h3 className="error-panel__title">错误列表</h3>
        <span className="error-panel__counter">{issues.length}</span>
      </header>
      <ul className="error-panel__list">
        {issues.map((issue) => (
          <li
            key={`${issue.type}-${issue.lineNumber}-${issue.message}`}
            className={`error-panel__item error-panel__item--${issue.severity}`}
          >
            <button
              type="button"
              className="error-panel__item-button"
              onClick={() => onSelectLine?.(issue.lineNumber)}
            >
              <div className="error-panel__item-meta">
                <span className="error-panel__badge">
                  {renderSeverityLabel(issue.severity)}
                </span>
                <span className="error-panel__line">
                  第 {issue.lineNumber} 行
                </span>
              </div>
              <p className="error-panel__message">{issue.message}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
