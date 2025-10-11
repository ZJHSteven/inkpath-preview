/**
 * @file PlaybackControls.tsx
 * @description
 *  提供播放、暂停、停止与速度调节等控件，同时展示时间信息。
 */

import { ChangeEvent } from 'react'

import { PlaybackState, SimulationTimeline } from '../../modules/gcode/types'

import './PlaybackControls.css'

export interface PlaybackControlsProps {
  state: PlaybackState
  progress: number
  timeline: SimulationTimeline
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (ratio: number) => void
  onSpeedChange: (speed: number) => void
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
}: PlaybackControlsProps) {
  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(event.target.value))
  }

  const handleSpeedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSpeedChange(Number(event.target.value))
  }

  return (
    <section className="playback-controls">
      <div className="playback-controls__buttons">
        <button
          type="button"
          className="playback-controls__button"
          onClick={state.playing ? onPause : onPlay}
        >
          {state.playing ? '暂停' : '播放'}
        </button>
        <button
          type="button"
          className="playback-controls__button"
          onClick={onStop}
        >
          停止
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
        />
      </div>
    </section>
  )
}
