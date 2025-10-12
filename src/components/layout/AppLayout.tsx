/**
 * @file AppLayout.tsx
 * @description
 *  提供整体页面的基础排版：上方顶栏、左侧侧栏、右侧主画布区域。
 *  具体的业务组件通过 props 注入，保持布局层的纯粹性。
 */

import type { ReactNode } from 'react'

import './AppLayout.css'

export interface AppLayoutProps {
  topBar: ReactNode
  sidebar: ReactNode
  main: ReactNode
  footer?: ReactNode
}

export function AppLayout({ topBar, sidebar, main, footer }: AppLayoutProps) {
  return (
    <div className="app-layout">
      {topBar}
      <div className="app-layout__content">
        <aside className="app-layout__sidebar">{sidebar}</aside>
        <section className="app-layout__main">{main}</section>
      </div>
      {footer ? <div className="app-layout__footer">{footer}</div> : null}
    </div>
  )
}
