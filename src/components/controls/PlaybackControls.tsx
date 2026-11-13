/**
 * @file PlaybackControls.tsx
 * @description
 *  提供播放、暂停、停止与速度调节等控件，同时展示时间信息。
 */

import type { ChangeEvent } from 'react'

import type {
  PlaybackState,
  SimulationTimeline,
} from '../../modules/gcode/types'

import './PlaybackControls.css'
import { PauseIcon, PlayIcon, StopIcon } from '../icons/ControlIcons'
import { BookmarkPlus } from 'lucide-react'

export interface PlaybackControlsProps {
  state: PlaybackState
  progress: number
  timeline: SimulationTimeline
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (ratio: number) => void
  onSpeedChange: (speed: number) => void
  /** 在当前运动段后插入整行 Marker；由父组件计算真实 G-code 行号。 */
  onInsertMarker: () => void
  canInsertMarker: boolean
  markerLineHint?: number
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PlaybackControls({
  state,
  progress,
  timeline,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onInsertMarker,
  canInsertMarker,
  markerLineHint,
}: PlaybackControlsProps) {
  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(event.target.value))
  }

  const handleSpeedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSpeedChange(Number(event.target.value))
  }

  const playable = timeline.playable && timeline.totalDurationMs > 0

  return (
    <section className="playback-controls">
      <div className="playback-controls__buttons">
        <button
          type="button"
          className="playback-controls__button"
          onClick={state.playing ? onPause : onPlay}
          disabled={!playable}
          aria-label={state.playing ? '暂停播放' : '开始播放'}
        >
          {state.playing ? <PauseIcon /> : <PlayIcon />}
          <span className="playback-controls__sr-only">
            {state.playing ? '暂停播放' : '开始播放'}
          </span>
        </button>
        <button
          type="button"
          className="playback-controls__button"
          onClick={onStop}
          aria-label="停止播放"
        >
          <StopIcon />
          <span className="playback-controls__sr-only">停止播放</span>
        </button>
        <button
          type="button"
          className="playback-controls__button playback-controls__marker-button"
          onClick={onInsertMarker}
          disabled={state.playing || !playable || !canInsertMarker}
          aria-label="在当前位置插入 Marker"
          title={
            markerLineHint === undefined
              ? '请先加载可播放的轨迹，并设置非空 Marker'
              : `暂停后在第 ${markerLineHint} 行之后插入 Marker（不会切分正在执行的运动指令）`
          }
        >
          <BookmarkPlus size={17} aria-hidden="true" />
          <span>插入 Marker</span>
        </button>
      </div>

      <div className="playback-controls__timeline">
        <span className="playback-controls__time">
          {formatTime(timeline.totalDurationMs * progress)}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleSliderChange}
          disabled={!playable}
          aria-label="播放进度"
        />
        <span className="playback-controls__time">
          {formatTime(timeline.totalDurationMs)}
        </span>
      </div>

      <div className="playback-controls__speed">
        <label htmlFor="playback-speed">速度：{state.speed.toFixed(1)}x</label>
        <input
          id="playback-speed"
          type="range"
          min={0.2}
          max={3}
          step={0.1}
          value={state.speed}
          onChange={handleSpeedChange}
          disabled={!playable}
        />
      </div>
    </section>
  )
}
