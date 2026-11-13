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

const CUSTOM_OPTION_VALUE = '__custom__'

function formatNumberForLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function formatCustomLabel(widthMm: number, heightMm: number): string {
  return `自定义 (${formatNumberForLabel(widthMm)}×${formatNumberForLabel(heightMm)}mm)`
}

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
  const isCustomPaper = !PAPER_PRESETS.some(
    (item) =>
      item.label === settings.paper.label &&
      item.widthMm === settings.paper.widthMm &&
      item.heightMm === settings.paper.heightMm,
  )

  const handlePaperChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === CUSTOM_OPTION_VALUE) {
      const nextPaper = {
        widthMm: settings.paper.widthMm,
        heightMm: settings.paper.heightMm,
        label: formatCustomLabel(
          settings.paper.widthMm,
          settings.paper.heightMm,
        ),
      }
      onChange({
        ...settings,
        paper: nextPaper,
      })
      return
    }

    const preset = PAPER_PRESETS.find((item) => item.label === value)
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

  /** 分隔符只能是一行文本；用户清空输入时就禁用标记识别。 */
  const handleMarkerChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      separatorMarker: event.target.value.replace(/[\r\n]/g, ''),
    })
  }

  const handlePenThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextThreshold = handleNumberInput(event, settings.penDownThreshold)
    onChange({
      ...settings,
      penDownThreshold: nextThreshold,
    })
  }

  const handlePenDirectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDirection = event.target.value === 'positive' ? 'positive' : 'negative'
    onChange({
      ...settings,
      penDownDirection: nextDirection,
    })
  }

  const updateCustomPaper = (nextWidth: number, nextHeight: number) => {
    const safeWidth = Math.max(nextWidth, 10)
    const safeHeight = Math.max(nextHeight, 10)
    onChange({
      ...settings,
      paper: {
        widthMm: safeWidth,
        heightMm: safeHeight,
        label: formatCustomLabel(safeWidth, safeHeight),
      },
    })
  }

  const handleCustomWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextWidth = handleNumberInput(event, settings.paper.widthMm)
    updateCustomPaper(nextWidth, settings.paper.heightMm)
  }

  const handleCustomHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextHeight = handleNumberInput(event, settings.paper.heightMm)
    updateCustomPaper(settings.paper.widthMm, nextHeight)
  }

  return (
    <section className="settings-panel">
      <h2 className="settings-panel__title">纸张与笔设置</h2>
      <p className="settings-panel__description">
        这里的参数会直接影响轨迹绘制与越界校验，请根据真实设备进行调整。
      </p>
      <label className="settings-panel__field">
        <span>G-code 作业分隔标记（Marker）</span>
        <input
          type="text"
          value={settings.separatorMarker}
          onChange={handleMarkerChange}
          placeholder="###"
          aria-label="G-code 作业分隔标记"
          spellCheck={false}
        />
        <small className="settings-panel__hint">
          单独成行时会跳过解析、不产生轨迹；下载仍保留原文。默认 ###，可修改或清空以禁用。
        </small>
      </label>
      <label className="settings-panel__field">
        <span>纸张尺寸</span>
        <select
          value={isCustomPaper ? CUSTOM_OPTION_VALUE : settings.paper.label}
          onChange={handlePaperChange}
        >
          {PAPER_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label}
            </option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>自定义尺寸</option>
        </select>
      </label>
      <div className="settings-panel__field">
        <span>
          自定义尺寸 (mm)
          <small className="settings-panel__hint">
            当前显示：{settings.paper.label}
          </small>
        </span>
        <div className="settings-panel__custom-size">
          <label className="settings-panel__custom-size-item">
            <span>宽度</span>
            <input
              type="number"
              min={10}
              max={1000}
              step={1}
              value={settings.paper.widthMm}
              onChange={handleCustomWidthChange}
              disabled={!isCustomPaper}
            />
          </label>
          <label className="settings-panel__custom-size-item">
            <span>高度</span>
            <input
              type="number"
              min={10}
              max={1000}
              step={1}
              value={settings.paper.heightMm}
              onChange={handleCustomHeightChange}
              disabled={!isCustomPaper}
            />
          </label>
        </div>
      </div>
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
      <label className="settings-panel__field">
        <span>落笔方向</span>
        <select
          value={settings.penDownDirection}
          onChange={handlePenDirectionChange}
        >
          <option value="negative">Z ≤ 阈值视为落笔（常见绘图仪）</option>
          <option value="positive">Z ≥ 阈值视为落笔（自上而下坐标）</option>
        </select>
        <small className="settings-panel__hint">
          若示例轨迹出现“反向落笔”，可在此切换比较方向。
        </small>
      </label>
    </section>
  )
}
