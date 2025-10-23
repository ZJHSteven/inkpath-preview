/**
 * @file timeline.ts
 * @description
 *  根据解析后的 G-code 指令生成可用于动画播放的轨迹时间线。
 *  这里仅负责数学计算，不直接与 React 状态耦合。
 */

import type {
  GCodeCommand,
  GCodeProgram,
  SimulationSegment,
  SimulationTimeline,
  SimulatorSettings,
  ToolheadState,
} from '../gcode/types'

const MM_PER_INCH = 25.4
const DEFAULT_FEED_MM_PER_MIN = 1200
const DEFAULT_RAPID_FEED_MM_PER_MIN = 3600

interface InterpreterContext {
  /** 当前是否为绝对坐标模式。 */
  absolute: boolean
  /** 当前使用的单位。 */
  unit: 'mm' | 'inch'
  /** 当前进给速度（毫米/分钟）。 */
  feedRate: number
  /** 最近一次的笔尖状态。 */
  toolhead: ToolheadState
  /** 纸张高度（毫米），用于在绝对坐标模式下转换 Y 轴。 */
  paperHeightMm: number
}

function cloneState(state: ToolheadState): ToolheadState {
  return { ...state }
}

function convertToMm(value: number, unit: 'mm' | 'inch'): number {
  return unit === 'inch' ? value * MM_PER_INCH : value
}

function updateAxis(
  axis: 'X' | 'Y' | 'Z',
  axisValue: number | undefined,
  current: number,
  context: InterpreterContext,
): number {
  if (axisValue === undefined) {
    return current
  }

  const converted = convertToMm(axisValue, context.unit)
  if (context.absolute) {
    if (axis === 'Y') {
      /**
       * 绝对坐标模式：
       * - 用户在 G-code 中以左上角为原点、向下为负值；
       * - 内部仍沿用左下角为原点的计算方式，因此需要将值映射到 0~paperHeightMm；
       * - 映射公式：paperHeightMm + converted（converted 为负值时等价于 paperHeight - |converted|）。
       */
      return context.paperHeightMm + converted
    }
    return converted
  }
  return current + converted
}

function resolveFeedRate(
  command: GCodeCommand,
  context: InterpreterContext,
  isRapid: boolean,
): number {
  if (command.args.F !== undefined) {
    const converted = convertToMm(command.args.F, context.unit)
    context.feedRate = Math.max(converted, 1)
  }

  if (isRapid) {
    return DEFAULT_RAPID_FEED_MM_PER_MIN
  }

  if (context.feedRate <= 0) {
    context.feedRate = DEFAULT_FEED_MM_PER_MIN
  }

  return context.feedRate
}

function createSegment(
  command: GCodeCommand,
  context: InterpreterContext,
  settings: SimulatorSettings,
  cumulativeTimeMs: number,
  nextState: ToolheadState,
): SimulationSegment | null {
  const distance = Math.hypot(
    nextState.x - context.toolhead.x,
    nextState.y - context.toolhead.y,
  )

  if (distance === 0) {
    context.toolhead = cloneState(nextState)
    context.toolhead.feedRate = nextState.feedRate
    return null
  }

  const speed = nextState.feedRate
  const durationMinutes = distance / speed
  const durationMs = durationMinutes * 60_000

  const segment: SimulationSegment = {
    id: `${command.raw.lineNumber}-${cumulativeTimeMs + durationMs}`,
    lineNumber: command.raw.lineNumber,
    command,
    start: cloneState(context.toolhead),
    end: cloneState(nextState),
    penDown: context.toolhead.z <= settings.penDownThreshold,
    durationMs,
    cumulativeTimeMs: cumulativeTimeMs + durationMs,
  }

  context.toolhead = cloneState(nextState)

  return segment
}

/**
 * 根据 G-code 程序构建完整的时间线。
 */
export function buildSimulationTimeline(
  program: GCodeProgram,
  settings: SimulatorSettings,
): SimulationTimeline {
  const paperHeightMm = settings.paper.heightMm
  const context: InterpreterContext = {
    absolute: true,
    unit: 'mm',
    feedRate: DEFAULT_FEED_MM_PER_MIN,
    toolhead: {
      x: 0,
      /**
       * 初始位置统一映射至纸张左上角：
       * - 用户视角下 (0, 0) 位于左上角；
       * - 内部坐标采用左下角为原点，因此初始 Y 为纸张高度。
       */
      y: paperHeightMm,
      z: 5,
      feedRate: DEFAULT_FEED_MM_PER_MIN,
    },
    paperHeightMm,
  }

  const segments: SimulationSegment[] = []
  let cumulativeTimeMs = 0

  for (const command of program.commands) {
    switch (command.code) {
      case 'G20':
        context.unit = 'inch'
        continue
      case 'G21':
        context.unit = 'mm'
        continue
      case 'G90':
        context.absolute = true
        continue
      case 'G91':
        context.absolute = false
        continue
      case 'M0':
      case 'M00':
      case 'M2':
      case 'M02':
        // 控制指令不产生轨迹，仅更新上下文。
        continue
      default:
        break
    }

    if (command.code === 'G0' || command.code === 'G00' || command.code === 'G1' || command.code === 'G01') {
      const nextState: ToolheadState = cloneState(context.toolhead)
      nextState.x = updateAxis('X', command.args.X, nextState.x, context)
      nextState.y = updateAxis('Y', command.args.Y, nextState.y, context)
      nextState.z = updateAxis('Z', command.args.Z, nextState.z, context)

      const isRapid = command.code === 'G0' || command.code === 'G00'
      const feedRate = resolveFeedRate(command, context, isRapid)
      nextState.feedRate = feedRate

      const segment = createSegment(
        command,
        context,
        settings,
        cumulativeTimeMs,
        nextState,
      )

      if (segment) {
        cumulativeTimeMs = segment.cumulativeTimeMs
        segments.push(segment)
      }

      context.toolhead = cloneState(nextState)
      continue
    }
  }

  return {
    segments,
    totalDurationMs: cumulativeTimeMs,
    playable: true,
  }
}
