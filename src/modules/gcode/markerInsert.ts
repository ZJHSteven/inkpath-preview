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
