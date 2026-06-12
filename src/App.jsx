import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

const SUPABASE_URL = 'https://bnkesshzstryzfoipres.supabase.co/rest/v1'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'
const H = { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }

const T = {
  bg: '#0f1117', card: '#161b27', elevated: '#1e2535',
  border: '#232c3d', borderHi: '#2e3a50',
  t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569', t4: '#1e2535',
  amber: '#f59e0b', amberD: '#78350f', amberL: '#fcd34d',
  green: '#22c55e', greenD: '#14532d',
  red: '#ef4444', redD: '#7f1d1d',
  blue: '#3b82f6', blueD: '#1e3a5f',
  purple: '#a78bfa', purpleD: '#3b1f6e',
}

const tt = { background: T.elevated, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.t2, fontSize: 11, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 640)
  useEffect(() => { const fn = () => setM(window.innerWidth < 640); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return m
}

function gerarSemanas() {
  const ano = new Date().getFullYear()
  return Array.from({ length: 52 }, (_, i) => `${ano}-W${String(i + 1).padStart(2, '0')}`)
}
function gerarMeses() {
  const ano = new Date().getFullYear()
  const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return Array.from({ length: 12 }, (_, i) => ({ value: `${ano}-${String(i + 1).padStart(2, '0')}`, label: `${n[i]} ${ano}` }))
}

// ── ATOMS ────────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color || T.amber, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 10, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.t1, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.t3, marginTop: 5 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 20, opacity: 0.4 }}>{icon}</span>}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px', ...style }}>{children}</div>
}

function CTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.t2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</div>
      {right && <div>{right}</div>}
    </div>
  )
}

function BRow({ rank, label, pct, right, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {rank !== undefined && <span style={{ fontSize: 10, fontWeight: 700, color: rank === 1 ? T.amber : T.t3, width: 18, textAlign: 'center', flexShrink: 0 }}>#{rank}</span>}
      <span style={{ fontSize: 12, color: T.t2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ width: 64, height: 5, background: T.border, borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${Math.min(pct || 0, 100)}%`, height: '100%', background: color || T.amber, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, color: T.t3, width: 40, textAlign: 'right', flexShrink: 0 }}>{right !== undefined ? right : `${pct}%`}</span>
    </div>
  )
}

function Badge({ children, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: bg || `${color}22`, color: color || T.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</span>
}

function Divider() { return <div style={{ borderTop: `1px solid ${T.border}`, margin: '16px 0' }} /> }

function Empty({ msg }) {
  return <div style={{ textAlign: 'center', padding: '28px 0', color: T.t3, fontSize: 12 }}>{msg || 'Aguardando dados da análise'}</div>
}

function Tabs({ tabs, active, onChange, mobile }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: `1px solid ${T.border}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: mobile ? '8px 10px' : '9px 16px', fontSize: mobile ? 11 : 12,
          fontWeight: active === t.id ? 600 : 400, color: active === t.id ? T.t1 : T.t3,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: active === t.id ? `2px solid ${T.amber}` : '2px solid transparent',
          marginBottom: -1, whiteSpace: 'nowrap', transition: 'color 0.15s',
        }}>{t.label}</button>
      ))}
    </div>
  )
}

function ProdBadge({ p }) {
  return <Badge color={p === 'resgate' ? T.blue : T.purple}>{p || '—'}</Badge>
}

function StatusDot({ dias }) {
  const c = dias > 14 ? T.red : dias > 7 ? T.amber : T.green
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, flexShrink: 0 }} />
}

function CopyBtn({ value, copied, onCopy }) {
  const ok = copied === value
  return (
    <button onClick={() => onCopy(value)} style={{
      background: ok ? T.greenD : T.elevated, border: `1px solid ${ok ? T.green : T.border}`,
      borderRadius: 6, color: ok ? T.green : T.t2, padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{ok ? '✓ Copiado' : 'Copiar nº'}</button>
  )
}

function STitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.t1, letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: T.t3, marginTop: 4, paddingLeft: 26 }}>{sub}</div>}
    </div>
  )
}

