/**
 * @file gcodeValidator.ts
 * @description
 *  在解析完成后，对语义层面进行进一步校验。
 *  例如检测运动指令缺少坐标、指令是否可执行等。
 */

import type { GCodeIssue, GCodeProgram } from '../gcode/types'

const MOTION_COMMANDS = new Set(['G0', 'G00', 'G1', 'G01'])

/**
 * 校验运动指令是否具备必要的坐标信息。
 */
function validateMotionArguments(program: GCodeProgram): GCodeIssue[] {
  const issues: GCodeIssue[] = []

  for (const command of program.commands) {
    if (!MOTION_COMMANDS.has(command.code)) {
      continue
    }

    const hasAxis =
      command.args.X !== undefined ||
      command.args.Y !== undefined ||
      command.args.Z !== undefined

    if (!hasAxis) {
      issues.push({
        lineNumber: command.raw.lineNumber,
        message: '运动指令缺少坐标参数 (X/Y/Z)，无法模拟移动。',
        severity: 'error',
        type: 'MISSING_PARAMETER',
      })
    }
  }

  return issues
}

/**
 * 综合所有校验规则，返回新增的问题列表。
 * 解析阶段已经记录的错误留在 program.issues 内，此处只补充新增问题。
 */
export function validateProgram(program: GCodeProgram): GCodeIssue[] {
  const extraIssues: GCodeIssue[] = []
  extraIssues.push(...validateMotionArguments(program))
  return extraIssues
}
