/**
 * @file ControlIcons.tsx
 * @description
 *  收纳通用的矢量图标组件，避免在多个按钮中复制 SVG 代码。
 *  每个图标都只负责展示，不包含交互逻辑，便于日后统一换肤。
 */

import type { SVGProps } from 'react'
import { Settings as LucideSettings } from 'lucide-react' // 引入 Lucide 开源图标库，确保图形一致性与可维护性。

interface IconProps extends SVGProps<SVGSVGElement> {
  /** 为屏幕阅读器提供的短语，默认隐藏图标进入无障碍树。 */
  label?: string
}

function createAccessibleProps(label?: string) {
  return label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true, focusable: false }
}

export function GearIcon({ label, ...rest }: IconProps) {
  return (
    <LucideSettings
      size={20}
      strokeWidth={1.6}
      {...createAccessibleProps(label)}
      {...rest}
    />
  )
}

export function PlayIcon({ label, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      {...createAccessibleProps(label)}
      {...rest}
    >
      <path d="M7.5 5.5a1 1 0 0 1 1.55-.83l9 6.5a1 1 0 0 1 0 1.66l-9 6.5A1 1 0 0 1 7.5 18V6Z" />
    </svg>
  )
}

export function PauseIcon({ label, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      {...createAccessibleProps(label)}
      {...rest}
    >
      <rect x={7} y={5} width={3.5} height={14} rx={1} />
      <rect x={13.5} y={5} width={3.5} height={14} rx={1} />
    </svg>
  )
}

export function StopIcon({ label, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      {...createAccessibleProps(label)}
      {...rest}
    >
      <rect x={6.5} y={6.5} width={11} height={11} rx={1.6} />
    </svg>
  )
}