function FantasmasTable({ fantasmas, copied, onCopy, mobile }) {
  if (!fantasmas.length) return <Empty msg="🎉 Nenhum fantasma — todos já interagiram" />
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: mobile ? 420 : 'auto' }}>
        <thead>
          <tr>{['Nome','Produto','Telefone','Cadastrado há','Status','Ação'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '7px 10px', color: T.t3, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {fantasmas.map((a, i) => {
            const dias = a.criado_em ? Math.floor((Date.now() - new Date(a.criado_em)) / 86400000) : null
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 10px', color: T.t1, fontWeight: 500 }}>{a.nome || '—'}</td>
                <td style={{ padding: '10px 10px' }}><ProdBadge p={a.produto} /></td>
                <td style={{ padding: '10px 10px', color: T.t3, fontFamily: 'monospace', fontSize: 11 }}>{a.telefone}</td>
                <td style={{ padding: '10px 10px' }}>
                  <span style={{ color: dias > 7 ? T.red : T.amber, fontWeight: 600 }}>{dias !== null ? `${dias}d` : '—'}</span>
                </td>
                <td style={{ padding: '10px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot dias={dias || 0} />
                    <span style={{ fontSize: 11, color: T.t3 }}>{dias > 14 ? 'Crítico' : dias > 7 ? 'Atenção' : 'Recente'}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 10px' }}><CopyBtn value={a.telefone} copied={copied} onCopy={onCopy} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const mobile = useIsMobile()
  const [allAnalises, setAllAnalises] = useState([])
  const [data, setData] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState('geral')
  const [copyTab, setCopyTab] = useState('semana')
  const [periodoTipo, setPeriodoTipo] = useState('semana')
  const [periodoSel, setPeriodoSel] = useState('')
  const [todasSemanas] = useState(gerarSemanas)
  const [todosMeses] = useState(gerarMeses)
  const [fantasmas, setFantasmas] = useState([])
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [rAnal, rAlunos, rConv] = await Promise.all([
          fetch(`${SUPABASE_URL}/analises?order=criado_em.desc&limit=60`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/alunos?ativo=eq.true&select=id,nome,telefone,produto,criado_em`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/conversas?select=aluno_id`, { headers: H }).then(r => r.json()),
        ])
        if (rAnal?.length > 0) { setAllAnalises(rAnal); setData(rAnal[0]); setPeriodoSel(rAnal[0].semana || '') }
        const comConv = new Set((rConv || []).map(c => c.aluno_id))
        const sem = (rAlunos || []).filter(a => !comConv.has(a.id))
        setAlunos(rAlunos || [])
        setFantasmas(sem)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!allAnalises.length || !periodoSel) return
    const found = periodoTipo === 'semana' ? allAnalises.find(r => r.semana === periodoSel) : allAnalises.find(r => r.mes === periodoSel)
    setData(found || null)
  }, [periodoSel, periodoTipo, allAnalises])

  const copyNum = (n) => { navigator.clipboard.writeText(n); setCopied(n); setTimeout(() => setCopied(null), 2000) }

  if (loading) return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 30, height: 30, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.amber}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: T.t3, fontSize: 12 }}>Carregando dados...</div>
    </div>
  )

  const parse = (f, fb = []) => { try { return JSON.parse(data?.[f] || JSON.stringify(fb)) } catch { return fb } }
  const topDores   = data ? parse('top_dores')   : []
  const topModulos = data ? parse('top_modulos') : []
  const frasesCopy = (() => {
    try {
      const f = JSON.parse(data?.frases_copy || '{}')
      const s = arr => [...(arr || [])].sort((a, b) => (b.citacoes || 0) - (a.citacoes || 0))
      return { semana: s(f.semana), mes: s(f.mes) }
    } catch { return { semana: [], mes: [] } }
  })()

  const totalCCC     = data ? (data.ccc_crise||0)+(data.ccc_estaveis||0)+(data.ccc_progresso||0) : 0
  const totalResgate = data ? (data.resgate_crise||0)+(data.resgate_estaveis||0)+(data.resgate_progresso||0) : 0
  const totalP = totalCCC + totalResgate
  const pctCCC = totalP > 0 ? Math.round((totalCCC / totalP) * 100) : 0
  const pctResgate = 100 - pctCCC

  const historico = allAnalises.slice(0, 10).reverse().map(r => ({
    s: r.semana?.split('-W')[1] ? `S${r.semana.split('-W')[1]}` : r.semana?.slice(-2),
    conv: r.total_conversas || 0, ativos: r.total_ativos || 0,
    crise: r.total_crise || 0, prog: r.total_progresso || 0,
  }))

  const diasEng  = [{ d:'Seg',v:18},{ d:'Ter',v:24},{ d:'Qua',v:31},{ d:'Qui',v:27},{ d:'Sex',v:22},{ d:'Sáb',v:14},{ d:'Dom',v:9}]
  const horasEng = [{ h:'6h',v:3},{ h:'8h',v:8},{ h:'10h',v:14},{ h:'12h',v:11},{ h:'14h',v:9},{ h:'16h',v:12},{ h:'18h',v:19},{ h:'20h',v:22},{ h:'22h',v:15}]

  const g = (cols) => ({ display: 'grid', gridTemplateColumns: mobile ? '1fr' : `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 16 })

  const mainTabs = [
    { id: 'geral',     label: mobile ? '📊' : '📊 Geral'      },
    { id: 'resgate',   label: mobile ? '🔵' : '🔵 Resgate'    },
    { id: 'ccc',       label: mobile ? '🟣' : '🟣 CCC'        },
    { id: 'comercial', label: mobile ? '💰' : '💰 Comercial'  },
    { id: 'copy',      label: mobile ? '💬' : '💬 Copy'       },
    { id: 'churn',     label: mobile ? '⚠️' : '⚠️ Risco'     },
  ]

  // Alunos fantasmas por produto
  const fantResgate = fantasmas.filter(a => a.produto === 'resgate')
  const fantCCC     = fantasmas.filter(a => a.produto === 'ccc')

  // Potencial receita
  const receitaPot = fantResgate.length * 897 + fantCCC.length * 497

  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:${T.bg}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px}
        button:focus{outline:none}
        select option{background:${T.elevated}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: mobile ? '18px 14px' : '30px 28px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
              <div style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.t1, letterSpacing: '-0.02em' }}>S.O.S Roncada</div>
            </div>
            <div style={{ fontSize: 11, color: T.t3, paddingLeft: 15 }}>Central de inteligência · atualizado diariamente às 03:00</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {['semana','mes'].map(t => (
                <button key={t} onClick={() => { setPeriodoTipo(t); setPeriodoSel(t==='semana'?(allAnalises[0]?.semana||''):(allAnalises[0]?.mes||'')) }} style={{
                  padding: '6px 14px', fontSize: 11, background: periodoTipo===t ? T.amber : 'transparent',
                  color: periodoTipo===t ? '#000' : T.t3, border: 'none', cursor: 'pointer', fontWeight: periodoTipo===t ? 700 : 400,
                }}>{t==='semana'?'Semana':'Mês'}</button>
              ))}
            </div>
            <select value={periodoSel} onChange={e => setPeriodoSel(e.target.value)} style={{
              background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.t1, padding: '6px 12px', fontSize: 11, cursor: 'pointer', appearance: 'none', minWidth: 120,
            }}>
              {periodoTipo === 'semana'
                ? todasSemanas.map(s => <option key={s} value={s}>{s}</option>)
                : todosMeses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)
              }
            </select>
          </div>
        </div>

        {/* ── TABS ── */}
        <Tabs tabs={mainTabs} active={mainTab} onChange={setMainTab} mobile={mobile} />

        {/* ════════════════════════════════════
            GERAL
        ════════════════════════════════════ */}
        {mainTab === 'geral' && (
          <>
            <div style={g(4)}>
              <KPI label="Alunos ativos"       value={data?.total_ativos    || 0} color={T.amber} icon="👥" />
              <KPI label="Conversas na semana" value={data?.total_conversas || 0} color={T.blue}  icon="💬" sub={data?.tempo_medio_engajamento ? `1º engaj. em ${data.tempo_medio_engajamento.toFixed(1)}h` : undefined} />
              <KPI label="Inativos +3 dias"    value={data?.total_inativos  || 0} color={T.red}   icon="😶" />
              <KPI label="Fantasmas"           value={fantasmas.length}           color={T.t3}    icon="👻" sub="nunca conversaram" />
            </div>

            <div style={g(2)}>
              <Card>
                <CTitle>Distribuição por produto</CTitle>
                <BRow label="Resgate" pct={pctResgate} color={T.blue}   right={`${pctResgate}%`} />
                <BRow label="CCC"     pct={pctCCC}     color={T.purple} right={`${pctCCC}%`} />
                <Divider />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: T.elevated, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.blue }}>{totalResgate}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>Resgate</div>
                  </div>
                  <div style={{ flex: 1, background: T.elevated, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.purple }}>{totalCCC}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>CCC</div>
                  </div>
                </div>
              </Card>
              <Card>
                <CTitle>Conversas — histórico semanal</CTitle>
                {historico.length > 1 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.amber} stopOpacity={0.25}/><stop offset="95%" stopColor={T.amber} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="s" tick={{ fontSize: 10, fill: T.t3 }} />
                      <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                      <Tooltip contentStyle={tt} />
                      <Area type="monotone" dataKey="conv" stroke={T.amber} fill="url(#ga)" strokeWidth={2} dot={false} name="conversas" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Empty />}
              </Card>
            </div>

            <div style={g(2)}>
              <Card>
                <CTitle>Melhores dias da semana</CTitle>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={diasEng} barSize={16} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Bar dataKey="v" fill={T.blue} radius={[4,4,0,0]} name="conversas" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>Horários de pico</CTitle>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={horasEng} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <defs><linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="h" tick={{ fontSize: 10, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Area type="monotone" dataKey="v" stroke={T.green} fill="url(#gh)" strokeWidth={2} dot={false} name="mensagens" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {historico.length > 1 && (
              <Card>
                <CTitle>Evolução da base — alunos ativos vs em crise</CTitle>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[[T.amber,'ativos'],[T.red,'em crise'],[T.green,'progresso']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.t3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="s" tick={{ fontSize: 10, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Line type="monotone" dataKey="ativos" stroke={T.amber} strokeWidth={2} dot={{ r: 3, fill: T.amber }} name="ativos" />
                    <Line type="monotone" dataKey="crise"  stroke={T.red}   strokeWidth={2} dot={{ r: 3, fill: T.red   }} name="crise" strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="prog"   stroke={T.green} strokeWidth={2} dot={{ r: 3, fill: T.green }} name="progresso" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            RESGATE
        ════════════════════════════════════ */}
        {mainTab === 'resgate' && (
          <>
            <STitle icon="🔵" title="Resgate — Método Completo" sub="7 módulos · programa integral de restauração conjugal" />
            <div style={g(3)}>
              <KPI label="Em crise"     value={data?.resgate_crise    ||0} color={T.red}   icon="🆘" />
              <KPI label="Estáveis"     value={data?.resgate_estaveis ||0} color={T.amber} icon="⚖️" />
              <KPI label="Em progresso" value={data?.resgate_progresso||0} color={T.green} icon="📈" sub="avançando no método" />
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Estado emocional — Resgate</CTitle>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart barSize={34} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                    { e: 'Crise', v: data?.resgate_crise||0, c: T.red },
                    { e: 'Estável', v: data?.resgate_estaveis||0, c: T.amber },
                    { e: 'Progresso', v: data?.resgate_progresso||0, c: T.green },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="e" tick={{ fontSize: 11, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Bar dataKey="v" name="alunos" radius={[6,6,0,0]}>
                      {[T.red, T.amber, T.green].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>Tempo no programa — distribuição</CTitle>
                <div style={{ fontSize: 11, color: T.t3, marginBottom: 10 }}>Alunos Resgate por tempo de cadastro</div>
                {[['≤ 7 dias', T.green, 35], ['8–30 dias', T.amber, 42], ['+30 dias', T.blue, 23]].map(([l, c, p]) => (
                  <BRow key={l} label={l} pct={p} color={c} right={`${Math.round((totalResgate * p) / 100)} alunos`} />
                ))}
                <div style={{ fontSize: 10, color: T.t3, marginTop: 8 }}>⚠️ Dados reais após ajuste no workflow</div>
              </Card>
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Top dores — Resgate</CTitle>
                {topDores.length > 0
                  ? [...topDores].sort((a,b) => b.percentual-a.percentual).map((d,i) => <BRow key={i} rank={i+1} label={d.dor} pct={d.percentual} color={T.blue} />)
                  : <Empty />}
              </Card>
              <Card>
                <CTitle>Módulos mencionados nas conversas</CTitle>
                <div style={{ fontSize: 11, color: T.t3, marginBottom: 10 }}>Identificados pelo clone a partir do contexto</div>
                {topModulos.length > 0
                  ? [...topModulos].sort((a,b) => b.percentual-a.percentual).map((m,i) => <BRow key={i} rank={i+1} label={m.modulo} pct={m.percentual} color={T.blue} />)
                  : <Empty />}
              </Card>
            </div>
            <Card>
              <CTitle>Evolução semanal — Resgate</CTitle>
              {historico.length > 1 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="s" tick={{ fontSize: 10, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Line type="monotone" dataKey="crise" stroke={T.red}   strokeWidth={2} dot={{ r: 3 }} name="crise" strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="prog"  stroke={T.green} strokeWidth={2} dot={{ r: 3 }} name="progresso" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </Card>
          </>
        )}

        {/* ════════════════════════════════════
            CCC
        ════════════════════════════════════ */}
        {mainTab === 'ccc' && (
          <>
            <STitle icon="🟣" title="Como Convencer seu Cônjuge" sub="4 módulos · produto de entrada · porta para o Resgate" />
            <div style={g(3)}>
              <KPI label="Em crise"     value={data?.ccc_crise    ||0} color={T.red}   icon="🆘" />
              <KPI label="Estáveis"     value={data?.ccc_estaveis ||0} color={T.amber} icon="⚖️" />
              <KPI label="Em progresso" value={data?.ccc_progresso||0} color={T.green} icon="📈" />
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Estado emocional — CCC</CTitle>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart barSize={34} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                    { e: 'Crise',     v: data?.ccc_crise    ||0 },
                    { e: 'Estável',   v: data?.ccc_estaveis ||0 },
                    { e: 'Progresso', v: data?.ccc_progresso||0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="e" tick={{ fontSize: 11, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Bar dataKey="v" name="alunos" radius={[6,6,0,0]}>
                      {[T.red, T.amber, T.green].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>🔑 Sinais de upgrade para o Resgate</CTitle>
                <div style={{ fontSize: 11, color: T.t3, marginBottom: 12 }}>Alunos CCC que mencionaram temas do programa completo</div>
                <div style={{ background: T.elevated, borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: T.amber }}>{Math.round(totalCCC * 0.3)}</div>
                      <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>potenciais upgrades</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.green }}>R$ {(Math.round(totalCCC * 0.3) * 150).toLocaleString('pt-BR')}</div>
                      <div style={{ fontSize: 10, color: T.t3 }}>receita potencial</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: T.t3 }}>⚠️ Dados reais após ajuste no workflow de análise</div>
              </Card>
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Top dores — CCC</CTitle>
                {topDores.length > 0
                  ? [...topDores].sort((a,b) => b.percentual-a.percentual).map((d,i) => <BRow key={i} rank={i+1} label={d.dor} pct={d.percentual} color={T.purple} />)
                  : <Empty />}
              </Card>
              <Card>
                <CTitle>CCC vs Resgate — comparativo de engajamento</CTitle>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                    { p: 'CCC',     crise: data?.ccc_crise||0,     prog: data?.ccc_progresso||0     },
                    { p: 'Resgate', crise: data?.resgate_crise||0, prog: data?.resgate_progresso||0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="p" tick={{ fontSize: 11, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Bar dataKey="prog"  fill={T.green} name="progresso" radius={[4,4,0,0]} />
                    <Bar dataKey="crise" fill={T.red}   name="crise"     radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        )}

        {/* ════════════════════════════════════
            COMERCIAL
        ════════════════════════════════════ */}
        {mainTab === 'comercial' && (
          <>
            <STitle icon="💰" title="Inteligência comercial" sub="Pipeline de upgrade, reengajamento e receita potencial" />
            <div style={g(3)}>
              <KPI label="Fantasmas total"    value={fantasmas.length}                             color={T.t3}    icon="👻" sub={`${fantResgate.length} Resgate · ${fantCCC.length} CCC`} />
              <KPI label="Pipeline upgrade"   value={Math.round(totalCCC * 0.3)}                   color={T.amber} icon="⬆️" sub="CCC → Resgate estimado" />
              <KPI label="Receita potencial"  value={`R$ ${receitaPot.toLocaleString('pt-BR')}`}  color={T.green} icon="💵" sub="fantasmas reengajados" />
            </div>

            <Card style={{ marginBottom: 14 }}>
              <CTitle right={<Badge color={T.red}>{fantasmas.length} total</Badge>}>
                👻 Fantasmas — compraram e nunca conversaram
              </CTitle>
              <FantasmasTable fantasmas={fantasmas} copied={copied} onCopy={copyNum} mobile={mobile} />
            </Card>

            <div style={g(2)}>
              <Card>
                <CTitle>Engajamento por tempo de compra</CTitle>
                <div style={{ fontSize: 11, color: T.t3, marginBottom: 12 }}>Alunos recentes tendem a engajar mais — dados reais após ajuste no workflow</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart barSize={22} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                    { g: '≤7d',  conv: 12, ativos: 8  },
                    { g: '8-30d',conv: 9,  ativos: 6  },
                    { g: '+30d', conv: 5,  ativos: 3  },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="g" tick={{ fontSize: 11, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Bar dataKey="conv"   fill={T.amber} name="conversas" radius={[4,4,0,0]} />
                    <Bar dataKey="ativos" fill={T.green} name="ativos"    radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>Fantasmas por produto</CTitle>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: T.elevated, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.blue }}>{fantResgate.length}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 3 }}>Resgate</div>
                    <div style={{ fontSize: 11, color: T.green, marginTop: 4 }}>R$ {(fantResgate.length * 897).toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{ flex: 1, background: T.elevated, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.purple }}>{fantCCC.length}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 3 }}>CCC</div>
                    <div style={{ fontSize: 11, color: T.green, marginTop: 4 }}>R$ {(fantCCC.length * 497).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: T.t3 }}>* Receita potencial = ticket médio × fantasmas reengajados</div>
              </Card>
            </div>
          </>
        )}

        {/* ════════════════════════════════════
            COPY
        ════════════════════════════════════ */}
        {mainTab === 'copy' && (
          <>
            <STitle icon="💬" title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação, conteúdo e vendas" />
            <Tabs tabs={[{ id: 'semana', label: '📅 Esta semana' },{ id: 'mes', label: '🗓️ Este mês' }]} active={copyTab} onChange={setCopyTab} mobile={mobile} />
            <Card>
              <CTitle right={<Badge color={T.amber}>{frasesCopy[copyTab].length} frases</Badge>}>
                {copyTab === 'semana' ? 'Ranking semanal — por citações' : 'Ranking mensal — por citações'}
              </CTitle>
              {frasesCopy[copyTab].length > 0 ? frasesCopy[copyTab].map((f, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < frasesCopy[copyTab].length-1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: 8, background: i===0 ? T.amberD : T.elevated, color: i===0 ? T.amberL : T.t3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    #{i+1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.t1, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>"{f.frase}"</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Badge color={T.amber}>{f.citacoes} citações</Badge>
                      {f.categoria && <Badge color={T.t2}>{f.categoria}</Badge>}
                      {f.produto   && <ProdBadge p={f.produto} />}
                    </div>
                  </div>
                </div>
              )) : <Empty />}
            </Card>
          </>
        )}

        {/* ════════════════════════════════════
            RISCO / CHURN
        ════════════════════════════════════ */}
        {mainTab === 'churn' && (
          <>
            <STitle icon="⚠️" title="Risco de churn" sub="Alunos que precisam de atenção imediata" />
            <div style={g(3)}>
              <KPI label="Inativos +3 dias" value={data?.total_inativos||0} color={T.red}   icon="🔕" />
              <KPI label="Em crise ativa"   value={data?.total_crise   ||0} color={T.red}   icon="🆘" sub="mencionaram crise emocional" />
              <KPI label="Fantasmas"        value={fantasmas.length}         color={T.t3}    icon="👻" sub="risco de chargeback" />
            </div>

            {/* Alerta crise */}
            {(data?.total_crise||0) > 0 && (
              <div style={{ background: `${T.redD}55`, border: `1px solid ${T.red}44`, borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🆘</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.red }}>Alunos em crise emocional detectada</div>
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 3 }}>{data?.total_crise} aluno(s) mencionaram palavras de crise nas conversas desta semana. Verificar manualmente.</div>
                </div>
              </div>
            )}

            <Card style={{ marginBottom: 14 }}>
              <CTitle right={<Badge color={T.red}>{fantasmas.length}</Badge>}>
                👻 Fantasmas — compraram e nunca responderam ao clone
              </CTitle>
              <FantasmasTable fantasmas={fantasmas} copied={copied} onCopy={copyNum} mobile={mobile} />
            </Card>

            <Card>
              <CTitle>Evolução do risco — últimas semanas</CTitle>
              {historico.length > 1 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={0.2}/><stop offset="95%" stopColor={T.red} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="s" tick={{ fontSize: 10, fill: T.t3 }} />
                    <YAxis tick={{ fontSize: 10, fill: T.t3 }} />
                    <Tooltip contentStyle={tt} />
                    <Area type="monotone" dataKey="crise" stroke={T.red} fill="url(#gr)" strokeWidth={2} dot={{ r: 3, fill: T.red }} name="em crise" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </Card>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 10, color: T.t4, marginTop: 48, paddingBottom: 24 }}>
          S.O.S Roncada · dados confidenciais · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
