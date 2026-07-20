import React, { useEffect, useState, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts'
import {
  LayoutDashboard, LifeBuoy, HeartHandshake, Activity, MessageSquareQuote,
  AlertTriangle, Wallet, Search, Users, MessageSquare, UserX, Scale,
  TrendingUp, Users2, BellOff, TrendingDown, CreditCard, BarChart3,
  Landmark, CalendarDays, CalendarRange, Bell, UserSearch, SearchX,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Kpi, SectionCard, SectionTitle, ProgressRow, Pill, ProductBadge,
  EmptyState, CopyPhoneButton, DataTable, DiagnosticoBox, tooltipStyle,
} from '@/components/dashboard/dashboard-ui'
import { SidebarToggle, Sidebar } from '@/components/dashboard/sidebar'
import { C } from '@/lib/chart-colors'
import { extrairPalavrasChave } from '@/lib/keywords'
import { supabase, DIAGNOSTICAR_WEBHOOK, NOTIFICAR_LIBERADO_WEBHOOK } from '@/lib/supabase'

const SUPABASE_URL = 'https://bnkesshzstryzfoipres.supabase.co/rest/v1'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'
const H = { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }

// Provedor ativo desde 2026-07-19: Gemini 3.5 Flash (migração emergencial, conta Anthropic sem crédito)
// Preço oficial Gemini 3.5 Flash — $1.50/MTok input + $9.00/MTok output (raciocínio incluso na saída)
// Billing pré-pago ativado em 2026-07-19 (mesmo dia) — consumo real passou a ser debitado do saldo.
// Estimativa calibrada com tráfego real medido nesta sessão: com cache quente (uso concorrente, que
// é o padrão real de tráfego aqui) o custo médio ficou em ~US$0,0113/msg; sem cache, ~US$0,0168/msg.
// Usamos a média entre os dois cenários, já que a proporção real de cache hit/miss varia com o
// volume simultâneo de alunos e não dá pra cravar sem dado de billing real vindo do Google.
const CUSTO_CONV_USD = 0.0140
// Histórico congelado da conta Anthropic (provedor anterior, migração em 2026-07-19) — não muda mais,
// por isso fica fixo no código em vez de puxar de uma tabela que não é mais atualizada por esse provedor.
const ANTHROPIC_HISTORICO = {
  saldo_final_usd: 5.87,
  custo_total_usd: 34.18,
  total_depositado_usd: 39.68,
  congelado_em: '2026-07-18T19:38:50-03:00',
}

// o Supabase (PostgREST) limita cada request a no máximo 1000 linhas por padrão,
// mesmo se a gente pedir um limit maior — por isso pagina até acabar.
async function fetchAllPages(url) {
  const PAGE = 1000
  let offset = 0
  let all = []
  while (true) {
    const sep = url.includes('?') ? '&' : '?'
    const r = await fetch(`${url}${sep}offset=${offset}&limit=${PAGE}`, { headers: H })
    const page = await r.json()
    if (!Array.isArray(page) || page.length === 0) break
    all = all.concat(page)
    if (page.length < PAGE) break
    offset += PAGE
  }
  return all
}

async function getUSDtoBRL() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const d = await r.json()
    return parseFloat(d.USDBRL.bid)
  } catch { return 5.70 }
}

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 640)
  useEffect(() => { const fn = () => setM(window.innerWidth < 640); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return m
}

// Brasília = UTC-3 fixo (sem horário de verão desde 2019)
function paraDataBrasilia(isoStr) {
  if (!isoStr) return null
  const d = new Date(isoStr)
  d.setHours(d.getHours() - 3)
  return d.toISOString().split('T')[0]
}
function inicioDiaBrasiliaParaUTC(diaStr) {
  // diaStr = "YYYY-MM-DD" em horário de Brasília -> retorna Date do instante 00:00 Brasília em UTC
  const [y, m, d] = diaStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0))
}
function hojeBrasiliaStr() {
  const agora = new Date()
  agora.setHours(agora.getHours() - 3)
  return agora.toISOString().split('T')[0]
}

const mainTabsDef = [
  { id: 'geral', icon: LayoutDashboard, label: 'Geral' },
  { id: 'resgate', icon: LifeBuoy, label: 'Resgate' },
  { id: 'ccc', icon: HeartHandshake, label: 'CCC' },
  { id: 'comercial', icon: Activity, label: 'Operação' },
  { id: 'copy', icon: MessageSquareQuote, label: 'Copy' },
  { id: 'churn', icon: AlertTriangle, label: 'Risco' },
  { id: 'custo', icon: Wallet, label: 'Custo' },
  { id: 'inspecao', icon: Search, label: 'Inspeção' },
]

