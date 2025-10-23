/**
 * @file simulationValidator.ts
 * @description
 *  基于生成的时间线检查是否存在越界行为，并输出友好提示。
 */

import type {
  GCodeIssue,
  SimulationTimeline,
  SimulatorSettings,
} from '../gcode/types'

function isOutOfBounds(
  value: number,
  min: number,
  max: number,
): boolean {
  return value < min || value > max
}

export function validateSimulationBounds(
  timeline: SimulationTimeline,
  settings: SimulatorSettings,
): GCodeIssue[] {
  const issues: GCodeIssue[] = []
  const { widthMm, heightMm } = settings.paper

  for (const segment of timeline.segments) {
    const startOut =
      isOutOfBounds(segment.start.x, 0, widthMm) ||
      isOutOfBounds(segment.start.y, 0, heightMm)
    const endOut =
      isOutOfBounds(segment.end.x, 0, widthMm) ||
      isOutOfBounds(segment.end.y, 0, heightMm)

    if (startOut || endOut) {
      issues.push({
        lineNumber: segment.lineNumber,
        message: `运动路径超出纸张范围（X: 0~${widthMm}mm, Y: -${heightMm}~0mm，左上角为原点）。`,
        severity: 'warning',
        type: 'OUT_OF_BOUNDS',
      })
    }
  }

  return issues
}
