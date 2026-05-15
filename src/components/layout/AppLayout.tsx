import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

interface AppLayoutProps {
  onToggleTheme: () => void
  isDark: boolean
}

export function AppLayout({ onToggleTheme, isDark }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onToggleTheme={onToggleTheme} isDark={isDark} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
