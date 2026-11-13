/**
 * @file markerInsert.ts
 * @description
 *  将 InkPath 后处理用的整行 Marker 插入到指定 G-code 指令之后。
 *  这是纯文本操作，不会切断一条运动指令或改变路径几何结构。
 *  将逻辑独立出来，便于测试长程序、CRLF 和重复插入等边界。
 */

export interface MarkerInsertionResult {
  source: string
  /** Marker 所在的实际文档行号（从 1 开始）。 */
  markerLine: number
  /** 若紧接的下一行已有此 marker，就不重复插入。 */
  changed: boolean
}

/** 仅需与仿真轨迹段共享的最小字段，便于纯逻辑测试。 */
export interface MarkerTimelinePosition {
  segments: Array<{ lineNumber: number; cumulativeTimeMs: number }>
  totalDurationMs: number
}

/**
 * 将“暂停在轨迹上的某一刻”转换为安全的 G-code 指令边界。
 *
 * 一个 G1 直线段在原程序里只能是一整行：如果在 50% 处直接把 marker
 * 塞进坐标中间，会破坏运动指令。这里选择把标记放在**当前段末尾**。
 * 这样不会改变轨迹，也不会把一条原始 G1 硬拆为两条。
 *
 * 起点（t=0）放在第一条运动之前，保留前面的 G20/G21/G90 设置；
 * 终点（t>=总时长）放在最后一条运动之后。
 */
export function getMarkerInsertionAfterLine(
  timeline: MarkerTimelinePosition,
  elapsedMs: number,
): number | null {
  const segments = timeline.segments
  if (segments.length === 0 || !Number.isFinite(elapsedMs)) return null

  if (elapsedMs <= 0) return Math.max(0, segments[0].lineNumber - 1)
  if (elapsedMs >= timeline.totalDurationMs) return segments.at(-1)!.lineNumber

  const activeSegment = segments.find(
    (segment) => elapsedMs <= segment.cumulativeTimeMs,
  )
  return (activeSegment ?? segments.at(-1)!).lineNumber
}

/**
 * @param source 编辑器原始文本；支持 LF/CRLF。
 * @param marker 设置中配置的非空、单行标记。
 * @param afterLine 在哪一行之后插入，0 表示文档最前面。
 * @returns 无法插入时返回 null；重复标记返回未变更结果。
 */
export function insertMarkerAfterLine(
  source: string,
  marker: string,
  afterLine: number,
): MarkerInsertionResult | null {
  const normalizedMarker = marker.trim()
  if (!normalizedMarker || /[\r\n]/.test(normalizedMarker)) return null

  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r\n|\n/)
  if (!Number.isInteger(afterLine) || afterLine < 0 || afterLine > lines.length) {
    return null
  }

  // afterLine 是已经完成的行数，也是新标记的零基插入位置。
  // 文档末尾原本就有换行时，原本最后的空行同样可作为插入位置。
  const markerLine = afterLine + 1
  if (lines[afterLine]?.trim() === normalizedMarker) {
    return { source, markerLine, changed: false }
  }

  lines.splice(afterLine, 0, normalizedMarker)
  return { source: lines.join(newline), markerLine, changed: true }
}
