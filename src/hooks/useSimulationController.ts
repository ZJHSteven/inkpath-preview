/**
 * @file useSimulationController.ts
 * @description
 *  基于生成的时间线提供播放、暂停、拖动、调速等控制能力。
 *  该 Hook 只关心时间推进与位置插值，不直接处理 Canvas 绘制。
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  PlaybackState,
  SimulationSegment,
  SimulationTimeline,
  ToolheadState,
} from '../modules/gcode/types'

const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  playing: false,
  elapsedMs: 0,
  pendingSeekMs: null,
  speed: 1,
}

function interpolatePosition(
  segment: SimulationSegment,
  elapsedMs: number,
): ToolheadState {
  const segmentDuration = segment.durationMs || 1
  const segmentStartTime = segment.cumulativeTimeMs - segment.durationMs

  const ratio = Math.min(
    Math.max((elapsedMs - segmentStartTime) / segmentDuration, 0),
    1,
  )

  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
    y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
    z: segment.start.z + (segment.end.z - segment.start.z) * ratio,
    feedRate: segment.end.feedRate,
  }
}

function findSegment(
  timeline: SimulationTimeline,
  elapsedMs: number,
): SimulationSegment | null {
  for (const segment of timeline.segments) {
    if (elapsedMs <= segment.cumulativeTimeMs) {
      return segment
    }
  }
  return timeline.segments.at(-1) ?? null
}

export interface SimulationController {
  state: PlaybackState
  play: () => void
  pause: () => void
  stop: () => void
  seek: (ratio: number) => void
  setSpeed: (speed: number) => void
  progress: number
  currentSegment: SimulationSegment | null
  currentPosition: ToolheadState
  activeLine: number | undefined
}

export function useSimulationController(
  timeline: SimulationTimeline,
): SimulationController {
  const [state, setState] = useState<PlaybackState>(DEFAULT_PLAYBACK_STATE)
  const requestRef = useRef<number>()
  const lastFrameTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // 每当时间线发生变化（例如重新解析）时，重置播放进度。
    setState(DEFAULT_PLAYBACK_STATE)
    if (requestRef.current !== undefined) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = undefined
    }
    lastFrameTimeRef.current = null
  }, [timeline])

  useEffect(() => {
    if (!state.playing) {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = undefined
      }
      lastFrameTimeRef.current = null
      return
    }

    const frame = (timestamp: number) => {
      setState((prev) => {
        if (!prev.playing) {
          return prev
        }

        const last = lastFrameTimeRef.current ?? timestamp
        const delta = (timestamp - last) * prev.speed
        lastFrameTimeRef.current = timestamp

        const nextElapsed = Math.min(
          prev.elapsedMs + delta,
          timeline.totalDurationMs,
        )

        const playing =
          nextElapsed >= timeline.totalDurationMs ? false : prev.playing

        return {
          ...prev,
          elapsedMs: nextElapsed,
          playing,
        }
      })

      requestRef.current = requestAnimationFrame(frame)
    }

    requestRef.current = requestAnimationFrame(frame)

    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = undefined
      }
    }
  }, [state.playing, state.speed, timeline.totalDurationMs])

  const play = () => {
    if (!timeline.playable || timeline.totalDurationMs === 0) {
      return
    }
    setState((prev) => ({
      ...prev,
      playing: true,
      pendingSeekMs: null,
    }))
  }

  const pause = () => {
    setState((prev) => ({
      ...prev,
      playing: false,
    }))
  }

  const stop = () => {
    setState({
      ...DEFAULT_PLAYBACK_STATE,
    })
  }

  const seek = (ratio: number) => {
    const clampedRatio = Math.min(Math.max(ratio, 0), 1)
    const targetMs = timeline.totalDurationMs * clampedRatio
    setState((prev) => ({
      ...prev,
      elapsedMs: targetMs,
      pendingSeekMs: targetMs,
      playing: false,
    }))
  }

  const setSpeed = (speed: number) => {
    setState((prev) => ({
      ...prev,
      speed: Math.max(speed, 0.1),
    }))
  }

  const currentSegment = useMemo(
    () => findSegment(timeline, state.elapsedMs),
    [timeline, state.elapsedMs],
  )

  const currentPosition = useMemo(() => {
    if (!currentSegment) {
      return {
        x: 0,
        y: 0,
        z: 0,
        feedRate: 0,
      }
    }
    return interpolatePosition(currentSegment, state.elapsedMs)
  }, [currentSegment, state.elapsedMs])

  const progress = useMemo(() => {
    if (timeline.totalDurationMs === 0) {
      return 0
    }
    return state.elapsedMs / timeline.totalDurationMs
  }, [state.elapsedMs, timeline.totalDurationMs])

  const activeLine = currentSegment?.lineNumber

  return {
    state,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    progress,
    currentSegment,
    currentPosition,
    activeLine,
  }
}
