/**
 * @file TopBar.tsx
 * @description
 *  顶栏包含品牌标识、菜单下拉与快捷入口。
 *  菜单点击后触发父组件传入的具体业务逻辑。
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import './TopBar.css'

type MenuKey = 'file' | 'edit' | 'view' | 'help' | 'settings' | 'profile' | null

export interface TopBarProps {
  onImportFile: () => void
  onDownloadFile: () => void
  onClearDocument: () => void
  onRestoreSample: () => void
  onToggleWordWrap: () => void
  isWordWrapEnabled: boolean
  onToggleGrid: (value: boolean) => void
  onTogglePenUpTrails: (value: boolean) => void
  showGrid: boolean
  showPenUpTrails: boolean
  onOpenGuide: () => void
  onOpenAbout: () => void
}

interface DropdownConfig {
  key: Exclude<MenuKey, null>
  label: string
  items: Array<{
    label: string
    action: () => void
    type?: 'normal' | 'switch'
    checked?: boolean
  }>
}

export function TopBar({
  onImportFile,
  onDownloadFile,
  onClearDocument,
  onRestoreSample,
  onToggleWordWrap,
  isWordWrapEnabled,
  onToggleGrid,
  onTogglePenUpTrails,
  showGrid,
  showPenUpTrails,
  onOpenGuide,
  onOpenAbout,
}: TopBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null)
  const containerRefs = useRef<Record<Exclude<MenuKey, null>, HTMLDivElement | null>>({
    file: null,
    edit: null,
    view: null,
    help: null,
    settings: null,
    profile: null,
  })

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!openMenu) return
      const container = containerRefs.current[openMenu]
      if (container && container.contains(event.target as Node)) {
        return
      }
      setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  const dropdowns = useMemo<DropdownConfig[]>(
    () => [
      {
        key: 'file',
        label: '文件',
        items: [
          { label: '导入 G-code…', action: onImportFile },
          { label: '下载当前文件', action: onDownloadFile },
          { label: '清空文档', action: onClearDocument },
        ],
      },
      {
        key: 'edit',
        label: '编辑',
        items: [
          { label: '恢复内置示例', action: onRestoreSample },
          {
            label: isWordWrapEnabled ? '关闭自动换行' : '开启自动换行',
            action: onToggleWordWrap,
          },
        ],
      },
      {
        key: 'view',
        label: '视图',
        items: [
          {
            label: '显示底图网格',
            action: () => onToggleGrid(!showGrid),
            type: 'switch',
            checked: showGrid,
          },
          {
            label: '显示抬笔轨迹',
            action: () => onTogglePenUpTrails(!showPenUpTrails),
            type: 'switch',
            checked: showPenUpTrails,
          },
        ],
      },
      {
        key: 'help',
        label: '帮助',
        items: [
          { label: '快速上手指南', action: onOpenGuide },
          { label: '关于 InkPath', action: onOpenAbout },
        ],
      },
    ],
    [
      onImportFile,
      onDownloadFile,
      onClearDocument,
      onRestoreSample,
      onToggleWordWrap,
      isWordWrapEnabled,
      onToggleGrid,
      onTogglePenUpTrails,
      showGrid,
      showPenUpTrails,
      onOpenGuide,
      onOpenAbout,
    ],
  )

  const renderDropdown = (config: DropdownConfig) => (
    <div
      key={config.key}
      className="top-bar__menu-item-wrapper"
      ref={(node) => {
        containerRefs.current[config.key] = node
      }}
    >
      <button
        type="button"
        className={`top-bar__menu-item ${openMenu === config.key ? 'top-bar__menu-item--active' : ''}`}
        onClick={() => setOpenMenu(openMenu === config.key ? null : config.key)}
      >
        {config.label}
      </button>
      {openMenu === config.key ? (
        <div className="top-bar__dropdown">
          {config.items.map((item) => (
            <button
              type="button"
              key={item.label}
              className="top-bar__dropdown-item"
              onClick={() => {
                item.action()
                setOpenMenu(null)
              }}
            >
              {item.type === 'switch' ? (
                <span className="top-bar__dropdown-switch">
                  <span className={`top-bar__switch-indicator ${item.checked ? 'top-bar__switch-indicator--on' : ''}`} />
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )

  const renderSettings = () => (
    <div
      className="top-bar__icon-wrapper"
      ref={(node) => {
        containerRefs.current.settings = node
      }}
    >
      <button
        type="button"
        className={`top-bar__gear ${openMenu === 'settings' ? 'top-bar__gear--active' : ''}`}
        onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
      >
        <span className="material-symbols-rounded">tune</span>
      </button>
      {openMenu === 'settings' ? (
        <div className="top-bar__dropdown top-bar__dropdown--right">
          <div className="top-bar__dropdown-heading">快捷设置</div>
          <button
            type="button"
            className="top-bar__dropdown-item"
            onClick={() => {
              onToggleGrid(!showGrid)
              setOpenMenu(null)
            }}
          >
            <span className="top-bar__dropdown-switch">
              <span className={`top-bar__switch-indicator ${showGrid ? 'top-bar__switch-indicator--on' : ''}`} />
            </span>
            <span>显示底图网格</span>
          </button>
          <button
            type="button"
            className="top-bar__dropdown-item"
            onClick={() => {
              onTogglePenUpTrails(!showPenUpTrails)
              setOpenMenu(null)
            }}
          >
            <span className="top-bar__dropdown-switch">
              <span className={`top-bar__switch-indicator ${showPenUpTrails ? 'top-bar__switch-indicator--on' : ''}`} />
            </span>
            <span>显示抬笔轨迹</span>
          </button>
        </div>
      ) : null}
    </div>
  )

  const renderProfile = () => (
    <div
      className="top-bar__profile-wrapper"
      ref={(node) => {
        containerRefs.current.profile = node
      }}
    >
      <button
        type="button"
        className={`top-bar__avatar ${openMenu === 'profile' ? 'top-bar__avatar--active' : ''}`}
        onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
      >
        访
      </button>
      {openMenu === 'profile' ? (
        <div className="top-bar__dropdown top-bar__dropdown--right">
          <div className="top-bar__dropdown-heading">访客中心</div>
          <button
            type="button"
            className="top-bar__dropdown-item"
            onClick={() => {
              onOpenGuide()
              setOpenMenu(null)
            }}
          >
            查看使用指南
          </button>
          <button
            type="button"
            className="top-bar__dropdown-item"
            onClick={() => {
              onOpenAbout()
              setOpenMenu(null)
            }}
          >
            项目简介
          </button>
        </div>
      ) : null}
    </div>
  )

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <div className="top-bar__logo">
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4H7.01134C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44H42.4379Z" />
          </svg>
        </div>
        <div>
          <p className="top-bar__title">InkPath Preview</p>
          <p className="top-bar__subtitle">G-code 模拟 · 本地预览</p>
        </div>
      </div>
      <nav className="top-bar__menu">
        {dropdowns.map(renderDropdown)}
      </nav>
      <div className="top-bar__actions">
        {renderSettings()}
        {renderProfile()}
      </div>
    </header>
  )
}
