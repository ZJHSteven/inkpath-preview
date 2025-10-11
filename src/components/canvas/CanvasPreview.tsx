/**
 * @file CanvasPreview.tsx
 * @description
 *  使用 HTML Canvas 渲染 G-code 的模拟轨迹，并展示当前笔尖位置。
 *  组件仅负责绘制逻辑，不直接触发播放进度更新。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  SimulationTimeline,
  SimulatorSettings,
  ToolheadState,
} from '../../modules/gcode/types'

import './CanvasPreview.css'

export interface CanvasPreviewProps {
  timeline: SimulationTimeline
  progress: number
  position: ToolheadState
  settings: SimulatorSettings
}

interface CanvasSize {
  width: number
  height: number
}

const PAPER_PADDING = 32
const PAPER_CORNER_RADIUS = 16

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function formatTime(ms: number): string {
  if (ms <= 0) {
    return '0:00'
  }
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function CanvasPreview({
  timeline,
  progress,
  position,
  settings,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 800,
    height: 600,
  })

  const playedMs = useMemo(
    () => timeline.totalDurationMs * progress,
    [timeline.totalDurationMs, progress],
  )

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) {
      return
    }
    const { clientWidth, clientHeight } = containerRef.current
    setCanvasSize({
      width: clientWidth,
      height: clientHeight,
    })
  }, [])

  useEffect(() => {
    updateCanvasSize()
    const observer = new ResizeObserver(updateCanvasSize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [updateCanvasSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    const context = canvas.getContext('2d')
    if (!context) return
    context.resetTransform()
    context.scale(dpr, dpr)

    const { paper, penColor, penWidthMm } = settings
    const padding = PAPER_PADDING
    const availableWidth = canvasSize.width - padding * 2
    const availableHeight = canvasSize.height - padding * 2

    const scale = Math.min(
      availableWidth / paper.widthMm,
      availableHeight / paper.heightMm,
    )

    const offsetX = (canvasSize.width - paper.widthMm * scale) / 2
    const offsetY = (canvasSize.height - paper.heightMm * scale) / 2

    const mapX = (x: number) => offsetX + x * scale
    const mapY = (y: number) =>
      offsetY + (paper.heightMm - y) * scale

    // 背景
    context.fillStyle = '#0b1220'
    context.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // 纸张区域
    context.fillStyle = '#f8fafc'
    context.strokeStyle = 'rgba(148, 163, 184, 0.6)'
    context.lineWidth = 1
    drawRoundedRect(
      context,
      offsetX,
      offsetY,
      paper.widthMm * scale,
      paper.heightMm * scale,
      PAPER_CORNER_RADIUS,
    )
    context.fill()
    context.stroke()

    // 绘制网格（每 10mm）
    context.strokeStyle = 'rgba(148, 163, 184, 0.15)'
    context.lineWidth = 1
    context.beginPath()
    for (let x = 0; x <= paper.widthMm; x += 10) {
      const px = mapX(x)
      context.moveTo(px, offsetY)
      context.lineTo(px, offsetY + paper.heightMm * scale)
    }
    for (let y = 0; y <= paper.heightMm; y += 10) {
      const py = mapY(y)
      context.moveTo(offsetX, py)
      context.lineTo(offsetX + paper.widthMm * scale, py)
    }
    context.stroke()

    // 绘制轨迹
    const penWidthPx = Math.max((penWidthMm || 0.5) * scale, 1)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const segment of timeline.segments) {
      const startTime =
        segment.cumulativeTimeMs - segment.durationMs
      const endTime = segment.cumulativeTimeMs

      if (!segment.penDown) {
        // 抬笔路径使用虚线，仅在完全播放后显示以示参考
        if (playedMs >= endTime) {
          context.setLineDash([8, 8])
          context.strokeStyle = 'rgba(148, 163, 184, 0.35)'
          context.lineWidth = 1
          context.beginPath()
          context.moveTo(mapX(segment.start.x), mapY(segment.start.y))
          context.lineTo(mapX(segment.end.x), mapY(segment.end.y))
          context.stroke()
          context.setLineDash([])
        }
        continue
      }

      const drawRatio =
        playedMs >= endTime
          ? 1
          : playedMs <= startTime
          ? 0
          : (playedMs - startTime) / segment.durationMs

      if (drawRatio <= 0) {
        continue
      }

      const endX =
        segment.start.x + (segment.end.x - segment.start.x) * drawRatio
      const endY =
        segment.start.y + (segment.end.y - segment.start.y) * drawRatio

      context.setLineDash([])
      context.strokeStyle = penColor
      context.lineWidth = penWidthPx
      context.beginPath()
      context.moveTo(mapX(segment.start.x), mapY(segment.start.y))
      context.lineTo(mapX(endX), mapY(endY))
      context.stroke()
    }

    // 当前笔尖
    context.fillStyle = '#f059ea'
    context.beginPath()
    context.arc(mapX(position.x), mapY(position.y), penWidthPx * 1.8, 0, Math.PI * 2)
    context.fill()
  }, [canvasSize, settings, timeline, playedMs, position])

  return (
    <div className="canvas-preview">
      <div className="canvas-preview__header">
        <div>
          <h2 className="canvas-preview__title">画布预览</h2>
          <p className="canvas-preview__subtitle">
            当前进度：{(progress * 100).toFixed(1)}% · 已用时{' '}
            {formatTime(playedMs)} / {formatTime(timeline.totalDurationMs)}
          </p>
        </div>
        <div className="canvas-preview__meta">
          <span>纸张：{settings.paper.label}</span>
          <span>笔宽：{settings.penWidthMm.toFixed(2)}mm</span>
        </div>
      </div>
      <div className="canvas-preview__surface" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
