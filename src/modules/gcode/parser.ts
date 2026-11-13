/**
 * @file parser.ts
 * @description
 *  负责把原始的 G-code 文本拆解成结构化数据。
 *  为了后续仿真与校验模块的可维护性，这里只关注“读取”逻辑，
 *  不在此阶段做复杂的业务判断。
 */

import { DEFAULT_GCODE_MARKER } from './types'
import type {
  GCodeCommand,
  GCodeIssue,
  GCodeProgram,
  LengthUnit,
  RawLine,
  SupportedCommand,
} from './types'

/** 匹配形如 X12.3 / F1500 的参数。允许正负号与小数点。 */
const ARGUMENT_TOKEN = /^([a-zA-Z])([-+]?\d*\.?\d+)$/

/** 支持识别的命令集合，全部转为大写后比较。 */
const SUPPORTED_CODES: SupportedCommand[] = [
  'G0',
  'G00',
  'G1',
  'G01',
  'G4',
  'G04',
  'G20',
  'G21',
  'G90',
  'G91',
  'M0',
  'M00',
  'M2',
  'M02',
]

/** 解析结果中累计的默认配置。 */
const DEFAULT_UNIT: LengthUnit = 'mm'

/**
 * 将原始文本转为每行信息，保留注释以便未来导出。
 */
function extractRawLine(line: string, index: number): RawLine {
  const commentIndex = line.indexOf(';')
  const hasComment = commentIndex >= 0
  const codePart = hasComment ? line.slice(0, commentIndex) : line
  const comment = hasComment ? line.slice(commentIndex + 1).trim() : undefined

  return {
    lineNumber: index + 1,
    content: codePart.trim(),
    comment,
  }
}

/**
 * 解析单行文本，返回结构化指令；若行为空则返回 null。
 */
function parseLine(raw: RawLine): GCodeCommand | null {
  if (!raw.content) {
    return null
  }

  const tokens = raw.content.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return null
  }

  const [commandToken, ...argumentTokens] = tokens
  const code = commandToken.toUpperCase()

  const errors: GCodeIssue[] = []
  const args: GCodeCommand['args'] = {}

  if (!SUPPORTED_CODES.includes(code as SupportedCommand)) {
    errors.push({
      lineNumber: raw.lineNumber,
      message: `暂不支持指令 ${code}，请确认是否需要手动处理。`,
      severity: 'error',
      type: 'UNSUPPORTED_COMMAND',
    })
  }

  for (const token of argumentTokens) {
    const match = token.match(ARGUMENT_TOKEN)
    if (!match) {
      errors.push({
        lineNumber: raw.lineNumber,
        message: `参数 "${token}" 不是有效的数值表达，已忽略。`,
        severity: 'error',
        type: 'INVALID_NUMBER',
      })
      continue
    }

    const [, letter, value] = match
    const axis = letter.toUpperCase()
    const parsedValue = Number.parseFloat(value)

    if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
      errors.push({
        lineNumber: raw.lineNumber,
        message: `参数 "${token}" 解析结果不是有限数值，已忽略。`,
        severity: 'error',
        type: 'INVALID_NUMBER',
      })
      continue
    }

    args[axis as keyof typeof args] = parsedValue
  }

  return {
    raw,
    code,
    args,
    errors,
  }
}

/**
 * 将整段文本解析为 G-code 程序结构。
 */
export function parseGCode(
  source: string,
  separatorMarker: string = DEFAULT_GCODE_MARKER,
): GCodeProgram {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const commands: GCodeCommand[] = []
  const issues: GCodeIssue[] = []

  let unit: LengthUnit = DEFAULT_UNIT
  let absolute = true
  // 前后空白仅用于识别：不修改源代码，也不改变导出的 marker 内容。
  // 空分隔符意味着禁用该功能，避免把空行误判成分隔标记。
  const normalizedMarker = separatorMarker.trim()

  for (let index = 0; index < lines.length; index += 1) {
    const raw = extractRawLine(lines[index], index)
    // InkPath 的“###”等 marker 是整行分隔符，不属于 G-code。
    // 在转为指令前跳过，但仍保留原文本行号，便于后续报错定位。
    if (normalizedMarker && raw.content === normalizedMarker) {
      continue
    }
    const command = parseLine(raw)

    if (!command) {
      continue
    }

    if (command.code === 'G20') {
      unit = 'inch'
    } else if (command.code === 'G21') {
      unit = 'mm'
    } else if (command.code === 'G90') {
      absolute = true
    } else if (command.code === 'G91') {
      absolute = false
    }

    if (command.errors.length > 0) {
      issues.push(...command.errors)
    }

    commands.push(command)
  }

  return {
    commands,
    issues,
    unit,
    absolute,
  }
}
