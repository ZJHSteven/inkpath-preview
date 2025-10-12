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
  const requestRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const stateRef = useRef<PlaybackState>(DEFAULT_PLAYBACK_STATE)
  const elapsedRef = useRef(0)

  useEffect(() => {
    // 每当时间线发生变化（例如重新解析）时，重置播放进度。
    setState(DEFAULT_PLAYBACK_STATE)
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }
    lastFrameTimeRef.current = null
    stateRef.current = DEFAULT_PLAYBACK_STATE
    elapsedRef.current = 0
  }, [timeline])

  useEffect(() => {
    stateRef.current = state
    elapsedRef.current = state.elapsedMs
  }, [state])

  useEffect(() => {
    if (!state.playing) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
      lastFrameTimeRef.current = null
      return
    }

    const step = (timestamp: number) => {
      if (!stateRef.current.playing) {
        requestRef.current = null
        return
      }

      const last = lastFrameTimeRef.current ?? timestamp
      const delta = (timestamp - last) * stateRef.current.speed
      lastFrameTimeRef.current = timestamp

      const totalDuration = timeline.totalDurationMs
      if (totalDuration <= 0) {
        const nextState: PlaybackState = {
          ...stateRef.current,
          playing: false,
          elapsedMs: 0,
          pendingSeekMs: null,
        }
        stateRef.current = nextState
        elapsedRef.current = 0
        setState(nextState)
        requestRef.current = null
        return
      }

      const nextElapsed = Math.min(
        elapsedRef.current + delta,
        totalDuration,
      )
      const reachedEnd = nextElapsed >= totalDuration

      if (nextElapsed !== elapsedRef.current || reachedEnd) {
        elapsedRef.current = nextElapsed
        const nextState: PlaybackState = {
          ...stateRef.current,
          elapsedMs: nextElapsed,
          playing: reachedEnd ? false : stateRef.current.playing,
          pendingSeekMs: null,
        }
        stateRef.current = nextState
        setState(nextState)
      }

      if (!reachedEnd && stateRef.current.playing) {
        requestRef.current = requestAnimationFrame(step)
      } else {
        requestRef.current = null
      }
    }

    requestRef.current = requestAnimationFrame(step)

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
      lastFrameTimeRef.current = null
    }
  }, [state.playing, state.speed, timeline.totalDurationMs])

  const play = () => {
    if (!timeline.playable || timeline.totalDurationMs === 0) {
      return
    }
    lastFrameTimeRef.current = null
    setState((prev) => {
      if (prev.playing) {
        return prev
      }
      const resetElapsed =
        prev.elapsedMs >= timeline.totalDurationMs ? 0 : prev.elapsedMs
      elapsedRef.current = resetElapsed
      const nextState: PlaybackState = {
        ...prev,
        playing: true,
        elapsedMs: resetElapsed,
        pendingSeekMs: null,
      }
      stateRef.current = nextState
      return nextState
    })
  }

  const pause = () => {
    setState((prev) => {
      if (!prev.playing) {
        return prev
      }
      const nextState: PlaybackState = {
        ...prev,
        playing: false,
      }
      stateRef.current = nextState
      return nextState
    })
  }

  const stop = () => {
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }
    lastFrameTimeRef.current = null
    elapsedRef.current = 0
    const nextState: PlaybackState = { ...DEFAULT_PLAYBACK_STATE }
    stateRef.current = nextState
    setState(nextState)
  }

  const seek = (ratio: number) => {
    const clampedRatio = Math.min(Math.max(ratio, 0), 1)
    const targetMs = timeline.totalDurationMs * clampedRatio
    elapsedRef.current = targetMs
    lastFrameTimeRef.current = null
    setState((prev) => {
      const nextState: PlaybackState = {
        ...prev,
        elapsedMs: targetMs,
        pendingSeekMs: targetMs,
        playing: false,
      }
      stateRef.current = nextState
      return nextState
    })
  }

  const setSpeed = (speed: number) => {
    const normalized = Math.max(speed, 0.1)
    setState((prev) => {
      if (prev.speed === normalized) {
        return prev
      }
      const nextState: PlaybackState = {
        ...prev,
        speed: normalized,
      }
      stateRef.current = nextState
      return nextState
    })
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
