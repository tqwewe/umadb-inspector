import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Database, 
  Search, 
  Eye,
  Calculator
} from 'lucide-react'
import { TimestampToggle } from './TimestampToggle'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Home', href: '/', icon: Database },
  { name: 'Event Search', href: '/search', icon: Search },
  { name: 'Event Lookup', href: '/events', icon: Eye },
  { name: 'Projections', href: '/projections', icon: Calculator },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <nav className="w-64 bg-card border-r border-border flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold text-foreground">
              UmaDB Inspector
            </h1>
          </div>
          
          <div className="px-3 space-y-1 flex-1">
            {/* Main Navigation */}
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
          
          {/* Bottom section with timestamp toggle */}
          <div className="p-3 border-t border-border">
            <TimestampToggle />
          </div>
        </nav>

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}