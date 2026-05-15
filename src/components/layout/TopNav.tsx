import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps {
  onToggleTheme: () => void
  isDark: boolean
}

const notifications = [
  { icon: AlertTriangle, text: 'High risk claim CLM-48209 detected', time: '2 min ago', color: 'text-red-500' },
  { icon: FileText, text: 'Invoice INV-92834 uploaded for audit', time: '15 min ago', color: 'text-blue-500' },
  { icon: CheckCircle2, text: 'Claim CLM-17382 approved after review', time: '1 hour ago', color: 'text-emerald-500' },
  { icon: AlertTriangle, text: 'Duplicate charges found in INV-73451', time: '2 hours ago', color: 'text-amber-500' },
]

export function TopNav({ onToggleTheme, isDark }: TopNavProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/claims?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-6">
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims, invoices, workshops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={onToggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                4
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notifications</span>
              <Button variant="ghost" size="sm" className="text-xs h-7">Mark all read</Button>
            </div>
            <div className="space-y-1 mt-1">
              {notifications.map((n, i) => (
                <DropdownMenuItem key={i} className="flex items-start gap-3 p-2 cursor-pointer">
                  <div className={cn('mt-0.5', n.color)}>
                    <n.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">JD</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 text-sm">
                <span className="hidden sm:inline font-medium">James Wilson</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Audit Settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
