import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Kpi, SectionCard, SectionTitle, ProgressRow, Pill, ProductBadge,
  EmptyState, CopyPhoneButton, DataTable, tooltipStyle,
} from '@/components/dashboard/dashboard-ui'
import { C } from '@/lib/chart-colors'

const SUPABASE_URL = 'https://bnkesshzstryzfoipres.supabase.co/rest/v1'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'
const H = { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }

// Custo claude-sonnet-4-6
// Calibrado com dados reais: US$ 4,40 / 111 conversas = US$ 0,03964/conv
// 10.963 tokens input (system prompt ~3k + histórico + mensagem) + 450 output
const CUSTO_INPUT  = 3 / 1_000_000   // $3 por MTok input
const CUSTO_OUTPUT = 15 / 1_000_000  // $15 por MTok output
const TOK_IN  = 10963
const TOK_OUT = 450
const CUSTO_CONV_USD = (TOK_IN * CUSTO_INPUT) + (TOK_OUT * CUSTO_OUTPUT)

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
function gerarSemanas() { const a = new Date().getFullYear(); return Array.from({ length: 52 }, (_, i) => `${a}-W${String(i + 1).padStart(2, '0')}`) }
function gerarMeses() {
  const a = new Date().getFullYear()
  const n = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return Array.from({ length: 12 }, (_, i) => ({ value: `${a}-${String(i + 1).padStart(2, '0')}`, label: `${n[i]} ${a}` }))
}

