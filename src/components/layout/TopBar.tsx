/**
 * @file TopBar.tsx
 * @description
 *  页面顶栏，包含项目名称、菜单入口以及用户占位图标。
 *  采用纯前端静态内容，后续如需接入设置弹窗可在此扩展。
 */

import './TopBar.css'

export function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <div className="top-bar__logo">墨</div>
        <div>
          <p className="top-bar__title">InkPath 预览</p>
          <p className="top-bar__subtitle">模拟绘图机·本地调试工具</p>
        </div>
      </div>
      <nav className="top-bar__menu">
        <button type="button" className="top-bar__menu-item">
          文件
        </button>
        <button type="button" className="top-bar__menu-item">
          编辑
        </button>
        <button type="button" className="top-bar__menu-item">
          视图
        </button>
        <button type="button" className="top-bar__menu-item">
          帮助
        </button>
      </nav>
      <div className="top-bar__actions">
        <button type="button" className="top-bar__gear">
          ⚙
        </button>
        <div className="top-bar__avatar">访</div>
      </div>
    </header>
  )
}
