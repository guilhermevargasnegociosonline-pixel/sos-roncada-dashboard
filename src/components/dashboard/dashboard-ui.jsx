import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Kpi({ label, value, sub, colorClass, icon }) {
  return (
    <Card className="relative overflow-hidden py-0 gap-0">
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] rounded-t-xl', colorClass || 'bg-primary')} />
      <CardContent className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
          <div className="text-2xl font-bold leading-none text-foreground">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
        </div>
        {icon && <span className="text-xl opacity-40">{icon}</span>}
      </CardContent>
    </Card>
  )
}

export function SectionCard({ title, right, children, className }) {
  return (
    <Card className={className}>
      <CardContent className="px-5 py-5">
        {title && (
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
            {right}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

export function SectionTitle({ icon, title, sub }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-base font-bold tracking-tight text-foreground">{title}</span>
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1 pl-[26px]">{sub}</div>}
    </div>
  )
}

export function ProgressRow({ rank, label, pct, right, colorClass }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {rank !== undefined && (
        <span className={cn('text-[10px] font-bold w-[18px] text-center shrink-0', rank === 1 ? 'text-primary' : 'text-muted-foreground')}>#{rank}</span>
      )}
      <span className="text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      <div className="w-16 h-[5px] bg-border rounded-full overflow-hidden shrink-0">
        <div className={cn('h-full rounded-full', colorClass || 'bg-primary')} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground w-10 text-right shrink-0">{right !== undefined ? right : `${pct}%`}</span>
    </div>
  )
}

export function Pill({ children, className }) {
  return (
    <Badge variant="secondary" className={cn('rounded-full text-[10px] font-semibold uppercase tracking-wide border-0', className)}>
      {children}
    </Badge>
  )
}

export function ProductBadge({ p }) {
  return (
    <Pill className={p === 'resgate' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-300'}>
      {p || '—'}
    </Pill>
  )
}

export function EmptyState({ msg }) {
  return <div className="text-center py-7 text-muted-foreground text-xs">{msg || 'Aguardando dados da análise'}</div>
}

export function CopyPhoneButton({ value, copied, onCopy }) {
  const ok = copied === value
  return (
    <button
      onClick={() => onCopy(value)}
      className={cn(
        'rounded-md border px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors',
        ok ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-accent border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {ok ? '✓ Copiado' : 'Copiar nº'}
    </button>
  )
}

export function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="text-left px-2.5 py-2 text-muted-foreground font-medium text-[10px] border-b border-border whitespace-nowrap uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const tooltipStyle = {
  background: '#1e2535',
  border: '1px solid #2e3a50',
  borderRadius: 8,
  color: '#94a3b8',
  fontSize: 11,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}