const mainTabsDef = [
  { id: 'geral', icon: '📊', label: 'Geral' },
  { id: 'resgate', icon: '🔵', label: 'Resgate' },
  { id: 'ccc', icon: '🟣', label: 'CCC' },
  { id: 'comercial', icon: '🚀', label: 'Operação' },
  { id: 'copy', icon: '💬', label: 'Copy' },
  { id: 'churn', icon: '⚠️', label: 'Risco' },
  { id: 'custo', icon: '💵', label: 'Custo' },
  { id: 'inspecao', icon: '🔎', label: 'Inspeção' },
]

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
  const [alunosSemProgresso, setAlunosSemProgresso] = useState([])
  const [copied, setCopied] = useState(null)
  const [usdBrl, setUsdBrl] = useState(5.70)
  const [convDiarias, setConvDiarias] = useState([])
  const [diaSel, setDiaSel] = useState(null)
  const [alunosAtivos, setAlunosAtivos] = useState([])
  const [convPorAluno, setConvPorAluno] = useState({})
  const [revisoes, setRevisoes] = useState([])
  const [revisaoFiltro, setRevisaoFiltro] = useState('pendente')

  useEffect(() => {
    async function load() {
      try {
        const cambio = await getUSDtoBRL()
        setUsdBrl(cambio)

        const [rAnal, rAlunos, rConvAll, rRevisoes] = await Promise.all([
          fetch(`${SUPABASE_URL}/analises?order=criado_em.desc&limit=60`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/alunos?ativo=eq.true&select=id,nome,telefone,produto,criado_em`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/conversas?select=aluno_id,telefone,role,mensagem,criado_em&order=criado_em.desc&limit=10000`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/revisoes_pendentes?order=criado_em.desc&limit=300`, { headers: H }).then(r => r.json()),
        ])
        setRevisoes(rRevisoes || [])

        const analises = (rAnal || []).filter(r => (r.total_ativos || 0) > 0)
        if (analises.length > 0) { setAllAnalises(analises); setData(analises[0]); setPeriodoSel(analises[0].semana || '') }

        const alunosArr = rAlunos || []
        const convArr = rConvAll || []
        setAlunos(alunosArr)

        const comConv = new Set(convArr.map(c => c.aluno_id))
        setFantasmas(alunosArr.filter(a => !comConv.has(a.id)))

        const totalConvUser = convArr.filter(c => c.role === 'user').length
        const totalAlunosComConv = new Set(convArr.filter(c => c.role === 'user').map(c => c.aluno_id)).size
        const mediaConvAluno = totalAlunosComConv > 0 ? totalConvUser / totalAlunosComConv : 5
        const porAlunoTemp = {}
        convArr.filter(c => c.role === 'user').forEach(c => {
          if (c.aluno_id) porAlunoTemp[c.aluno_id] = (porAlunoTemp[c.aluno_id] || 0) + 1
        })
        setAlunosSemProgresso(alunosArr.filter(a => {
          const dias = a.criado_em ? Math.floor((Date.now() - new Date(a.criado_em)) / 86400000) : 0
          const msgs = porAlunoTemp[a.id] || 0
          return dias > 7 && comConv.has(a.id) && msgs < (mediaConvAluno * 0.3)
        }))

        const toLocalDate = (isoStr) => {
          if (!isoStr) return null
          const d = new Date(isoStr)
          d.setHours(d.getHours() - 3)
          return d.toISOString().split('T')[0]
        }
        const hoje = new Date()
        hoje.setHours(hoje.getHours() - 3)
        const hojeStr = hoje.toISOString().split('T')[0]
        const dias14 = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(hojeStr)
          d.setDate(d.getDate() - 13 + i)
          return d.toISOString().split('T')[0]
        })
        const contDia = {}
        dias14.forEach(d => { contDia[d] = 0 })
        convArr.filter(c => c.role === 'user').forEach(c => {
          const dia = toLocalDate(c.criado_em)
          if (dia && contDia[dia] !== undefined) contDia[dia]++
        })
        setConvDiarias(dias14.map(d => ({
          dia: d.slice(5),
          total: contDia[d] || 0,
          data: d,
        })))

        const porAluno = {}
        convArr.filter(c => c.role === 'user').forEach(c => {
          if (c.aluno_id) porAluno[c.aluno_id] = (porAluno[c.aluno_id] || 0) + 1
        })
        setConvPorAluno(porAluno)
        setAlunosAtivos(alunosArr.filter(a => comConv.has(a.id) || Object.keys(porAluno).includes(a.id)))

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

  async function marcarResolvido(id) {
    setRevisoes(prev => prev.map(r => r.id === id ? { ...r, status: 'resolvido' } : r))
    try {
      await fetch(`${SUPABASE_URL}/revisoes_pendentes?id=eq.${id}`, {
        method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'resolvido', resolvido_em: new Date().toISOString() })
      })
    } catch (e) { console.error(e) }
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
    try { const f = JSON.parse(data?.frases_copy || '{}'); const s = arr => [...(arr || [])].sort((a, b) => (b.citacoes || 0) - (a.citacoes || 0)); return { semana: s(f.semana), mes: s(f.mes) } }
    catch { return { semana: [], mes: [] } }
  })()

  const totalCCC = data ? (data.ccc_crise || 0) + (data.ccc_estaveis || 0) + (data.ccc_progresso || 0) : 0
  const totalResgate = data ? (data.resgate_crise || 0) + (data.resgate_estaveis || 0) + (data.resgate_progresso || 0) : 0
  const totalP = totalCCC + totalResgate
  const pctCCC = totalP > 0 ? Math.round((totalCCC / totalP) * 100) : 0
  const pctResgate = 100 - pctCCC

  const mesSel = data?.mes || ''
  const semanasSdoMes = allAnalises.filter(r => r.mes === mesSel)
  const convDoMes = semanasSdoMes.reduce((s, r) => s + (r.total_conversas || 0), 0)
  const convSemana = data?.total_conversas || 0

  const convPeriodo = periodoTipo === 'mes' ? convDoMes : convSemana
  const custoUSD = convPeriodo * CUSTO_CONV_USD
  const custoBRL = custoUSD * usdBrl

  const semanasComDados = allAnalises.filter(r => (r.total_conversas || 0) > 0)
  const mediaConvSemana = semanasComDados.length > 0
    ? semanasComDados.reduce((s, r) => s + (r.total_conversas || 0), 0) / semanasComDados.length
    : convSemana
  const semanasNoMes = 4
  const custoMesEstUSD = mediaConvSemana * semanasNoMes * CUSTO_CONV_USD
  const custoMesEstBRL = custoMesEstUSD * usdBrl

  const custoMesRealUSD = convDoMes * CUSTO_CONV_USD
  const custoMesRealBRL = custoMesRealUSD * usdBrl

  const convPorAlunoMedia = semanasComDados.length > 0
    ? semanasComDados.reduce((s, r) => s + ((r.total_conversas || 0) / Math.max(r.total_ativos || 1, 1)), 0) / semanasComDados.length
    : (data?.total_ativos ? convSemana / data.total_ativos : 0)
  const baseProjecao = `${convPorAlunoMedia.toFixed(1)} conv/aluno/sem · média de ${semanasComDados.length} semana(s)`

  const projecoes = [
    { label: 'Atual', leads: data?.total_ativos || 0 },
    { label: '2.5x', leads: Math.round((data?.total_ativos || 0) * 2.5) },
    { label: '5x', leads: Math.round((data?.total_ativos || 0) * 5) },
    { label: '10x', leads: Math.round((data?.total_ativos || 0) * 10) },
    { label: '20x', leads: Math.round((data?.total_ativos || 0) * 20) },
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

  const diasEng = [{ d: 'Seg', v: 18 }, { d: 'Ter', v: 24 }, { d: 'Qua', v: 31 }, { d: 'Qui', v: 27 }, { d: 'Sex', v: 22 }, { d: 'Sáb', v: 14 }, { d: 'Dom', v: 9 }]
  const horasEng = [{ h: '6h', v: 3 }, { h: '8h', v: 8 }, { h: '10h', v: 14 }, { h: '12h', v: 11 }, { h: '14h', v: 9 }, { h: '16h', v: 12 }, { h: '18h', v: 19 }, { h: '20h', v: 22 }, { h: '22h', v: 15 }]

  const gridCols = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }
  const g = (cols) => `grid grid-cols-1 ${gridCols[cols]} gap-3.5 mb-4`

  const fantResgate = fantasmas.filter(a => a.produto === 'resgate')
  const fantCCC = fantasmas.filter(a => a.produto === 'ccc')

  const rankingAtivos = alunosAtivos
    .map(a => ({ ...a, msgs: convPorAluno[a.id] || 0 }))
    .sort((a, b) => b.msgs - a.msgs)
    .slice(0, 10)

  const agora = Date.now()

  const revisoesVisiveis = revisoes.filter(r => revisaoFiltro === 'todas' ? true : r.status === revisaoFiltro)
  const totalPendentes = revisoes.filter(r => r.status === 'pendente').length
  const totalFalhas = revisoes.filter(r => r.tipo === 'falha_tecnica' && r.status === 'pendente').length
  const totalVerificacoes = revisoes.filter(r => r.tipo === 'verificacao_manual' && r.status === 'pendente').length

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1080px] mx-auto px-3.5 py-5 md:px-7 md:py-8">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6 flex-wrap gap-3.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-[7px] h-[7px] rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <div className="text-lg md:text-[22px] font-bold tracking-tight text-foreground">S.O.S Roncada</div>
            </div>
            <div className="text-[11px] text-muted-foreground pl-[15px]">Central de inteligência · atualizado diariamente às 03:00</div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex bg-accent border border-border rounded-lg overflow-hidden">
              {['semana', 'mes'].map(t => (
                <button
                  key={t}
                  onClick={() => { setPeriodoTipo(t); setPeriodoSel(t === 'semana' ? (allAnalises[0]?.semana || '') : (allAnalises[0]?.mes || '')) }}
                  className={`px-3.5 py-1.5 text-[11px] transition-colors ${periodoTipo === t ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                >
                  {t === 'semana' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            <Select value={periodoSel} onValueChange={setPeriodoSel}>
              <SelectTrigger className="h-8 min-w-[130px] text-[11px] bg-accent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(periodoTipo === 'semana' ? todasSemanas.map(s => ({ value: s, label: s })) : todosMeses).map(m => (
                  <SelectItem key={m.value || m} value={m.value || m}>{m.label || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABS */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="mb-5">
          <TabsList className="w-full justify-start overflow-x-auto h-auto bg-transparent border-b border-border rounded-none p-0 gap-1">
            {mainTabsDef.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="data-active:border-primary data-active:shadow-none rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-active:bg-transparent data-active:text-foreground text-muted-foreground"
              >
                {mobile ? t.icon : `${t.icon} ${t.label}${t.id === 'inspecao' && totalPendentes > 0 ? ` (${totalPendentes})` : ''}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ════ GERAL ════ */}
        {mainTab === 'geral' && (
          <>
            <div className={g(4)}>
              <Kpi label="Alunos ativos" value={data?.total_ativos || 0} colorClass="bg-primary" icon="👥" />
              <Kpi label="Conversas na semana" value={data?.total_conversas || 0} colorClass="bg-blue-500" icon="💬" />
              <Kpi label="Inativos +3 dias" value={data?.total_inativos || 0} colorClass="bg-red-500" icon="😶" />
              <Kpi
                label={periodoTipo === 'mes' ? 'Custo real do mês' : 'Custo da semana'}
                value={`US$ ${custoUSD.toFixed(2)}`}
                colorClass="bg-muted-foreground"
                icon="💵"
                sub={periodoTipo === 'mes' ? `R$ ${custoBRL.toFixed(2)} · ${semanasSdoMes.length} sem. reais` : `R$ ${custoBRL.toFixed(2)} · câmbio ${usdBrl.toFixed(2)}`}
              />
            </div>

            <div className={g(2)}>
              <SectionCard title="Distribuição por produto">
                <ProgressRow label="Resgate" pct={pctResgate} colorClass="bg-blue-500" right={`${pctResgate}%`} />
                <ProgressRow label="CCC" pct={pctCCC} colorClass="bg-purple-400" right={`${pctCCC}%`} />
                <div className="border-t border-border my-4" />
                <div className="flex gap-2.5">
                  <div className="flex-1 bg-accent rounded-lg p-2.5 text-center">
                    <div className="text-xl font-bold text-blue-500">{totalResgate}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Resgate</div>
                  </div>
                  <div className="flex-1 bg-accent rounded-lg p-2.5 text-center">
                    <div className="text-xl font-bold text-purple-400">{totalCCC}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">CCC</div>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Conversas — histórico semanal">
                {historico.length > 1 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.amber} stopOpacity={0.25} /><stop offset="95%" stopColor={C.amber} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="s" tick={{ fontSize: 10, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="conv" stroke={C.amber} fill="url(#ga)" strokeWidth={2} dot={false} name="conversas" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </SectionCard>
            </div>

            <SectionCard
              className="mb-4"
              title={<>Mensagens por dia — últimos 14 dias {diaSel && <span className="text-primary font-semibold">· {diaSel}</span>}</>}
              right={diaSel && <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => setDiaSel(null)}>✕ Limpar</Button>}
            >
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias} barSize={mobile ? 14 : 20} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [v, 'mensagens']} />
                  <Bar dataKey="total" name="mensagens" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.amber : C.blue} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div className="mt-3 px-3.5 py-2.5 bg-accent rounded-lg text-xs text-muted-foreground">
                  📅 <strong className="text-foreground">{diaSel}</strong> — {convDiarias.find(d => d.data === diaSel)?.total || 0} mensagens de usuários
                  <span className="ml-3">· Custo estimado: US$ {((convDiarias.find(d => d.data === diaSel)?.total || 0) * CUSTO_CONV_USD).toFixed(3)}</span>
                </div>
              )}
            </SectionCard>

            <div className={g(2)}>
              <SectionCard title="Melhores dias da semana">
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={diasEng} barSize={16} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="v" fill={C.blue} radius={[4, 4, 0, 0]} name="conversas" />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
              <SectionCard title="Horários de pico">
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={horasEng} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <defs><linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3} /><stop offset="95%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="h" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="v" stroke={C.green} fill="url(#gh)" strokeWidth={2} dot={false} name="mensagens" />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {historico.length > 1 && (
              <SectionCard title="Evolução da base">
                <div className="flex gap-4 mb-3 flex-wrap">
                  {[[C.amber, 'ativos'], [C.red, 'em crise'], [C.green, 'progresso']].map(([c, l]) => (
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
                    <Line type="monotone" dataKey="ativos" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} name="ativos" />
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
            <SectionTitle icon="🔵" title="Resgate — Método Completo" sub="7 módulos · programa integral de restauração conjugal" />
            <div className={g(3)}>
              <Kpi label="Em crise" value={data?.resgate_crise || 0} colorClass="bg-red-500" icon="🆘" />
              <Kpi label="Estáveis" value={data?.resgate_estaveis || 0} colorClass="bg-primary" icon="⚖️" />
              <Kpi label="Em progresso" value={data?.resgate_progresso || 0} colorClass="bg-green-500" icon="📈" sub="avançando no método" />
            </div>
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
                  ? [...topDores].sort((a, b) => b.percentual - a.percentual).map((d, i) => <ProgressRow key={i} rank={i + 1} label={d.dor} pct={d.percentual} colorClass="bg-blue-500" />)
                  : <EmptyState />}
              </SectionCard>
            </div>
            <SectionCard title="Módulos mencionados nas conversas">
              <div className="bg-accent rounded-lg px-3.5 py-2.5 mb-3.5 text-[11px] text-muted-foreground">
                💡 <strong className="text-foreground">Como interpretar:</strong> o clone identifica qual módulo é mais relevante para a dúvida do aluno e o menciona na resposta. Alta frequência de um módulo = muitos alunos com dúvidas daquele tema específico. Isso indica onde o conteúdo precisa de mais suporte ou aprofundamento.
              </div>
              {topModulos.length > 0
                ? [...topModulos].sort((a, b) => b.percentual - a.percentual).map((m, i) => (
                  <div key={i} className="mb-3">
                    <ProgressRow rank={i + 1} label={m.modulo} pct={m.percentual} colorClass="bg-blue-500" />
                  </div>
                ))
                : <EmptyState />}
            </SectionCard>
          </>
        )}

        {/* ════ CCC ════ */}
        {mainTab === 'ccc' && (
          <>
            <SectionTitle icon="🟣" title="Como Convencer seu Cônjuge" sub="4 módulos · produto de entrada · porta para o Resgate" />
            <div className={g(3)}>
              <Kpi label="Em crise" value={data?.ccc_crise || 0} colorClass="bg-red-500" icon="🆘" />
              <Kpi label="Estáveis" value={data?.ccc_estaveis || 0} colorClass="bg-primary" icon="⚖️" />
              <Kpi label="Em progresso" value={data?.ccc_progresso || 0} colorClass="bg-green-500" icon="📈" />
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
              <SectionCard title="🔑 Sinais de upgrade para o Resgate">
                <div className="text-[11px] text-muted-foreground mb-3">Alunos CCC que mencionaram temas do programa completo</div>
                <div className="bg-accent rounded-lg px-3.5 py-3 mb-2.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xl font-bold text-primary">{Math.round(totalCCC * 0.3)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">potenciais upgrades</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-500">R$ {(Math.round(totalCCC * 0.3) * 150).toLocaleString('pt-BR')}</div>
                      <div className="text-[10px] text-muted-foreground">receita potencial</div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">⚠️ Dados reais após ajuste no workflow de análise</div>
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
            <SectionTitle icon="🚀" title="Central de operação" sub="Engajamento, alunos ativos e reengajamento" />

            <SectionCard className="mb-4" title="📅 Engajamento diário — últimos 14 dias">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={convDiarias} barSize={mobile ? 12 : 18} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [v, 'mensagens']} />
                  <Bar dataKey="total" name="mensagens" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.amber : C.green} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div className="mt-2.5 px-3 py-2 bg-accent rounded-lg text-xs text-muted-foreground">
                  📅 <strong className="text-foreground">{diaSel}</strong> — {convDiarias.find(d => d.data === diaSel)?.total || 0} mensagens · US$ {((convDiarias.find(d => d.data === diaSel)?.total || 0) * CUSTO_CONV_USD).toFixed(3)}
                </div>
              )}
            </SectionCard>

            <SectionCard className="mb-4" title="🏆 Alunos mais ativos — total de mensagens" right={<Pill className="bg-primary/15 text-primary">{rankingAtivos.length} alunos</Pill>}>
              {rankingAtivos.length > 0 ? (
                <DataTable headers={['#', 'Nome', 'Produto', 'Mensagens', 'Telefone']}>
                  {rankingAtivos.map((a, i) => (
                    <tr key={i} className={`border-b border-border ${i === 0 ? 'bg-primary/5' : ''}`}>
                      <td className={`px-2.5 py-2.5 font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>#{i + 1}</td>
                      <td className="px-2.5 py-2.5 text-foreground font-medium">{a.nome || '—'}</td>
                      <td className="px-2.5 py-2.5"><ProductBadge p={a.produto} /></td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-15 h-[5px] bg-border rounded-full overflow-hidden" style={{ width: 60 }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min((a.msgs / (rankingAtivos[0]?.msgs || 1)) * 100, 100)}%`, background: i === 0 ? C.amber : C.blue }} />
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

            <SectionCard title="🔁 Reengajamento — inativos para contato" right={<Pill className="bg-red-500/15 text-red-400">{data?.total_inativos || 0} inativos</Pill>}>
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
              ) : <EmptyState msg="🎉 Todos os alunos estão engajados" />}
            </SectionCard>
          </>
        )}

        {/* ════ COPY ════ */}
        {mainTab === 'copy' && (
          <>
            <SectionTitle icon="💬" title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação, conteúdo e vendas" />
            <Tabs value={copyTab} onValueChange={setCopyTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="semana" className="text-xs">📅 Esta semana</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs">🗓️ Este mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <SectionCard title={copyTab === 'semana' ? 'Ranking semanal — por citações' : 'Ranking mensal — por citações'} right={<Pill className="bg-primary/15 text-primary">{frasesCopy[copyTab].length} frases</Pill>}>
              {frasesCopy[copyTab].length > 0 ? frasesCopy[copyTab].map((f, i) => (
                <div key={i} className={`py-3.5 flex gap-3.5 items-start ${i < frasesCopy[copyTab].length - 1 ? 'border-b border-border' : ''}`}>
                  <div className={`min-w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-accent text-muted-foreground'}`}>#{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-[13px] text-foreground leading-relaxed italic mb-2">"{f.frase}"</div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Pill className="bg-primary/15 text-primary">{f.citacoes} citações</Pill>
                      {f.categoria && <Pill className="bg-muted text-muted-foreground">{f.categoria}</Pill>}
                      {f.produto && <ProductBadge p={f.produto} />}
                    </div>
                  </div>
                </div>
              )) : <EmptyState />}
            </SectionCard>
          </>
        )}

        {/* ════ RISCO ════ */}
        {mainTab === 'churn' && (
          <>
            <SectionTitle icon="⚠️" title="Risco de churn" sub="Alunos que precisam de atenção imediata" />
            <div className={g(3)}>
              <Kpi label="Inativos +3 dias" value={data?.total_inativos || 0} colorClass="bg-red-500" icon="🔕" />
              <Kpi label="Em crise ativa" value={data?.total_crise || 0} colorClass="bg-red-500" icon="🆘" sub="mencionaram crise emocional" />
              <Kpi label="Sem progresso +7d" value={alunosSemProgresso.length} colorClass="bg-primary" icon="📉" sub="ativos há +7 dias" />
            </div>
            {(data?.total_crise || 0) > 0 && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl px-4.5 py-3.5 mb-4 flex items-center gap-3">
                <span className="text-xl">🆘</span>
                <div>
                  <div className="text-[13px] font-semibold text-red-400">Alunos em crise emocional detectada</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{data?.total_crise} aluno(s) mencionaram palavras de crise nas conversas desta semana. Verificar manualmente.</div>
                </div>
              </div>
            )}
            <SectionCard className="mb-4" title="📉 Alunos sem progresso — ativos há +7 dias" right={<Pill className="bg-primary/15 text-primary">{alunosSemProgresso.length}</Pill>}>
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
              ) : <EmptyState msg="🎉 Nenhum aluno parado" />}
            </SectionCard>
          </>
        )}

        {/* ════ CUSTO ════ */}
        {mainTab === 'custo' && (
          <>
            <SectionTitle icon="💵" title="Custo do clone" sub={`claude-sonnet-4-6 · $3/MTok input + $15/MTok output · câmbio US$1 = R$${usdBrl.toFixed(2)} (tempo real)`} />
            {periodoTipo === 'mes' && custoMesRealUSD > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-3.5 text-xs text-muted-foreground">
                ✅ <strong className="text-green-500">Custo real acumulado — {mesSel}:</strong> US$ {custoMesRealUSD.toFixed(2)} · R$ {custoMesRealBRL.toFixed(2)} · {semanasSdoMes.length} semana(s) · {convDoMes} conversas
              </div>
            )}
            <div className={g(3)}>
              <Kpi
                label={periodoTipo === 'mes' ? 'Custo real do mês' : 'Custo da semana'}
                value={`US$ ${custoUSD.toFixed(2)}`}
                colorClass="bg-primary" icon="📅"
                sub={`R$ ${custoBRL.toFixed(2)} · ${convPeriodo} conv.` + (periodoTipo === 'mes' ? ` · ${semanasSdoMes.length} sem.` : '')}
              />
              <Kpi
                label="Estimativa mensal"
                value={`US$ ${custoMesEstUSD.toFixed(2)}`}
                colorClass="bg-blue-500" icon="🗓️"
                sub={`R$ ${custoMesEstBRL.toFixed(2)} · média de ${semanasComDados.length} sem. reais`}
              />
              <Kpi label="Custo por conversa" value={`US$ ${CUSTO_CONV_USD.toFixed(4)}`} colorClass="bg-muted-foreground" icon="💬" sub={`R$ ${(CUSTO_CONV_USD * usdBrl).toFixed(4)} · 800tok in + 300tok out`} />
            </div>

            {historico.length > 1 && (
              <SectionCard className="mb-3.5" title="Custo semanal — histórico (US$)">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.amber} stopOpacity={0.25} /><stop offset="95%" stopColor={C.amber} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="s" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `$${v.toFixed(2)}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`US$ ${v.toFixed(3)} · R$ ${(v * usdBrl).toFixed(2)}`, 'custo']} />
                    <Area type="monotone" dataKey="custoUSD" stroke={C.amber} fill="url(#gc)" strokeWidth={2} dot={{ r: 3, fill: C.amber }} name="custo US$" />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
            )}

            <SectionCard
              className="mb-3.5"
              title={<>Custo por dia — últimos 14 dias (US$) {diaSel && <span className="text-primary font-semibold"> · {diaSel}</span>}</>}
              right={diaSel && <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => setDiaSel(null)}>✕</Button>}
            >
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias.map(d => ({ ...d, custoUSD: parseFloat((d.total * CUSTO_CONV_USD).toFixed(4)) }))} barSize={mobile ? 12 : 18} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                  onClick={e => e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 9, fill: C.muted }} tickFormatter={v => `$${v.toFixed(3)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`US$ ${v.toFixed(4)} · R$ ${(v * usdBrl).toFixed(3)}`, 'custo']} />
                  <Bar dataKey="custoUSD" name="custo US$" radius={[4, 4, 0, 0]}>
                    {convDiarias.map((d, i) => <Cell key={i} fill={d.data === diaSel ? C.amberSoft : C.amber} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div className="mt-2.5 px-3.5 py-2.5 bg-accent rounded-lg text-xs">
                  <span className="text-foreground font-semibold">📅 {diaSel}</span>
                  <span className="text-muted-foreground ml-3">{convDiarias.find(d => d.data === diaSel)?.total || 0} mensagens</span>
                  <span className="text-primary ml-3 font-semibold">US$ {((convDiarias.find(d => d.data === diaSel)?.total || 0) * CUSTO_CONV_USD).toFixed(4)}</span>
                  <span className="text-muted-foreground ml-2">· R$ {((convDiarias.find(d => d.data === diaSel)?.total || 0) * CUSTO_CONV_USD * usdBrl).toFixed(3)}</span>
                </div>
              )}
            </SectionCard>

            <SectionCard className="mb-3.5" title="Projeção por escala">
              <div className="bg-accent rounded-lg px-3.5 py-2.5 mb-3.5 text-[11px] text-muted-foreground">
                📐 <strong className="text-foreground">Base do cálculo:</strong> {baseProjecao}<br />
                <span className="text-muted-foreground">Fórmula: leads × {convPorAlunoMedia.toFixed(1)} conv/aluno/sem × custo/conv (US$ {CUSTO_CONV_USD.toFixed(4)}) × câmbio R${usdBrl.toFixed(2)}</span>
              </div>
              <DataTable headers={['Escala', 'Leads', 'Conv/sem', 'Conv/mês', 'US$/sem', 'R$/sem', 'US$/mês', 'R$/mês']}>
                {projecoes.map((p, i) => (
                  <tr key={i} className={`border-b border-border ${i === 0 ? 'bg-primary/5' : ''}`}>
                    <td className="px-2.5 py-2.5"><Pill className={i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-accent text-muted-foreground'}>{p.label}</Pill></td>
                    <td className="px-2.5 py-2.5 text-foreground font-medium">{p.leads.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">{p.conv.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">{p.convMes.toLocaleString('pt-BR')}</td>
                    <td className="px-2.5 py-2.5 text-primary font-semibold">US$ {p.usdSem}</td>
                    <td className="px-2.5 py-2.5 text-muted-foreground">R$ {p.brlSem}</td>
                    <td className="px-2.5 py-2.5 text-blue-500 font-semibold">US$ {p.usdMes}</td>
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
                    {projecoes.map((_, i) => <Cell key={i} fill={i === 0 ? C.amber : i < 3 ? C.blue : C.purple} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="text-[10px] text-muted-foreground mt-2.5">
                * câmbio em tempo real: US$1 = R${usdBrl.toFixed(2)} · modelo: claude-sonnet-4-6 · ~{TOK_IN} tokens input + {TOK_OUT} output por conversa
              </div>
            </SectionCard>
          </>
        )}

        {/* ════ INSPEÇÃO ════ */}
        {mainTab === 'inspecao' && (
          <>
            <SectionTitle icon="🔎" title="Inspeção" sub="Falhas técnicas e alunos aguardando verificação manual — tudo que precisa da sua atenção" />
            <div className={g(3)}>
              <Kpi label="Pendentes no total" value={totalPendentes} colorClass={totalPendentes > 0 ? 'bg-red-500' : 'bg-green-500'} icon="🔔" />
              <Kpi label="Falhas técnicas" value={totalFalhas} colorClass="bg-primary" icon="⚠️" sub="registradas automaticamente pelo n8n" />
              <Kpi label="Verificação manual" value={totalVerificacoes} colorClass="bg-blue-500" icon="🧑‍💻" sub="alunos que não achamos por telefone/email" />
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
                          <Pill className={r.tipo === 'falha_tecnica' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/15 text-blue-400'}>
                            {r.tipo === 'falha_tecnica' ? 'Falha técnica' : 'Verificação manual'}
                          </Pill>
                          {r.status === 'resolvido' && <Pill className="bg-green-500/15 text-green-400">Resolvido</Pill>}
                          <span className="text-[11px] text-muted-foreground">{r.criado_em ? new Date(r.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</span>
                        </div>
                        {r.status === 'pendente' && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px] border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-400" onClick={() => marcarResolvido(r.id)}>
                            ✓ Marcar resolvido
                          </Button>
                        )}
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
