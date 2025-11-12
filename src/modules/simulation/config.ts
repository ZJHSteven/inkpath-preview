/**
 * @file config.ts
 * @description
 *  定义仿真所需的默认配置与纸张预设，供参数面板与引擎共用。
 */

import type { PaperSettings, SimulatorSettings } from '../gcode/types'

export const PAPER_PRESETS: PaperSettings[] = [
  { label: 'A4 (210×297mm)', widthMm: 210, heightMm: 297 },
  { label: 'A3 (297×420mm)', widthMm: 297, heightMm: 420 },
  { label: '方形 (200×200mm)', widthMm: 200, heightMm: 200 },
]

export const DEFAULT_SIMULATOR_SETTINGS: SimulatorSettings = {
  paper: PAPER_PRESETS[0],
  penWidthMm: 0.5,
  penColor: '#1773cf',
  penDownThreshold: 0.1,
  penDownDirection: 'positive',
}
