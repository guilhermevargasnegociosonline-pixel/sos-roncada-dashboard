import { useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Pill } from '@/components/dashboard/dashboard-ui'
import { cn } from '@/lib/utils'

export function SidebarToggle({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Abrir menu de navegação"
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-accent text-foreground hover:bg-secondary transition-colors shrink-0"
    >
      <Menu className="w-[18px] h-[18px]" />
    </button>
  )
}

export function Sidebar({ open, onClose, tabs, activeTab, onSelect, pendentesCount }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[260px] bg-card border-r border-border z-50 flex flex-col transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navegação</span>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            const badge = t.id === 'inspecao' && pendentesCount > 0 ? pendentesCount : null
            return (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); onClose() }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors text-left',
                  active ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{t.label}</span>
                {badge && <Pill className="bg-destructive/15 text-destructive">{badge}</Pill>}
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
