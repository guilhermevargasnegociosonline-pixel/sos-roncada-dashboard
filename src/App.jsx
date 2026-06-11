import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const SUPABASE_URL = 'https://bnkesshzstryzfoipres.supabase.co/rest/v1'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'

const headers = {
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'apikey': SUPABASE_KEY,
}

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '32px 20px', background: '#0a0a0a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 600, color: '#f0f0f0' },
  subtitle: { fontSize: 13, color: '#555', marginTop: 4 },
  badge: { fontSize: 12, background: '#161616', color: '#666', padding: '5px 12px', borderRadius: 20, border: '1px solid #222' },
  section: { marginBottom: 36 },
  secHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #1e1e1e' },
  secIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  secTitle: { fontSize: 15, fontWeight: 500, color: '#e0e0e0' },
  secSub: { fontSize: 12, color: '#555', marginTop: 2 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 },
  metric: { background: '#111', borderRadius: 8, padding: '14px 16px', border: '1px solid #1e1e1e' },
  metricLabel: { fontSize: 12, color: '#555', marginBottom: 6 },
  metricVal: { fontSize: 26, fontWeight: 500, lineHeight: 1, color: '#f0f0f0' },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' },
  cardTitle: { fontSize: 13, fontWeight: 500, marginBottom: 14, color: '#aaa' },
  brow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 },
  blabel: { fontSize: 12, color: '#555', width: 140, flexShrink: 0 },
  btrack: { flex: 1, height: 7, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' },
  bfill: { height: '100%', borderRadius: 4 },
  bpct: { fontSize: 12, color: '#555', width: 32, textAlign: 'right', flexShrink: 0 },
  srow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #1a1a1a' },
  dot: { width: 9, height: 9, borderRadius: '50%', display: 'inline-block', marginRight: 8, flexShrink: 0 },
  crow: { padding: '9px 0', borderBottom: '1px solid #1a1a1a' },
  cq: { fontSize: 13, fontStyle: 'italic', lineHeight: 1.5, color: '#ccc' },
  cm: { fontSize: 11, color: '#444', marginTop: 3 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  divider: { border: 'none', borderTop: '1px solid #1a1a1a', margin: '28px 0' },
  loading: { textAlign: 'center', padding: '80px 20px', color: '#444', background: '#0a0a0a', minHeight: '100vh' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#333', fontSize: 13 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  li: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' },
  ls: { width: 10, height: 10, borderRadius: 2, flexShrink: 0 },
}

function SectionHeader({ icon, bg, title, sub }) {
  return (
    <div style={s.secHeader}>
      <div style={{ ...s.secIcon, background: bg }}>{icon}</div>
      <div>
        <div style={s.secTitle}>{title}</div>
        {sub && <div style={s.secSub}>{sub}</div>}
      </div>
    </div>
  )
}

function BarRow({ label, pct, color }) {
  return (
    <div style={s.brow}>
      <span style={s.blabel}>{label}</span>
      <div style={s.btrack}><div style={{ ...s.bfill, width: `${pct}%`, background: color }} /></div>
      <span style={s.bpct}>{pct}%</span>
    </div>
  )
}

function TagCloud({ palavras }) {
  const tagColors = [
    { bg: '#2a1510', color: '#e07050' },
    { bg: '#12112a', color: '#8880e0' },
    { bg: '#0c1a24', color: '#4a9fd4' },
    { bg: '#0c1e14', color: '#4ab870' },
    { bg: '#241a0c', color: '#d4944a' },
  ]
  const sizeMap = { lg: 15, md: 13, sm: 11 }
  return (
    <div style={s.tags}>
      {palavras.map((p, i) => (
        <span key={i} style={{
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: sizeMap[p.tamanho] || 12,
          fontWeight: p.tamanho === 'lg' ? 500 : 400,
          background: tagColors[i % tagColors.length].bg,
          color: tagColors[i % tagColors.length].color,
          border: `1px solid ${tagColors[i % tagColors.length].color}33`,
        }}>{p.palavra}</span>
      ))}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/analises?order=criado_em.desc&limit=1`,
          { headers }
        )
        const rows = await res.json()
        if (rows && rows.length > 0) setData(rows[0])

        const resHist = await fetch(
          `${SUPABASE_URL}/analises?order=criado_em.desc&limit=8`,
          { headers }
        )
        const hist = await resHist.json()
        if (hist && hist.length > 0) {
          setHistorico(hist.reverse().map(r => ({
            semana: r.semana,
            crise: r.total_crise,
            estaveis: r.total_estaveis,
            progresso: r.total_progresso,
          })))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={s.loading}>Carregando dados...</div>
  if (!data) return <div style={s.loading}>Nenhum dado disponível ainda.<br /><span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>O workflow de análise ainda não rodou.</span></div>

  const topDores = (() => { try { return JSON.parse(data.top_dores || '[]') } catch { return [] } })()
  const topModulos = (() => { try { return JSON.parse(data.top_modulos || '[]') } catch { return [] } })()
  const topPalavras = (() => { try { return JSON.parse(data.top_palavras || '[]') } catch { return [] } })()
  const frasesCopy = (() => { try { const f = JSON.parse(data.frases_copy || '{}'); return { semana: f.semana || [], mes: f.mes || [] } } catch { return { semana: [], mes: [] } } })()

  const totalCCC = (data.ccc_crise || 0) + (data.ccc_estaveis || 0) + (data.ccc_progresso || 0)
  const totalResgate = (data.resgate_crise || 0) + (data.resgate_estaveis || 0) + (data.resgate_progresso || 0)
  const totalProdutos = totalCCC + totalResgate
  const pctCCC = totalProdutos > 0 ? Math.round((totalCCC / totalProdutos) * 100) : 0
  const pctResgate = 100 - pctCCC

  const mesesHistorico = historico.length > 1 ? historico.map(h => ({ ...h, semana: h.semana?.split('-W')[1] ? `S${h.semana.split('-W')[1]}` : h.semana })) : []

  const tooltipStyle = { background: '#161616', border: '1px solid #222', borderRadius: 8, color: '#ccc', fontSize: 12 }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>S.O.S Roncada</div>
          <div style={s.subtitle}>Central de inteligência · atualizado diariamente às 03:00</div>
        </div>
        <div style={s.badge}>📅 {data.semana} · {data.mes}</div>
      </div>

      <div style={s.section}>
        <SectionHeader icon="📊" bg="#0c1a24" title="Painel operacional" sub="Visão diária da base de alunos" />
        <div style={s.grid4}>
          <div style={s.metric}><div style={s.metricLabel}>alunos ativos</div><div style={s.metricVal}>{data.total_ativos || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>inativos há +3 dias</div><div style={s.metricVal}>{data.total_inativos || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>conversas na semana</div><div style={s.metricVal}>{data.total_conversas || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>tempo 1º engajamento</div><div style={s.metricVal}>{data.tempo_medio_engajamento ? `${data.tempo_medio_engajamento.toFixed(1)}h` : '—'}</div></div>
        </div>
        <div style={s.grid3}>
          <div style={s.card}>
            <div style={s.cardTitle}>🟢 Termômetro da base</div>
            <div style={s.srow}><div><span style={{ ...s.dot, background: '#4ab870' }}></span><span style={{ fontSize: 13, color: '#777' }}>em progresso</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#4ab870' }}>{data.total_progresso || 0} alunos</span></div>
            <div style={s.srow}><div><span style={{ ...s.dot, background: '#d4944a' }}></span><span style={{ fontSize: 13, color: '#777' }}>estáveis</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#d4944a' }}>{data.total_estaveis || 0} alunos</span></div>
            <div style={s.srow}><div><span style={{ ...s.dot, background: '#e05050' }}></span><span style={{ fontSize: 13, color: '#777' }}>em crise</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#e05050' }}>{data.total_crise || 0} alunos</span></div>
            <div style={{ ...s.srow, borderBottom: 'none' }}><div><span style={{ ...s.dot, background: '#2a2a2a' }}></span><span style={{ fontSize: 13, color: '#777' }}>sem sinal</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{data.total_inativos || 0} alunos</span></div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📦 Distribuição por produto</div>
            <BarRow label="Resgate" pct={pctResgate} color="#6c63ff" />
            <BarRow label="CCC" pct={pctCCC} color="#a09be0" />
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📈 CCC vs Resgate — estado</div>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>CCC</div>
            <BarRow label="crise" pct={data.ccc_crise || 0} color="#e05050" />
            <BarRow label="progresso" pct={data.ccc_progresso || 0} color="#4ab870" />
            <div style={{ fontSize: 11, color: '#444', margin: '10px 0 8px' }}>Resgate</div>
            <BarRow label="crise" pct={data.resgate_crise || 0} color="#e05050" />
            <BarRow label="progresso" pct={data.resgate_progresso || 0} color="#4ab870" />
          </div>
        </div>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <SectionHeader icon="🧠" bg="#0c1e14" title="Inteligência de dores" sub="O que os alunos mais trazem nas conversas" />
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitle}>🔥 Top dores — esta semana</div>
            {topDores.length > 0
              ? topDores.map((d, i) => <BarRow key={i} label={d.dor} pct={d.percentual} color="#6c63ff" />)
              : <div style={s.empty}>Aguardando análise</div>}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📚 Módulos mais mencionados</div>
            {topModulos.length > 0
              ? topModulos.map((m, i) => <BarRow key={i} label={m.modulo} pct={m.percentual} color="#e07050" />)
              : <div style={s.empty}>Aguardando análise</div>}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>🏷️ Mapa de palavras — semana</div>
          {topPalavras.length > 0
            ? <TagCloud palavras={topPalavras} />
            : <div style={s.empty}>Aguardando análise</div>}
        </div>
      </div>

      <hr style={s.divider} />

      {historico.length > 1 && (
        <>
          <div style={s.section}>
            <SectionHeader icon="📉" bg="#241a0c" title="Arco emocional coletivo" sub="Evolução da base nas últimas semanas" />
            <div style={s.card}>
              <div style={s.legend}>
                <div style={s.li}><span style={{ ...s.ls, background: '#4ab870' }}></span>em progresso</div>
                <div style={s.li}><span style={{ ...s.ls, background: '#d4944a' }}></span>estáveis</div>
                <div style={s.li}><span style={{ ...s.ls, background: '#e05050' }}></span>em crise</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mesesHistorico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#444' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#444' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="progresso" stroke="#4ab870" strokeWidth={2} dot={{ r: 4, fill: '#4ab870' }} name="progresso" />
                  <Line type="monotone" dataKey="estaveis" stroke="#d4944a" strokeWidth={2} dot={{ r: 4, fill: '#d4944a' }} strokeDasharray="4 3" name="estáveis" />
                  <Line type="monotone" dataKey="crise" stroke="#e05050" strokeWidth={2} dot={{ r: 4, fill: '#e05050' }} strokeDasharray="2 2" name="crise" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <hr style={s.divider} />
        </>
      )}

      <div style={s.section}>
        <SectionHeader icon="💬" bg="#2a1510" title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação e conteúdo" />
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitle}>⭐ Frases mais citadas — semana</div>
            {frasesCopy.semana.length > 0
              ? frasesCopy.semana.map((f, i) => (
                <div key={i} style={{ ...s.crow, ...(i === frasesCopy.semana.length - 1 ? { borderBottom: 'none' } : {}) }}>
                  <div style={s.cq}>"{f.frase}"</div>
                  <div style={s.cm}>{f.citacoes} citações · {f.categoria} · {f.produto}</div>
                </div>
              ))
              : <div style={s.empty}>Aguardando análise</div>}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>🏆 Frases mais citadas — mês</div>
            {frasesCopy.mes.length > 0
              ? frasesCopy.mes.map((f, i) => (
                <div key={i} style={{ ...s.crow, ...(i === frasesCopy.mes.length - 1 ? { borderBottom: 'none' } : {}) }}>
                  <div style={s.cq}>"{f.frase}"</div>
                  <div style={s.cm}>{f.citacoes} citações · {f.categoria} · {f.produto}</div>
                </div>
              ))
              : <div style={s.empty}>Aguardando análise</div>}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#2a2a2a', marginTop: 40 }}>
        S.O.S Roncada · atualizado automaticamente · dados confidenciais
      </div>
    </div>
  )
}
