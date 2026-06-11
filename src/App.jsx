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
  page: { maxWidth: 900, margin: '0 auto', padding: '32px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 600, color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4 },
  badge: { fontSize: 12, background: '#f0ede8', color: '#666', padding: '5px 12px', borderRadius: 20 },
  section: { marginBottom: 36 },
  secHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #ebe8e3' },
  secIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  secTitle: { fontSize: 15, fontWeight: 500 },
  secSub: { fontSize: 12, color: '#888', marginTop: 2 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 },
  metric: { background: '#f0ede8', borderRadius: 8, padding: '14px 16px' },
  metricLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  metricVal: { fontSize: 26, fontWeight: 500, lineHeight: 1 },
  metricDelta: { fontSize: 11, marginTop: 5 },
  card: { background: '#fff', border: '1px solid #ebe8e3', borderRadius: 12, padding: '16px 20px' },
  cardTitle: { fontSize: 13, fontWeight: 500, marginBottom: 14 },
  brow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 },
  blabel: { fontSize: 12, color: '#666', width: 140, flexShrink: 0 },
  btrack: { flex: 1, height: 7, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' },
  bfill: { height: '100%', borderRadius: 4 },
  bpct: { fontSize: 12, color: '#888', width: 32, textAlign: 'right', flexShrink: 0 },
  srow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f0ede8' },
  dot: { width: 9, height: 9, borderRadius: '50%', display: 'inline-block', marginRight: 8, flexShrink: 0 },
  crow: { padding: '9px 0', borderBottom: '1px solid #f0ede8' },
  cq: { fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 },
  cm: { fontSize: 11, color: '#999', marginTop: 3 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  divider: { border: 'none', borderTop: '1px solid #ebe8e3', margin: '28px 0' },
  loading: { textAlign: 'center', padding: '80px 20px', color: '#888' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#bbb', fontSize: 13 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  li: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888' },
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
    { bg: '#FAECE7', color: '#712B13' },
    { bg: '#EEEDFE', color: '#3C3489' },
    { bg: '#E6F1FB', color: '#0C447C' },
    { bg: '#E1F5EE', color: '#085041' },
    { bg: '#FAEEDA', color: '#633806' },
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

  const totalBase = (data.total_crise || 0) + (data.total_estaveis || 0) + (data.total_progresso || 0) + (data.total_inativos || 0)
  const pctCCC = data.total_ativos > 0 ? Math.round(((data.ccc_crise + data.ccc_estaveis + data.ccc_progresso) / data.total_ativos) * 100) : 0
  const pctResgate = 100 - pctCCC

  const mesesHistorico = historico.length > 1 ? historico.map(h => ({ ...h, semana: h.semana?.split('-W')[1] ? `S${h.semana.split('-W')[1]}` : h.semana })) : []

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
        <SectionHeader icon="📊" bg="#E6F1FB" title="Painel operacional" sub="Visão diária da base de alunos" />
        <div style={s.grid4}>
          <div style={s.metric}><div style={s.metricLabel}>alunos ativos</div><div style={s.metricVal}>{data.total_ativos || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>inativos há +3 dias</div><div style={s.metricVal}>{data.total_inativos || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>conversas na semana</div><div style={s.metricVal}>{data.total_conversas || 0}</div></div>
          <div style={s.metric}><div style={s.metricLabel}>tempo 1º engajamento</div><div style={s.metricVal}>{data.tempo_medio_engajamento ? `${data.tempo_medio_engajamento.toFixed(1)}h` : '—'}</div></div>
        </div>
        <div style={s.grid3}>
          <div style={s.card}>
            <div style={s.cardTitle}>🟢 Termômetro da base</div>
            <div style={{ ...s.srow }}><div><span style={{ ...s.dot, background: '#3B6D11' }}></span><span style={{ fontSize: 13, color: '#666' }}>em progresso</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#3B6D11' }}>{data.total_progresso || 0} alunos</span></div>
            <div style={{ ...s.srow }}><div><span style={{ ...s.dot, background: '#BA7517' }}></span><span style={{ fontSize: 13, color: '#666' }}>estáveis</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#BA7517' }}>{data.total_estaveis || 0} alunos</span></div>
            <div style={{ ...s.srow }}><div><span style={{ ...s.dot, background: '#A32D2D' }}></span><span style={{ fontSize: 13, color: '#666' }}>em crise</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D' }}>{data.total_crise || 0} alunos</span></div>
            <div style={{ ...s.srow, borderBottom: 'none' }}><div><span style={{ ...s.dot, background: '#ccc' }}></span><span style={{ fontSize: 13, color: '#666' }}>sem sinal</span></div><span style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>{data.total_inativos || 0} alunos</span></div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📦 Distribuição por produto</div>
            <BarRow label="Resgate" pct={pctResgate} color="#534AB7" />
            <BarRow label="CCC" pct={pctCCC} color="#AFA9EC" />
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📈 CCC vs Resgate — estado</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>CCC</div>
            <BarRow label="crise" pct={data.ccc_crise || 0} color="#A32D2D" />
            <BarRow label="progresso" pct={data.ccc_progresso || 0} color="#3B6D11" />
            <div style={{ fontSize: 11, color: '#999', margin: '10px 0 8px' }}>Resgate</div>
            <BarRow label="crise" pct={data.resgate_crise || 0} color="#A32D2D" />
            <BarRow label="progresso" pct={data.resgate_progresso || 0} color="#3B6D11" />
          </div>
        </div>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <SectionHeader icon="🧠" bg="#E1F5EE" title="Inteligência de dores" sub="O que os alunos mais trazem nas conversas" />
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitle}>🔥 Top dores — esta semana</div>
            {topDores.length > 0
              ? topDores.map((d, i) => <BarRow key={i} label={d.dor} pct={d.percentual} color="#534AB7" />)
              : <div style={s.empty}>Aguardando análise</div>}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>📚 Módulos mais mencionados</div>
            {topModulos.length > 0
              ? topModulos.map((m, i) => <BarRow key={i} label={m.modulo} pct={m.percentual} color="#D85A30" />)
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
            <SectionHeader icon="📉" bg="#FAEEDA" title="Arco emocional coletivo" sub="Evolução da base nas últimas semanas" />
            <div style={s.card}>
              <div style={s.legend}>
                <div style={s.li}><span style={{ ...s.ls, background: '#3B6D11' }}></span>em progresso</div>
                <div style={s.li}><span style={{ ...s.ls, background: '#BA7517' }}></span>estáveis</div>
                <div style={s.li}><span style={{ ...s.ls, background: '#A32D2D' }}></span>em crise</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mesesHistorico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="progresso" stroke="#3B6D11" strokeWidth={2} dot={{ r: 4 }} name="progresso" />
                  <Line type="monotone" dataKey="estaveis" stroke="#BA7517" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 3" name="estáveis" />
                  <Line type="monotone" dataKey="crise" stroke="#A32D2D" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="2 2" name="crise" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <hr style={s.divider} />
        </>
      )}

      <div style={s.section}>
        <SectionHeader icon="💬" bg="#FAECE7" title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação e conteúdo" />
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

      <div style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 40 }}>
        S.O.S Roncada · atualizado automaticamente · dados confidenciais
      </div>
    </div>
  )
}
