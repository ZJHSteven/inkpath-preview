/**
 * @file SimulatorSettingsPanel.tsx
 * @description
 *  提供纸张尺寸、笔宽、颜色与落笔阈值等参数配置。
 *  通过受控表单把用户输入同步回父组件。
 */

import type { ChangeEvent } from 'react'

import {
  PAPER_PRESETS,
  DEFAULT_SIMULATOR_SETTINGS,
} from '../../modules/simulation/config'
import type { SimulatorSettings } from '../../modules/gcode/types'

import './SimulatorSettingsPanel.css'

export interface SimulatorSettingsPanelProps {
  settings: SimulatorSettings
  onChange: (next: SimulatorSettings) => void
}

function handleNumberInput(
  event: ChangeEvent<HTMLInputElement>,
  fallback: number,
): number {
  const value = Number(event.target.value)
  return Number.isFinite(value) ? value : fallback
}

export function SimulatorSettingsPanel({
  settings,
  onChange,
}: SimulatorSettingsPanelProps) {
  const handlePaperChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = PAPER_PRESETS.find(
      (item) => item.label === event.target.value,
    )
    onChange({
      ...settings,
      paper: preset ?? DEFAULT_SIMULATOR_SETTINGS.paper,
    })
  }

  const handlePenWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextWidth = handleNumberInput(event, settings.penWidthMm)
    onChange({
      ...settings,
      penWidthMm: Math.max(nextWidth, 0.1),
    })
  }

  const handlePenColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      penColor: event.target.value,
    })
  }

  const handlePenThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextThreshold = handleNumberInput(event, settings.penDownThreshold)
    onChange({
      ...settings,
      penDownThreshold: nextThreshold,
    })
  }

  return (
    <section className="settings-panel">
      <h2 className="settings-panel__title">纸张与笔设置</h2>
      <p className="settings-panel__description">
        这里的参数会直接影响轨迹绘制与越界校验，请根据真实设备进行调整。
      </p>
      <label className="settings-panel__field">
        <span>纸张尺寸</span>
        <select value={settings.paper.label} onChange={handlePaperChange}>
          {PAPER_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-panel__field">
        <span>笔宽 (mm)</span>
        <input
          type="number"
          min={0.1}
          max={5}
          step={0.1}
          value={settings.penWidthMm}
          onChange={handlePenWidthChange}
        />
      </label>
      <label className="settings-panel__field">
        <span>笔颜色</span>
        <input
          type="color"
          value={settings.penColor}
          onChange={handlePenColorChange}
        />
      </label>
      <label className="settings-panel__field">
        <span>落笔阈值 Z (mm)</span>
        <input
          type="number"
          step={0.1}
          value={settings.penDownThreshold}
          onChange={handlePenThresholdChange}
        />
      </label>
    </section>
  )
}
