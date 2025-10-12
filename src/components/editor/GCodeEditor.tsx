/**
 * @file GCodeEditor.tsx
 * @description
 *  集成 Monaco 编辑器，提供带语法高亮、错误提示与行号高亮的 G-code 编辑区域。
 *  组件保持“受控”模式，便于外部统一管理文本与解析结果。
 */

import Editor, { type Monaco } from '@monaco-editor/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { editor } from 'monaco-editor'

import type { GCodeIssue } from '../../modules/gcode/types'

import './GCodeEditor.css'

export interface GCodeEditorProps {
  /** 编辑器当前显示的 G-code 文本。 */
  value: string
  /** 文本改变时回调，外部负责更新状态。 */
  onChange: (next: string) => void
  /** 解析得到的错误或警告列表，用于设置模型标记。 */
  issues: GCodeIssue[]
  /** 当前播放到的行号，便于高亮展示。 */
  activeLine?: number
  /** 是否启用自动换行，用于配合菜单开关。 */
  wordWrapEnabled: boolean
}

const HIGHLIGHT_DECORATION_OPTIONS: editor.IModelDecorationOptions = {
  isWholeLine: true,
  className: 'gcode-editor__active-line',
  glyphMarginClassName: 'gcode-editor__active-glyph',
}

/**
 * 注册自定义的 G-code 语言与主题。
 */
function prepareMonaco(monaco: Monaco) {
  const alreadyRegistered = monaco.languages
    .getLanguages()
    .some((lang) => lang.id === 'gcode')

  if (!alreadyRegistered) {
    monaco.languages.register({ id: 'gcode' })
    monaco.languages.setMonarchTokensProvider('gcode', {
      tokenizer: {
        root: [
          [/(;.*$)/, 'comment'],
          [/([gG][0-9]+|[mM][0-9]+)/, 'keyword'],
          [/([fF][0-9.]+)/, 'number'],
          [/([xyzXYZ])([-+]?\d*\.?\d+)/, ['type.identifier', 'number']],
        ],
      },
    })
  }

  monaco.editor.defineTheme('inkpath-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280' },
      { token: 'keyword', foreground: '60a5fa' },
      { token: 'number', foreground: 'fcd34d' },
    ],
    colors: {
      'editor.background': '#0f172a',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#e2e8f0',
      'editorGutter.background': '#0f172a',
      'editorLineNumber.dimmedForeground': '#334155',
    },
  })

  monaco.editor.setTheme('inkpath-dark')
}

/**
 * 基于问题列表生成 Monaco 的 Marker。
 */
function useMarkers(
  monacoRef: React.MutableRefObject<Monaco | null>,
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
  issues: GCodeIssue[],
) {
  useEffect(() => {
    const monaco = monacoRef.current
    const editorInstance = editorRef.current
    const model = editorInstance?.getModel()

    if (!monaco || !model) {
      return
    }

    const markers = issues.map((issue) => ({
      severity:
        issue.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      startLineNumber: issue.lineNumber,
      endLineNumber: issue.lineNumber,
      startColumn: 1,
      endColumn: model.getLineLength(issue.lineNumber) + 1,
      message: issue.message,
      source: 'InkPath Preview 校验',
    }))

    monaco.editor.setModelMarkers(model, 'inkpath-validation', markers)
  }, [issues, monacoRef, editorRef])
}

/**
 * 管理播放行号的高亮装饰。
 */
function useActiveLineDecoration(
  monacoRef: React.MutableRefObject<Monaco | null>,
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
  activeLine?: number,
) {
  const decorationRef = useRef<string[]>([])

  useEffect(() => {
    const editorInstance = editorRef.current
    const monaco = monacoRef.current
    if (!editorInstance || !monaco) {
      return
    }

    const decorations: editor.IModelDeltaDecoration[] = activeLine
      ? [
          {
            range: new monaco.Range(activeLine, 1, activeLine, 1),
            options: HIGHLIGHT_DECORATION_OPTIONS,
          },
        ]
      : []

    decorationRef.current = editorInstance.deltaDecorations(
      decorationRef.current,
      decorations,
    )

    if (activeLine) {
      editorInstance.revealLineInCenter(activeLine)
    }
  }, [activeLine, editorRef, monacoRef])
}

export function GCodeEditor({
  value,
  onChange,
  issues,
  activeLine,
  wordWrapEnabled,
}: GCodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  const handleMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editorInstance
      monacoRef.current = monaco
      prepareMonaco(monaco)
    },
    [],
  )

  useMarkers(monacoRef, editorRef, issues)
  useActiveLineDecoration(monacoRef, editorRef, activeLine)

  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      automaticLayout: true,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: 'on',
      glyphMargin: true,
      scrollBeyondLastLine: false,
      wordWrap: wordWrapEnabled ? 'on' : 'off',
      smoothScrolling: true,
      renderLineHighlight: 'none',
      padding: { top: 12, bottom: 12 },
      dragAndDrop: true,
    }),
    [wordWrapEnabled],
  )

  return (
    <div className="gcode-editor">
      <Editor
        language="gcode"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        onMount={handleMount}
        options={options}
        theme="inkpath-dark"
      />
    </div>
  )
}