export default function App() {
  const mobile = useIsMobile()
  const [allAnalises, setAllAnalises] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState('geral')
  const [copyTab, setCopyTab] = useState('semana')
  const [copyBusca, setCopyBusca] = useState('')
  const [fantasmas, setFantasmas] = useState([])
  const [alunosSemProgresso, setAlunosSemProgresso] = useState([])
  const [copied, setCopied] = useState(null)
  const [usdBrl, setUsdBrl] = useState(5.70)
  const [diaSel, setDiaSel] = useState(null)
  const [alunosAtivos, setAlunosAtivos] = useState([])
  const [convPorAluno, setConvPorAluno] = useState({})
  const [revisoes, setRevisoes] = useState([])
  const [revisaoFiltro, setRevisaoFiltro] = useState('pendente')
  const [todasConversas, setTodasConversas] = useState([])
  const [periodoModo, setPeriodoModo] = useState('7dias') // 'hoje' | '7dias' | 'personalizado'
  const [rangeInicio, setRangeInicio] = useState('')
  const [rangeFim, setRangeFim] = useState('')
  const [diagnosticando, setDiagnosticando] = useState({})
  const [linkForms, setLinkForms] = useState({})
  const [linkSalvando, setLinkSalvando] = useState({})
  const [live, setLive] = useState(false)
  const [saldo, setSaldo] = useState(null)
  const [editandoSaldo, setEditandoSaldo] = useState(false)
  const [saldoForm, setSaldoForm] = useState({})
  const [salvandoSaldo, setSalvandoSaldo] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const reloadTimer = useRef(null)

  const data = allAnalises[0] || null // última análise qualitativa (crise/dores/módulos) — sempre a mais recente

  async function load() {
    try {
      const cambio = await getUSDtoBRL()
      setUsdBrl(cambio)

      const [rAnal, rAlunos, rConvAll, rRevisoes, rSaldo] = await Promise.all([
        fetch(`${SUPABASE_URL}/analises?order=criado_em.desc&limit=60`, { headers: H }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/alunos?ativo=eq.true&select=id,nome,telefone,produto,criado_em`, { headers: H }).then(r => r.json()),
        fetchAllPages(`${SUPABASE_URL}/conversas?select=aluno_id,telefone,role,mensagem,criado_em&order=criado_em.asc`),
        fetch(`${SUPABASE_URL}/revisoes_pendentes?order=criado_em.desc&limit=300`, { headers: H }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/saldo_claude?id=eq.1`, { headers: H }).then(r => r.json()),
      ])
      setSaldo((rSaldo || [])[0] || null)

      const analises = (rAnal || []).filter(r => (r.total_ativos || 0) > 0)
      setAllAnalises(analises)

      const alunosArr = rAlunos || []
      const convArr = rConvAll || []
      setAlunos(alunosArr)
      setTodasConversas(convArr)

      // "ativo" exige mensagem role=user de verdade — só ter recebido uma mensagem automática
      // (ex: boas-vindas) não conta como engajamento real
      const comMensagemReal = new Set(convArr.filter(c => c.role === 'user').map(c => c.aluno_id))
      setFantasmas(alunosArr.filter(a => !comMensagemReal.has(a.id)))

      // mensagens reais (role=user) por aluno — base única usada em todo o resto dos cálculos,
      // pra "ativo", "média" e "ranking" nunca divergirem entre si por usarem contagens diferentes
      const porAluno = {}
      convArr.filter(c => c.role === 'user').forEach(c => {
        if (c.aluno_id) porAluno[c.aluno_id] = (porAluno[c.aluno_id] || 0) + 1
      })
      const totalConvUser = convArr.filter(c => c.role === 'user').length
      const mediaConvAluno = comMensagemReal.size > 0 ? totalConvUser / comMensagemReal.size : 5

      setAlunosSemProgresso(alunosArr.filter(a => {
        const dias = a.criado_em ? Math.floor((Date.now() - new Date(a.criado_em)) / 86400000) : 0
        const msgs = porAluno[a.id] || 0
        return dias > 7 && comMensagemReal.has(a.id) && msgs < (mediaConvAluno * 0.3)
      }))

      setConvPorAluno(porAluno)
      setAlunosAtivos(alunosArr.filter(a => comMensagemReal.has(a.id)))

      // auto-resolver falhas técnicas que já sumiram sozinhas: se o mesmo telefone teve
      // uma mensagem depois da falha registrada, o problema provavelmente já foi superado
      const pendentesFalhas = (rRevisoes || []).filter(r => r.tipo === 'falha_tecnica' && r.status === 'pendente' && r.telefone)
      const paraAutoResolver = pendentesFalhas.filter(r => {
        return convArr.some(c => c.telefone && (c.telefone === r.telefone || `+${c.telefone}` === r.telefone) && new Date(c.criado_em) > new Date(r.criado_em))
      })
      if (paraAutoResolver.length > 0) {
        await Promise.all(paraAutoResolver.map(r =>
          fetch(`${SUPABASE_URL}/revisoes_pendentes?id=eq.${r.id}`, {
            method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: 'resolvido', resolvido_em: new Date().toISOString() })
          }).catch(() => {})
        ))
        const idsResolvidos = new Set(paraAutoResolver.map(r => r.id))
        setRevisoes((rRevisoes || []).map(r => idsResolvidos.has(r.id) ? { ...r, status: 'resolvido' } : r))
      } else {
        setRevisoes(rRevisoes || [])
      }

    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const hoje = hojeBrasiliaStr()
    setRangeFim(hoje)
    const d = new Date(hoje); d.setDate(d.getDate() - 6)
    setRangeInicio(d.toISOString().split('T')[0])
  }, [])

  // tempo real: qualquer mudança nas tabelas relevantes recarrega os dados (com debounce)
  useEffect(() => {
    const agendar = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
      reloadTimer.current = setTimeout(() => load(), 1500)
    }
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revisoes_pendentes' }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, agendar)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel); if (reloadTimer.current) clearTimeout(reloadTimer.current) }
  }, [])

  const copyNum = (n) => { navigator.clipboard.writeText(n); setCopied(n); setTimeout(() => setCopied(null), 2000) }

  async function marcarResolvido(id) {
    setRevisoes(prev => prev.map(r => r.id === id ? { ...r, status: 'resolvido' } : r))
    try {
      await fetch(`${SUPABASE_URL}/revisoes_pendentes?id=eq.${id}`, {
        method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'resolvido', resolvido_em: new Date().toISOString() })
      })
    } catch (e) { console.error(e) }
  }

  async function diagnosticar(r) {
    setDiagnosticando(prev => ({ ...prev, [r.id]: true }))
    try {
      const resp = await fetch(DIAGNOSTICAR_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, tipo: r.tipo, workflow: r.workflow, node: r.node, detalhe: r.detalhe, execution_id: r.execution_id, telefone: r.telefone, nome: r.nome, email: r.email })
      })
      const json = await resp.json()
      setRevisoes(prev => prev.map(x => x.id === r.id ? { ...x, diagnostico: json.diagnostico } : x))
    } catch (e) { console.error(e) }
    finally { setDiagnosticando(prev => ({ ...prev, [r.id]: false })) }
  }

  function updateLinkForm(id, field, value) {
    setLinkForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function vincularAluno(r) {
    const form = linkForms[r.id] || {}
    if (!form.nome || !form.email) return
    setLinkSalvando(prev => ({ ...prev, [r.id]: true }))
    try {
      const telefone = (form.telefone || r.telefone || '').trim()
      const telefoneComDDI = telefone.startsWith('+') ? telefone : `+${telefone}`
      await fetch(`${SUPABASE_URL}/alunos`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nome: form.nome, email: form.email, telefone: telefoneComDDI, produto: form.produto || 'resgate', ativo: true })
      })
      fetch(NOTIFICAR_LIBERADO_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneComDDI, nome: form.nome })
      }).catch(() => {})
      await marcarResolvido(r.id)
    } catch (e) { console.error(e) }
    finally { setLinkSalvando(prev => ({ ...prev, [r.id]: false })) }
  }

  function abrirEdicaoSaldo() {
    setSaldoForm({
      saldo_atual_usd: saldo?.saldo_atual_usd ?? 0,
      custo_total_usd: saldo?.custo_total_usd ?? 0,
      total_depositado_usd: saldo?.total_depositado_usd ?? 0,
    })
    setEditandoSaldo(true)
  }

  async function salvarSaldo() {
    setSalvandoSaldo(true)
    try {
      const body = {
        saldo_atual_usd: parseFloat(saldoForm.saldo_atual_usd) || 0,
        custo_total_usd: parseFloat(saldoForm.custo_total_usd) || 0,
        total_depositado_usd: parseFloat(saldoForm.total_depositado_usd) || 0,
        atualizado_em: new Date().toISOString(),
      }
      await fetch(`${SUPABASE_URL}/saldo_claude?id=eq.1`, {
        method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(body)
      })
      setSaldo(prev => ({ ...prev, ...body }))
      setEditandoSaldo(false)
    } catch (e) { console.error(e) }
    finally { setSalvandoSaldo(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-primary animate-spin" />
      <div className="text-muted-foreground text-xs">Carregando dados...</div>
    </div>
  )

  const parse = (f, fb = []) => { try { return JSON.parse(data?.[f] || JSON.stringify(fb)) } catch { return fb } }
  const topDores = data ? parse('top_dores') : []
  const topModulos = data ? parse('top_modulos') : []
  const frasesCopy = (() => {
    try {
      const f = JSON.parse(data?.frases_copy || '{}')
      const s = arr => [...(arr || [])]
        .sort((a, b) => (b.citacoes || 0) - (a.citacoes || 0))
        .map(item => ({ ...item, palavrasChave: extrairPalavrasChave(item.frase) }))
      return { semana: s(f.semana), mes: s(f.mes) }
    }
    catch { return { semana: [], mes: [] } }
  })()

  const copyBuscaNorm = copyBusca.trim().toLowerCase()
  const frasesCopyFiltradas = copyBuscaNorm
    ? frasesCopy[copyTab].filter(f =>
      f.frase.toLowerCase().includes(copyBuscaNorm) ||
      f.palavrasChave.some(k => k.toLowerCase().includes(copyBuscaNorm)) ||
      (f.categoria || '').toLowerCase().includes(copyBuscaNorm)
    )
    : frasesCopy[copyTab]

  const totalCCC = data ? (data.ccc_crise || 0) + (data.ccc_estaveis || 0) + (data.ccc_progresso || 0) : 0
  const totalResgate = data ? (data.resgate_crise || 0) + (data.resgate_estaveis || 0) + (data.resgate_progresso || 0) : 0
  const totalP = totalCCC + totalResgate
  const pctCCC = totalP > 0 ? Math.round((totalCCC / totalP) * 100) : 0
  const pctResgate = 100 - pctCCC

  // ── PERÍODO (live, calculado direto das conversas reais — não depende do batch das 03:00) ──
  const rangeDias = (() => {
    if (periodoModo === 'hoje') { const h = hojeBrasiliaStr(); return [h, h] }
    if (periodoModo === '7dias') { const h = hojeBrasiliaStr(); const d = new Date(h); d.setDate(d.getDate() - 6); return [d.toISOString().split('T')[0], h] }
    return [rangeInicio || hojeBrasiliaStr(), rangeFim || hojeBrasiliaStr()]
  })()
  const [rIni, rFim] = rangeDias
  const iniUTC = inicioDiaBrasiliaParaUTC(rIni)
  const fimUTC = new Date(inicioDiaBrasiliaParaUTC(rFim).getTime() + 24 * 3600 * 1000)

  const conversasNoPeriodo = todasConversas.filter(c => {
    const t = new Date(c.criado_em)
    return t >= iniUTC && t < fimUTC
  })
  const convPeriodo = conversasNoPeriodo.filter(c => c.role === 'user').length
  const alunosUnicosPeriodo = new Set(conversasNoPeriodo.filter(c => c.role === 'user').map(c => c.aluno_id)).size
  const custoUSD = convPeriodo * CUSTO_CONV_USD
  const custoBRL = custoUSD * usdBrl

  // saldo "ao vivo": a Anthropic não expõe saldo por API, então partimos do último
  // valor conferido manualmente (saldo.atualizado_em) e descontamos, em tempo real,
  // o consumo real registrado desde então — assim o número não fica parado/velho
  // entre uma conferência manual e outra.
  const gastosDesdeCheckpoint = saldo?.atualizado_em
    ? todasConversas.filter(c => c.role === 'user' && new Date(c.criado_em) > new Date(saldo.atualizado_em)).length * CUSTO_CONV_USD
    : 0
  const saldoAoVivo = (saldo?.saldo_atual_usd ?? 0) - gastosDesdeCheckpoint
  const custoTotalAoVivo = (saldo?.custo_total_usd ?? 0) + gastosDesdeCheckpoint

  // dias no período (pra gráfico diário) — limitado a 60 dias pra não pesar
  const listaDias = (() => {
    const dias = []
    let cursor = new Date(iniUTC)
    let guard = 0
    while (cursor < fimUTC && guard < 60) {
      dias.push(paraDataBrasilia(new Date(cursor.getTime() + 3 * 3600 * 1000).toISOString()))
      cursor = new Date(cursor.getTime() + 24 * 3600 * 1000)
      guard++
    }
    return dias
  })()
  const convDiarias = listaDias.map(dia => {
    const doDia = todasConversas.filter(c => c.role === 'user' && paraDataBrasilia(c.criado_em) === dia)
    return { dia: dia.slice(5), data: dia, total: doDia.length, unicos: new Set(doDia.map(c => c.aluno_id)).size }
  })

  const convPorAlunoMedia = alunosAtivos.length > 0 ? (todasConversas.filter(c => c.role === 'user').length / alunosAtivos.length) : 0
  const semanasNoMes = 4
  const baseAtivos = alunosAtivos.length
  const custoMesEstUSD = convPorAlunoMedia * baseAtivos * 4.3 * CUSTO_CONV_USD
  const custoMesEstBRL = custoMesEstUSD * usdBrl
  const baseProjecao = `${convPorAlunoMedia.toFixed(1)} conv/aluno/sem · ${baseAtivos} alunos realmente ativos (não a base total)`

  const projecoes = [
    { label: 'Ativos hoje', leads: baseAtivos },
    { label: '2x', leads: Math.round(baseAtivos * 2) },
    { label: '5x', leads: Math.round(baseAtivos * 5) },
    { label: '10x', leads: Math.round(baseAtivos * 10) },
  ].map(p => {
    const cSem = Math.round(convPorAlunoMedia * p.leads)
    const cMes = cSem * semanasNoMes
    const usdSem = cSem * CUSTO_CONV_USD
    const usdMes = cMes * CUSTO_CONV_USD
    return { ...p, conv: cSem, convMes: cMes, usdSem: usdSem.toFixed(2), brlSem: (usdSem * usdBrl).toFixed(2), usdMes: usdMes.toFixed(2), brlMes: (usdMes * usdBrl).toFixed(2) }
  })

  const historico = allAnalises.slice(0, 10).reverse().map(r => ({
    s: r.semana?.split('-W')[1] ? `S${r.semana.split('-W')[1]}` : r.semana?.slice(-2),
    conv: r.total_conversas || 0,
    ativos: r.total_ativos || 0,
    crise: r.total_crise || 0,
    prog: r.total_progresso || 0,
    custoUSD: parseFloat(((r.total_conversas || 0) * CUSTO_CONV_USD).toFixed(3)),
  }))

  const gridCols = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }
  const g = (cols) => `grid grid-cols-1 ${gridCols[cols]} gap-3.5 mb-4`

  const rankingAtivos = alunosAtivos
    .map(a => ({ ...a, msgs: convPorAluno[a.id] || 0 }))
    .sort((a, b) => b.msgs - a.msgs)
    .slice(0, 10)

  // contagem ao vivo por produto — direto das conversas reais, não depende do lote semanal de análise
  const resgateAtivosAoVivo = alunosAtivos.filter(a => a.produto === 'resgate').length
  const cccAtivosAoVivo = alunosAtivos.filter(a => a.produto === 'ccc').length

  const agora = Date.now()

  const revisoesVisiveis = revisoes.filter(r => revisaoFiltro === 'todas' ? true : r.status === revisaoFiltro)
  const totalPendentes = revisoes.filter(r => r.status === 'pendente').length
  const totalFalhas = revisoes.filter(r => r.tipo === 'falha_tecnica' && r.status === 'pendente').length
  const totalVerificacoes = revisoes.filter(r => r.tipo === 'verificacao_manual' && r.status === 'pendente').length

  const rotuloPeriodo = periodoModo === 'hoje' ? 'hoje' : periodoModo === '7dias' ? 'últimos 7 dias' : `${rIni} a ${rFim}`

  const tabAtualLabel = mainTabsDef.find(t => t.id === mainTab)?.label || ''

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tabs={mainTabsDef}
        activeTab={mainTab}
        onSelect={setMainTab}
        pendentesCount={totalPendentes}
      />
      <div className="max-w-[1080px] mx-auto px-3.5 py-5 md:px-7 md:py-8">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3.5">
          <div className="flex items-center gap-3">
            <SidebarToggle onClick={() => setSidebarOpen(true)} />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-[7px] h-[7px] rounded-full ${live ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-muted-foreground'}`} />
                <div className="text-lg md:text-[22px] font-bold tracking-tight text-foreground">S.O.S Roncada</div>
                {live && <Pill className="bg-green-500/15 text-green-400">ao vivo</Pill>}
              </div>
              <div className="text-[11px] text-muted-foreground pl-[15px]">{tabAtualLabel} · dados de volume/custo em tempo real</div>
            </div>
          </div>
        </div>

        {/* PERÍODO */}
        <div className="flex gap-2 items-center flex-wrap mb-5">
          <div className="flex bg-accent border border-border rounded-lg overflow-hidden">
            {[['hoje', 'Hoje'], ['7dias', 'Semana'], ['personalizado', 'Personalizado']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPeriodoModo(id)}
                className={`px-3.5 py-1.5 text-[11px] transition-colors ${periodoModo === id ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {periodoModo === 'personalizado' && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={rangeInicio} onChange={e => setRangeInicio(e.target.value)} className="h-8 w-[135px] text-[11px] bg-accent border-border" />
              <span className="text-muted-foreground text-xs">até</span>
              <Input type="date" value={rangeFim} onChange={e => setRangeFim(e.target.value)} className="h-8 w-[135px] text-[11px] bg-accent border-border" />
            </div>
          )}
          <span className="text-[11px] text-muted-foreground">período: {rotuloPeriodo}</span>
        </div>


        {/* ════ GERAL ════ */}
        {mainTab === 'geral' && (
          <>
            <div className={g(4)}>
              <Kpi label="Alunos ativos (real)" value={alunosAtivos.length} colorClass="bg-primary" icon={<Users className="w-5 h-5" />} sub={`de ${alunos.length} cadastrados`} />
              <Kpi label={`Conversas — ${rotuloPeriodo}`} value={convPeriodo} colorClass="bg-sky-500" icon={<MessageSquare className="w-5 h-5" />} sub={`${alunosUnicosPeriodo} alunos únicos`} />
              <Kpi label="Inativos +3 dias" value={data?.total_inativos || 0} colorClass="bg-red-500" icon={<UserX className="w-5 h-5" />} />
              <Kpi
                label={`Custo — ${rotuloPeriodo}`}
                value={`US$ ${custoUSD.toFixed(2)}`}
                colorClass="bg-muted-foreground"
                icon={<Wallet className="w-5 h-5" />}
                sub={`R$ ${custoBRL.toFixed(2)} · câmbio ${usdBrl.toFixed(2)}`}
              />
            </div>

            <div className={g(2)}>
              <SectionCard title="Distribuição por produto">
                <ProgressRow label="Resgate" pct={pctResgate} colorClass="bg-sky-500" right={`${pctResgate}%`} />
                <ProgressRow label="CCC" pct={pctCCC} colorClass="bg-purple-400" right={`${pctCCC}%`} />
                <div className="border-t border-border my-4" />
                <div className="flex gap-2.5">
                  <div className="flex-1 bg-accent rounded-lg p-2.5 text-center">
                    <div className="text-xl font-bold text-sky-500">{totalResgate}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Resgate</div>
                  </div>
                  <div className="flex-1 bg-accent rounded-lg p-2.5 text-center">
                    <div className="text-xl font-bold text-purple-400">{totalCCC}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">CCC</div>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Conversas — histórico semanal (análise em lote)">
                {historico.length > 1 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.primary} stopOpacity={0.25} /><stop offset="95%" stopColor={C.primary} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="s" tick={{ fontSize: 10, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="conv" stroke={C.primary} fill="url(#ga)" strokeWidth={2} dot={false} name="conversas" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </SectionCard>
            </div>

            <SectionCard
              className="mb-4"
              title={<>Mensagens por dia {diaSel && <span className="text-primary font-semibold">· {diaSel}</span>}</>}
              right={diaSel && <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => setDiaSel(null)}>Limpar</Button>}
            >
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias} barSize={mobile ? 14 : 20} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [v, 'mensagens']} />
                  <Bar dataKey="total" name="mensagens" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.primary : C.blue} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div className="mt-3 px-3.5 py-2.5 bg-accent rounded-lg text-xs text-muted-foreground">
                  <strong className="text-foreground">{diaSel}</strong> — {convDiarias.find(d => d.data === diaSel)?.total || 0} mensagens · {convDiarias.find(d => d.data === diaSel)?.unicos || 0} alunos únicos
                  <span className="ml-3">· Custo estimado: US$ {((convDiarias.find(d => d.data === diaSel)?.total || 0) * CUSTO_CONV_USD).toFixed(3)}</span>
                </div>
              )}
            </SectionCard>

            {historico.length > 1 && (
              <SectionCard title="Evolução da base (análise semanal em lote)">
                <div className="flex gap-4 mb-3 flex-wrap">
                  {[[C.primary, 'ativos'], [C.red, 'em crise'], [C.green, 'progresso']].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <div className="w-2 h-2 rounded-sm" style={{ background: c }} />{l}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="s" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="ativos" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} name="ativos" />
                    <Line type="monotone" dataKey="crise" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} name="crise" strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="prog" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} name="progresso" />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>
            )}
          </>
        )}

        {/* ════ RESGATE ════ */}
        {mainTab === 'resgate' && (
          <>
            <SectionTitle icon={<LifeBuoy />} title="Resgate — Método Completo" sub="7 módulos · programa integral de restauração conjugal" />
            <div className={g(4)}>
              <Kpi label="Alunos Resgate ativos (ao vivo)" value={resgateAtivosAoVivo} colorClass="bg-primary" icon={<Users className="w-5 h-5" />} sub="direto das conversas reais, não do lote semanal" />
              <Kpi label="Em crise" value={data?.resgate_crise || 0} colorClass="bg-red-500" icon={<AlertTriangle className="w-5 h-5" />} sub="última análise semanal" />
              <Kpi label="Estáveis" value={data?.resgate_estaveis || 0} colorClass="bg-primary" icon={<Scale className="w-5 h-5" />} sub="última análise semanal" />
              <Kpi label="Em progresso" value={data?.resgate_progresso || 0} colorClass="bg-green-500" icon={<TrendingUp className="w-5 h-5" />} sub="avançando no método" />
            </div>
            {totalResgate > 0 && resgateAtivosAoVivo > 0 && Math.abs(totalResgate - resgateAtivosAoVivo) > Math.max(3, resgateAtivosAoVivo * 0.25) && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 mb-4 text-[11px] text-muted-foreground">
                <strong className="text-amber-400">Atenção:</strong> a última análise semanal contabilizou {totalResgate} alunos Resgate, mas o número ao vivo agora é {resgateAtivosAoVivo} — diferença grande o suficiente pra valer conferir se o lote semanal está desatualizado.
              </div>
            )}
            <div className={g(2)}>
              <SectionCard title="Estado emocional — Resgate">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart barSize={34} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                    { e: 'Crise', v: data?.resgate_crise || 0 },
                    { e: 'Estável', v: data?.resgate_estaveis || 0 },
                    { e: 'Progresso', v: data?.resgate_progresso || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="e" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="v" name="alunos" radius={[6, 6, 0, 0]}>
                      {[C.red, C.amber, C.green].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
              <SectionCard title="Top dores — Resgate">
                {topDores.length > 0
                  ? [...topDores].sort((a, b) => b.percentual - a.percentual).map((d, i) => <ProgressRow key={i} rank={i + 1} label={d.dor} pct={d.percentual} colorClass="bg-sky-500" />)
                  : <EmptyState />}
              </SectionCard>
            </div>
            <SectionCard title="Módulos mencionados nas conversas">
              <div className="bg-accent rounded-lg px-3.5 py-2.5 mb-3.5 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Como interpretar:</strong> o clone identifica qual módulo é mais relevante para a dúvida do aluno e o menciona na resposta. Alta frequência de um módulo = muitos alunos com dúvidas daquele tema específico.
              </div>
              {topModulos.length > 0
                ? [...topModulos].sort((a, b) => b.percentual - a.percentual).map((m, i) => (
                  <div key={i} className="mb-3">
                    <ProgressRow rank={i + 1} label={m.modulo} pct={m.percentual} colorClass="bg-sky-500" />
                  </div>
                ))
                : <EmptyState />}
            </SectionCard>
          </>
        )}

        {/* ════ CCC ════ */}
        {mainTab === 'ccc' && (
          <>
            <SectionTitle icon={<HeartHandshake />} title="Como Convencer seu Cônjuge" sub="4 módulos · produto de entrada · porta para o Resgate" />
            <div className={g(3)}>
              <Kpi label="Em crise" value={data?.ccc_crise || 0} colorClass="bg-red-500" icon={<AlertTriangle className="w-5 h-5" />} />
              <Kpi label="Estáveis" value={data?.ccc_estaveis || 0} colorClass="bg-primary" icon={<Scale className="w-5 h-5" />} />
              <Kpi label="Em progresso" value={data?.ccc_progresso || 0} colorClass="bg-green-500" icon={<TrendingUp className="w-5 h-5" />} />
            </div>
            <div className={g(2)}>
              <SectionCard title="Estado emocional — CCC">
                {totalCCC > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart barSize={34} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} data={[
                      { e: 'Crise', v: data?.ccc_crise || 0 },
                      { e: 'Estável', v: data?.ccc_estaveis || 0 },
                      { e: 'Progresso', v: data?.ccc_progresso || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="e" tick={{ fontSize: 11, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="v" name="alunos" radius={[6, 6, 0, 0]}>
                        {[C.red, C.amber, C.green].map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState msg="Aguardando primeiros alunos CCC conversarem" />}
              </SectionCard>
              <SectionCard title="CCC — ao vivo">
                <div className="text-[11px] text-muted-foreground mb-3">Contagem real, direto das conversas — não depende do lote semanal de análise</div>
                <div className="bg-accent rounded-lg px-3.5 py-3 mb-2.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xl font-bold text-primary">{cccAtivosAoVivo}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">alunos CCC ativos agora</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">{totalCCC}</div>
                      <div className="text-[10px] text-muted-foreground">na última análise semanal</div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
            <SectionCard title="Top dores — CCC">
              {totalCCC > 0
                ? (topDores.length > 0
                  ? [...topDores].sort((a, b) => b.percentual - a.percentual).map((d, i) => <ProgressRow key={i} rank={i + 1} label={d.dor} pct={d.percentual} colorClass="bg-purple-400" />)
                  : <EmptyState />)
                : <EmptyState msg="Aguardando primeiros alunos CCC — dados aparecerão quando houver conversas deste produto" />}
            </SectionCard>
          </>
        )}

        {/* ════ OPERAÇÃO ════ */}
        {mainTab === 'comercial' && (
          <>
            <SectionTitle icon={<Activity />} title="Central de operação" sub="Engajamento, alunos ativos e reengajamento" />

            <div className={g(3)}>
              <Kpi label="Alunos ativos (conversaram)" value={alunosAtivos.length} colorClass="bg-primary" icon={<Users className="w-5 h-5" />} sub={`de ${alunos.length} cadastrados no total`} />
              <Kpi label={`Alunos únicos — ${rotuloPeriodo}`} value={alunosUnicosPeriodo} colorClass="bg-sky-500" icon={<Users2 className="w-5 h-5" />} />
              <Kpi label={`Mensagens — ${rotuloPeriodo}`} value={convPeriodo} colorClass="bg-purple-400" icon={<MessageSquare className="w-5 h-5" />} />
            </div>

            <SectionCard className="mb-4" title="Alunos únicos por dia — engajamento real">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={convDiarias} barSize={mobile ? 12 : 18} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === 'unicos' ? 'alunos únicos' : 'mensagens']} />
                  <Bar dataKey="unicos" name="unicos" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.primary : C.green} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div className="mt-2.5 px-3 py-2 bg-accent rounded-lg text-xs text-muted-foreground">
                  <strong className="text-foreground">{diaSel}</strong> — {convDiarias.find(d => d.data === diaSel)?.unicos || 0} alunos únicos · {convDiarias.find(d => d.data === diaSel)?.total || 0} mensagens
                </div>
              )}
            </SectionCard>

            <SectionCard className="mb-4" title="Alunos mais ativos — total de mensagens" right={<Pill className="bg-primary/15 text-primary">{rankingAtivos.length} alunos</Pill>}>
              {rankingAtivos.length > 0 ? (
                <DataTable headers={['#', 'Nome', 'Produto', 'Mensagens', 'Telefone']}>
                  {rankingAtivos.map((a, i) => (
                    <tr key={i} className={`border-b border-border ${i === 0 ? 'bg-primary/5' : ''}`}>
                      <td className={`px-2.5 py-2.5 font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>#{i + 1}</td>
                      <td className="px-2.5 py-2.5 text-foreground font-medium">{a.nome || '—'}</td>
                      <td className="px-2.5 py-2.5"><ProductBadge p={a.produto} /></td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-[5px] bg-border rounded-full overflow-hidden" style={{ width: 60 }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min((a.msgs / (rankingAtivos[0]?.msgs || 1)) * 100, 100)}%`, background: i === 0 ? C.primary : C.blue }} />
                          </div>
                          <span className="text-foreground font-semibold">{a.msgs}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-muted-foreground font-mono text-[11px]">{a.telefone}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : <EmptyState />}
            </SectionCard>

            <SectionCard title="Reengajamento — inativos para contato" right={<Pill className="bg-red-500/15 text-red-400">{data?.total_inativos || 0} inativos</Pill>}>
              <div className="text-[11px] text-muted-foreground mb-3">Alunos que podem precisar de uma mensagem manual do Pedro</div>
              {fantasmas.length > 0 || (data?.total_inativos || 0) > 0 ? (
                <DataTable headers={['Nome', 'Produto', 'Telefone', 'Status', 'Ação']}>
                  {[...fantasmas, ...alunos.filter(a => !fantasmas.find(f => f.id === a.id)).filter(a => {
                    const dias = a.criado_em ? Math.floor((agora - new Date(a.criado_em)) / 86400000) : 0
                    return dias > 3 && !convPorAluno[a.id]
                  })].slice(0, 15).map((a, i) => {
                    const isFantasma = fantasmas.find(f => f.id === a.id)
                    return (
                      <tr key={i} className="border-b border-border">
                        <td className="px-2.5 py-2.5 text-foreground font-medium">{a.nome || '—'}</td>
                        <td className="px-2.5 py-2.5"><ProductBadge p={a.produto} /></td>
                        <td className="px-2.5 py-2.5 text-muted-foreground font-mono text-[11px]">{a.telefone}</td>
                        <td className="px-2.5 py-2.5"><Pill className={isFantasma ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'}>{isFantasma ? 'nunca conversou' : 'inativo'}</Pill></td>
                        <td className="px-2.5 py-2.5"><CopyPhoneButton value={a.telefone} copied={copied} onCopy={copyNum} /></td>
                      </tr>
                    )
                  })}
                </DataTable>
              ) : <EmptyState msg="Todos os alunos estão engajados" />}
            </SectionCard>
          </>
        )}

        {/* ════ COPY ════ */}
        {mainTab === 'copy' && (
          <>
            <SectionTitle icon={<MessageSquareQuote />} title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação, conteúdo e vendas" />
            <Tabs value={copyTab} onValueChange={setCopyTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="semana" className="text-xs">Esta semana</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs">Este mês</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative mb-4">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por palavra-chave, tema ou trecho da frase..."
                className="h-9 text-xs bg-accent border-border pl-8 pr-8"
                value={copyBusca}
                onChange={e => setCopyBusca(e.target.value)}
              />
              {copyBusca && (
                <button onClick={() => setCopyBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <SearchX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <SectionCard
              title={copyTab === 'semana' ? 'Ranking semanal — por citações' : 'Ranking mensal — por citações'}
              right={<Pill className="bg-primary/15 text-primary">{frasesCopyFiltradas.length} de {frasesCopy[copyTab].length} frases</Pill>}
            >
              {frasesCopyFiltradas.length > 0 ? frasesCopyFiltradas.map((f, i) => (
                <div key={i} className={`py-3.5 flex gap-3.5 items-start ${i < frasesCopyFiltradas.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className={`min-w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-primary/20 text-primary' : 'bg-accent text-muted-foreground'}`}>#{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-[13px] text-foreground leading-relaxed italic mb-2">"{f.frase}"</div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Pill className="bg-primary/15 text-primary">{f.citacoes} citações</Pill>
                      {f.categoria && <Pill className="bg-muted text-muted-foreground">{f.categoria}</Pill>}
                      {f.produto && <ProductBadge p={f.produto} />}
                      {f.palavrasChave.map((k, ki) => (
                        <Pill key={ki} className="bg-sky-500/15 text-sky-400">#{k}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
              )) : <EmptyState msg={copyBusca ? 'Nenhuma frase bate com essa busca' : undefined} />}
            </SectionCard>
          </>
        )}

        {/* ════ RISCO ════ */}
        {mainTab === 'churn' && (
          <>
            <SectionTitle icon={<AlertTriangle />} title="Risco de churn" sub="Alunos que precisam de atenção imediata" />
            <div className={g(3)}>
              <Kpi label="Inativos +3 dias" value={data?.total_inativos || 0} colorClass="bg-red-500" icon={<BellOff className="w-5 h-5" />} />
              <Kpi label="Em crise ativa" value={data?.total_crise || 0} colorClass="bg-red-500" icon={<AlertTriangle className="w-5 h-5" />} sub="mencionaram crise emocional" />
              <Kpi label="Sem progresso +7d" value={alunosSemProgresso.length} colorClass="bg-primary" icon={<TrendingDown className="w-5 h-5" />} sub="ativos há +7 dias" />
            </div>
            {(data?.total_crise || 0) > 0 && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl px-4.5 py-3.5 mb-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-red-400">Alunos em crise emocional detectada</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{data?.total_crise} aluno(s) mencionaram palavras de crise nas conversas desta semana. Verificar manualmente.</div>
                </div>
              </div>
            )}
            <SectionCard className="mb-4" title="Alunos sem progresso — ativos há +7 dias" right={<Pill className="bg-primary/15 text-primary">{alunosSemProgresso.length}</Pill>}>
              {alunosSemProgresso.length > 0 ? (
                <DataTable headers={['Nome', 'Produto', 'Telefone', 'Dias ativo', 'Ação']}>
                  {alunosSemProgresso.map((a, i) => {
                    const dias = a.criado_em ? Math.floor((agora - new Date(a.criado_em)) / 86400000) : null
                    return (
                      <tr key={i} className="border-b border-border">
                        <td className="px-2.5 py-2.5 text-foreground font-medium">{a.nome || '—'}</td>
                        <td className="px-2.5 py-2.5"><ProductBadge p={a.produto} /></td>
                        <td className="px-2.5 py-2.5 text-muted-foreground font-mono text-[11px]">{a.telefone}</td>
                        <td className="px-2.5 py-2.5"><span className={`font-semibold ${dias > 30 ? 'text-red-400' : 'text-primary'}`}>{dias !== null ? `${dias}d` : '—'}</span></td>
                        <td className="px-2.5 py-2.5"><CopyPhoneButton value={a.telefone} copied={copied} onCopy={copyNum} /></td>
                      </tr>
                    )
                  })}
                </DataTable>
              ) : <EmptyState msg="Nenhum aluno parado" />}
            </SectionCard>
          </>
        )}

        {/* ════ CUSTO ════ */}
        {mainTab === 'custo' && (
          <>
            <SectionTitle icon={<Wallet />} title="Custo do clone" sub={`Gemini 3.5 Flash · $1,50/MTok input + $9,00/MTok output · câmbio US$1 = R${usdBrl.toFixed(2)} (tempo real)`} />

            <div className="bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 mb-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-green-400">Billing pré-pago ativo desde 19/07/2026 — consumo real está sendo debitado.</strong> A chave deixou de estar na camada gratuita nesse dia. O saldo abaixo é o checkpoint manual mais recente — confira o valor real em <span className="font-mono">aistudio.google.com</span> → Faturamento → Pré-pagamento e clique em "Atualizar" pra manter isso calibrado com a realidade.
              </div>
            </div>

            <SectionCard
              className="mb-3.5"
              title="Saldo Gemini (pré-pago) — provedor ativo"
              right={!editandoSaldo && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={abrirEdicaoSaldo}>Atualizar</Button>}
            >
              {!editandoSaldo ? (
                <>
                  <div className={g(3)}>
                    <Kpi label="Saldo estimado agora" value={`US$ ${saldoAoVivo.toFixed(2)}`} colorClass={saldoAoVivo < 2 ? 'bg-red-500' : 'bg-green-500'} icon={<CreditCard className="w-5 h-5" />} sub={live ? 'ao vivo — atualiza sozinho' : 'descontando consumo desde o checkpoint'} />
                    <Kpi label="Custo total desde o checkpoint" value={`US$ ${custoTotalAoVivo.toFixed(2)}`} colorClass="bg-primary" icon={<BarChart3 className="w-5 h-5" />} sub="ao vivo, estimado" />
                    <Kpi label="Total depositado (pré-pago)" value={`US$ ${(saldo?.total_depositado_usd ?? 0).toFixed(2)}`} colorClass="bg-sky-500" icon={<Landmark className="w-5 h-5" />} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Checkpoint manual (última vez que você conferiu no AI Studio): saldo US$ {(saldo?.saldo_atual_usd ?? 0).toFixed(2)} · custo acumulado US$ {(saldo?.custo_total_usd ?? 0).toFixed(2)} · em {saldo?.atualizado_em ? new Date(saldo.atualizado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}.
                    Desde então, {gastosDesdeCheckpoint > 0 ? `estimo US$ ${gastosDesdeCheckpoint.toFixed(2)} a mais de consumo real` : 'nenhum consumo novo'} — os números acima já descontam isso automaticamente. Confira no AI Studio de vez em quando e clique em "Atualizar" pra recalibrar com o valor real.
                    {(saldo?.atualizado_em && saldo.atualizado_em < '2026-07-19') && (
                      <div className="mt-1.5 text-amber-400">⚠ Esse checkpoint ainda é de antes da migração pra Gemini — os números de saldo/depósito estão desatualizados. Clique em "Atualizar" e confira o valor real no AI Studio.</div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">Saldo atual (US$)</div>
                      <Input type="number" step="0.01" className="h-8 text-xs bg-background" value={saldoForm.saldo_atual_usd} onChange={e => setSaldoForm(f => ({ ...f, saldo_atual_usd: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">Custo total desde o início (US$)</div>
                      <Input type="number" step="0.01" className="h-8 text-xs bg-background" value={saldoForm.custo_total_usd} onChange={e => setSaldoForm(f => ({ ...f, custo_total_usd: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">Total depositado (US$)</div>
                      <Input type="number" step="0.01" className="h-8 text-xs bg-background" value={saldoForm.total_depositado_usd} onChange={e => setSaldoForm(f => ({ ...f, total_depositado_usd: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-[11px]" disabled={salvandoSaldo} onClick={salvarSaldo}>{salvandoSaldo ? 'Salvando...' : 'Salvar'}</Button>
                    <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => setEditandoSaldo(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="bg-accent border border-border rounded-lg px-4 py-2.5 mb-3.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Histórico Anthropic (provedor anterior, congelado em {new Date(ANTHROPIC_HISTORICO.congelado_em).toLocaleDateString('pt-BR')}):</strong> saldo final US$ {ANTHROPIC_HISTORICO.saldo_final_usd.toFixed(2)} · custo total US$ {ANTHROPIC_HISTORICO.custo_total_usd.toFixed(2)} · depositado US$ {ANTHROPIC_HISTORICO.total_depositado_usd.toFixed(2)}. Não muda mais — só referência de quanto foi gasto antes da migração pro Gemini.
            </div>

            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-4 py-3 mb-3.5 text-xs text-muted-foreground">
              <strong className="text-sky-400">Custo estimado (Gemini, com billing ativo) — {rotuloPeriodo}:</strong> US$ {custoUSD.toFixed(2)} · R$ {custoBRL.toFixed(2)} · {convPeriodo} conversas · {alunosUnicosPeriodo} alunos únicos
            </div>
            <div className={g(3)}>
              <Kpi
                label={`Custo — ${rotuloPeriodo}`}
                value={`US$ ${custoUSD.toFixed(2)}`}
                colorClass="bg-primary" icon={<CalendarDays className="w-5 h-5" />}
                sub={`R$ ${custoBRL.toFixed(2)} · ${convPeriodo} conv.`}
              />
              <Kpi
                label="Estimativa mensal (ritmo atual)"
                value={`US$ ${custoMesEstUSD.toFixed(2)}`}
                colorClass="bg-sky-500" icon={<CalendarRange className="w-5 h-5" />}
                sub={`R$ ${custoMesEstBRL.toFixed(2)} · baseado nos ${baseAtivos} alunos ativos reais`}
              />
              <Kpi label="Custo por conversa (cache ativo)" value={`US$ ${CUSTO_CONV_USD.toFixed(4)}`} colorClass="bg-muted-foreground" icon={<MessageSquare className="w-5 h-5" />} sub="média — varia entre cache quente/frio" />
            </div>

            <SectionCard className="mb-3.5" title={<>Custo por dia — {rotuloPeriodo} (US$) {diaSel && <span className="text-primary font-semibold"> · {diaSel}</span>}</>} right={diaSel && <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => setDiaSel(null)}>Limpar</Button>}>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias.map(d => ({ ...d, custoUSD: parseFloat((d.total * CUSTO_CONV_USD).toFixed(4)) }))} barSize={mobile ? 12 : 18} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} tickFormatter={v => `$${v.toFixed(3)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`US$ ${v.toFixed(4)} · R$ ${(v * usdBrl).toFixed(3)}`, 'custo']} />
                  <Bar dataKey="custoUSD" name="custo US$" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.primarySoft : C.primary} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard className="mb-3.5" title="Projeção por escala — baseada em alunos ATIVOS de verdade">
              <div className="bg-accent rounded-lg px-3.5 py-2.5 mb-3.5 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Base do cálculo:</strong> {baseProjecao}<br />
                <span className="text-muted-foreground">Antes esse cálculo usava o total de leads da base (496 cadastrados). Agora usa só quem realmente conversa com o clone.</span>
              </div>
              <DataTable headers={['Escala', 'Alunos', 'Conv/sem', 'Conv/mês', 'US$/sem', 'R$/sem', 'US$/mês', 'R$/mês']}>
                {projecoes.map((p, i) => (
                  <tr key={i} className={`border-b border-border ${i === 0 ? 'bg-primary/5' : ''}`}>
                    <td className="px-2.5 py-2.5"><Pill className={i === 0 ? 'bg-primary/20 text-primary' : 'bg-accent text-muted-foreground'}>{p.label}</Pill></td>
                    <td className="px-2.5 py-2.5 text-foreground font-medium">{p.leads.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">{p.conv.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">{p.convMes.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-primary font-semibold">US$ {p.usdSem}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">R$ {p.brlSem}</td>
                    <td className="px-2.5 py-2.5 text-sky-500 font-semibold">US$ {p.usdMes}</td>
                    <td className="px-2.5 py-2.5 text-green-500 font-semibold">R$ {p.brlMes}</td>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>

            <SectionCard title="Custo mensal projetado por escala (R$)">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={projecoes} barSize={36} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [`R$ ${p.payload.brlMes}/mês · US$ ${p.payload.usdMes}/mês`, 'custo mensal']} />
                  <Bar dataKey="mesBRL" name="R$/mês" radius={[6, 6, 0, 0]}>
                    {projecoes.map((_, i) => <Cell key={i} fill={i === 0 ? C.primary : i < 2 ? C.blue : C.purple} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="text-[10px] text-muted-foreground mt-2.5">
                * câmbio em tempo real: US$1 = R${usdBrl.toFixed(2)} · modelo: Gemini 3.5 Flash · billing pré-pago ativo, custo estimado com base no tráfego real
              </div>
            </SectionCard>
          </>
        )}

        {/* ════ INSPEÇÃO ════ */}
        {mainTab === 'inspecao' && (
          <>
            <SectionTitle icon={<Search />} title="Inspeção" sub="Falhas técnicas e alunos aguardando verificação manual — tudo que precisa da sua atenção" />
            <div className={g(3)}>
              <Kpi label="Pendentes no total" value={totalPendentes} colorClass={totalPendentes > 0 ? 'bg-red-500' : 'bg-green-500'} icon={<Bell className="w-5 h-5" />} />
              <Kpi label="Falhas técnicas" value={totalFalhas} colorClass="bg-primary" icon={<AlertTriangle className="w-5 h-5" />} sub="registradas automaticamente pelo n8n" />
              <Kpi label="Verificação manual" value={totalVerificacoes} colorClass="bg-sky-500" icon={<UserSearch className="w-5 h-5" />} sub="alunos que não achamos por telefone/email" />
            </div>

            <SectionCard
              title="Log de eventos"
              right={
                <div className="flex gap-1.5">
                  {[['pendente', 'Pendentes'], ['resolvido', 'Resolvidos'], ['todas', 'Todas']].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setRevisaoFiltro(id)}
                      className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${revisaoFiltro === id ? 'bg-primary text-primary-foreground border-primary font-bold' : 'bg-accent text-muted-foreground border-border'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              {revisoesVisiveis.length === 0 ? <EmptyState msg="Nada por aqui — tudo em dia" /> : (
                <div className="flex flex-col gap-2">
                  {revisoesVisiveis.map(r => (
                    <div key={r.id} className={`bg-accent border border-border rounded-lg px-3.5 py-3 ${r.status === 'resolvido' ? 'opacity-55' : ''}`}>
                      <div className="flex justify-between items-start gap-2.5 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Pill className={r.tipo === 'falha_tecnica' ? 'bg-primary/20 text-primary' : 'bg-sky-500/15 text-sky-400'}>
                            {r.tipo === 'falha_tecnica' ? 'Falha técnica' : 'Verificação manual'}
                          </Pill>
                          {r.status === 'resolvido' && <Pill className="bg-green-500/15 text-green-400">Resolvido</Pill>}
                          <span className="text-[11px] text-muted-foreground">{r.criado_em ? new Date(r.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {r.status === 'pendente' && !r.diagnostico && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={diagnosticando[r.id]} onClick={() => diagnosticar(r)}>
                              {diagnosticando[r.id] ? 'Diagnosticando...' : 'Diagnosticar'}
                            </Button>
                          )}
                          {r.status === 'pendente' && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-400" onClick={() => marcarResolvido(r.id)}>
                              Marcar resolvido
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-foreground">
                        {r.tipo === 'falha_tecnica' ? (
                          <>
                            <div><strong className="text-muted-foreground">Workflow:</strong> {r.workflow || '—'} · <strong className="text-muted-foreground">Node:</strong> {r.node || '—'}</div>
                            <div className="mt-1 text-muted-foreground">{r.detalhe || '—'}</div>
                            {r.execution_id && <div className="mt-1 text-[10px] text-muted-foreground/70">Execução: {r.execution_id}</div>}
                          </>
                        ) : (
                          <>
                            <div><strong className="text-muted-foreground">Telefone:</strong> {r.telefone || '—'}{r.nome ? ` · ${r.nome}` : ''}{r.email ? ` · ${r.email}` : ''}</div>
                            <div className="mt-1 text-muted-foreground">"{r.detalhe || '—'}"</div>
                          </>
                        )}
                      </div>

                      <DiagnosticoBox texto={r.diagnostico} />

                      {r.tipo === 'verificacao_manual' && r.status === 'pendente' && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cadastrar e vincular este aluno</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <Input placeholder="Nome completo" className="h-8 text-xs bg-background" value={linkForms[r.id]?.nome || ''} onChange={e => updateLinkForm(r.id, 'nome', e.target.value)} />
                            <Input placeholder="Email de compra" className="h-8 text-xs bg-background" value={linkForms[r.id]?.email || ''} onChange={e => updateLinkForm(r.id, 'email', e.target.value)} />
                            <Input placeholder="Telefone (com DDI)" className="h-8 text-xs bg-background" value={linkForms[r.id]?.telefone ?? r.telefone ?? ''} onChange={e => updateLinkForm(r.id, 'telefone', e.target.value)} />
                            <select
                              className="h-8 text-xs bg-background border border-input rounded-md px-2"
                              value={linkForms[r.id]?.produto || 'resgate'}
                              onChange={e => updateLinkForm(r.id, 'produto', e.target.value)}
                            >
                              <option value="resgate">Resgate</option>
                              <option value="ccc">CCC</option>
                            </select>
                          </div>
                          <Button size="sm" className="h-7 text-[11px]" disabled={linkSalvando[r.id] || !linkForms[r.id]?.nome || !linkForms[r.id]?.email} onClick={() => vincularAluno(r)}>
                            {linkSalvando[r.id] ? 'Salvando...' : 'Cadastrar e vincular'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}

        <div className="text-center text-[10px] text-muted-foreground/50 mt-12 pb-6">
          S.O.S Roncada · dados confidenciais · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
