/**
 * @file types.ts
 * @description
 *  定义 G-code 解析、校验与仿真过程中会用到的核心类型。
 *  由于整个应用需要在多个模块之间共享状态，这里集中维护类型定义，
 *  方便 React 组件、解析器、仿真器之间保持一致的数据约定。
 */

/** G-code 使用的长度单位。 */
export type LengthUnit = 'mm' | 'inch'

/** 记录单行代码的原始文本与附带的注释。 */
export interface RawLine {
  /** 从 1 开始的行号，方便与编辑器高亮同步。 */
  lineNumber: number
  /** 去除末尾换行符后的原始内容。 */
  content: string
  /** 分离出的注释文本，保留以便后续展示或下载。 */
  comment?: string
}

/** 常见的直线/快速移动指令。这里只覆盖本项目需要模拟的子集。 */
export type MotionCommand = 'G0' | 'G00' | 'G1' | 'G01'

/** 支持解析的设定类指令。 */
export type SettingCommand = 'G20' | 'G21' | 'G90' | 'G91'

/** 支持解析的程序流程指令。 */
export type ProgramCommand = 'M0' | 'M00' | 'M2' | 'M02'

/** 统一的指令类型。未在集合里的命令将被判定为暂不支持。 */
export type SupportedCommand = MotionCommand | SettingCommand | ProgramCommand

/** 坐标轴或进给参数字段。 */
export type NumericalField = 'X' | 'Y' | 'Z' | 'F'

/** 位置向量，缺失字段保持 undefined，便于区分“未在此行指定”。 */
export type AxisPosition = Partial<Record<'X' | 'Y' | 'Z', number>>

/** 单条已解析指令的数据结构。 */
export interface GCodeCommand {
  /** 原始行信息。 */
  raw: RawLine
  /** 指令代号，例如 G1 / G21。 */
  code: string
  /** 已格式化为数值的参数集合。 */
  args: Partial<Record<NumericalField, number>>
  /** 若存在不支持或格式错误，会在 errors 中记录。 */
  errors: GCodeIssue[]
}

/** 解析或校验过程中发现的问题。 */
export interface GCodeIssue {
  lineNumber: number
  /** 以中文描述便于直接展示。 */
  message: string
  /** error 表示会阻塞模拟；warning 表示可以继续但建议关注。 */
  severity: 'error' | 'warning'
  /** 进一步区分错误类型，方便分类统计。 */
  type:
    | 'UNSUPPORTED_COMMAND'
    | 'INVALID_NUMBER'
    | 'MISSING_PARAMETER'
    | 'SIMULATION_BLOCKED'
    | 'OUT_OF_BOUNDS'
    | 'INFO'
}

/** 解析完成后返回的 G-code 程序描述。 */
export interface GCodeProgram {
  /** 每一行代码。 */
  commands: GCodeCommand[]
  /** 聚合后的所有问题。 */
  issues: GCodeIssue[]
  /** 默认单位，若文件中未声明则使用 mm。 */
  unit: LengthUnit
  /** 是否处于绝对坐标模式，默认绝对坐标。 */
  absolute: boolean
}

/** 记录模拟时的笔尖位置。 */
export interface ToolheadState {
  x: number
  y: number
  z: number
  /** 当前进给速度（毫米/分钟），为 0 表示未知或快速移动。 */
  feedRate: number
}

/** 单段运动轨迹，用于驱动动画。 */
export interface SimulationSegment {
  /** 唯一标识，便于 React 渲染列表。 */
  id: string
  /** 对应的 G-code 行号。 */
  lineNumber: number
  /** 生成轨迹所依据的原始指令。 */
  command: GCodeCommand
  /** 起点与终点位置。 */
  start: ToolheadState
  end: ToolheadState
  /** 此段是否为落笔状态，用于决定是否绘制轨迹。 */
  penDown: boolean
  /** 模拟用时（毫秒）。 */
  durationMs: number
  /** 积累的结束时间戳（毫秒），用于快速查找当前帧。 */
  cumulativeTimeMs: number
}

/** 完整的仿真时间线描述。 */
export interface SimulationTimeline {
  /** 所有轨迹段，时间顺序排列。 */
  segments: SimulationSegment[]
  /** 整个程序的模拟耗时（毫秒）。 */
  totalDurationMs: number
  /** 若有阻塞错误则为 false，前端应阻止播放。 */
  playable: boolean
}

/** 纸张与画布的配置，用于确定坐标映射及约束范围。 */
export interface PaperSettings {
  widthMm: number
  heightMm: number
  /** 纸张名称，直接在界面展示。 */
  label: string
}

/** 描述落笔方向的取值定义。 */
export type PenDownDirection = 'negative' | 'positive'

/** 用于响应式渲染的全局设定。 */
export interface SimulatorSettings {
  paper: PaperSettings
  penWidthMm: number
  penColor: string
  /** 判定落笔的 Z 阈值，结合 penDownDirection 决定比较方式。 */
  penDownThreshold: number
  /** 判定落笔所依据的方向：negative 表示 Z 越小越接近纸面，positive 相反。 */
  penDownDirection: PenDownDirection
}

/** 播放控制器当前的进度状态。 */
export interface PlaybackState {
  playing: boolean
  /** 已播放时间（毫秒）。 */
  elapsedMs: number
  /** 手动拖动时的目标时间，未拖动则为 null。 */
  pendingSeekMs: number | null
  /** 播放速度倍率，例如 1.0 / 2.0。 */
  speed: number
}
