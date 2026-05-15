import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Upload,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSearch,
  Bot,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Claims', path: '/claims' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Upload, label: 'Upload', path: '/upload' },
  { icon: Bot, label: 'Auditor', path: '/auditor' },
]

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">InsurAudit</span>
            <span className="text-[10px] text-muted-foreground">Claim Intelligence</span>
          </div>
        )}
      </div>

      <div className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          return (
            <NavLink key={item.path} to={item.path}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size={collapsed ? 'icon' : 'default'}
                className={cn(
                  'w-full justify-start gap-3',
                  collapsed ? 'h-9 w-9 mx-auto' : 'px-3',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Button>
            </NavLink>
          )
        })}

        <Separator className="my-4" />

        <div className="px-3 py-2">
          {!collapsed && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-amber-600 dark:text-amber-400">12 Fraud Alerts</p>
                <p className="text-muted-foreground">Requires attention</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-4 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <NavLink key={item.path} to={item.path}>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'w-full justify-start gap-3',
                collapsed ? 'h-9 w-9 mx-auto' : 'px-3'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Button>
          </NavLink>
        ))}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className={cn('w-full justify-start gap-3 mt-2', collapsed ? 'h-9 w-9 mx-auto' : 'px-3')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}
