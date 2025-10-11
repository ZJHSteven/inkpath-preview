/**
 * @file useGCodeDocument.ts
 * @description
 *  负责维护 G-code 文本文档的状态，并在文本变更时触发解析与校验。
 *  由于解析消耗相对有限，这里直接使用 useMemo 即可满足需求。
 */

import { useMemo, useState } from 'react'

import { parseGCode } from '../modules/gcode/parser'
import { DEFAULT_GCODE_SAMPLE } from '../modules/gcode/samples'
import { GCodeIssue, GCodeProgram } from '../modules/gcode/types'
import { validateProgram } from '../modules/validation/gcodeValidator'

export interface UseGCodeDocumentOptions {
  /** 初始化编辑器时的默认文本。 */
  initialValue?: string
}

export interface UseGCodeDocumentResult {
  /** 当前编辑器中的源文本。 */
  source: string
  /** 设置源文本，通常在编辑器 onChange 或文件导入时调用。 */
  setSource: (next: string) => void
  /** 解析后的程序结构。 */
  program: GCodeProgram
  /** 聚合的全部问题列表，包含解析与额外校验阶段。 */
  issues: GCodeIssue[]
}

/**
 * 管理 G-code 文档状态的自定义 Hook。
 */
export function useGCodeDocument(
  options: UseGCodeDocumentOptions = {},
): UseGCodeDocumentResult {
  const { initialValue = DEFAULT_GCODE_SAMPLE } = options
  const [source, setSource] = useState(initialValue)

  const analysis = useMemo(() => {
    const program = parseGCode(source)
    const extraIssues = validateProgram(program)
    const issues = [...program.issues, ...extraIssues]

    return {
      program,
      issues,
    }
  }, [source])

  return {
    source,
    setSource,
    program: analysis.program,
    issues: analysis.issues,
  }
}
