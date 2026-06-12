import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts'

const SUPABASE_URL = 'https://bnkesshzstryzfoipres.supabase.co/rest/v1'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'
const H = { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }

// Custo claude-sonnet-4-6
// Calibrado com dados reais: US$ 4,40 / 111 conversas = US$ 0,03964/conv
// 10.963 tokens input (system prompt ~3k + histórico + mensagem) + 450 output
const CUSTO_INPUT  = 3 / 1_000_000   // $3 por MTok input
const CUSTO_OUTPUT = 15 / 1_000_000  // $15 por MTok output
const TOK_IN  = 10963 // calibrado: system prompt + histórico + mensagem média
const TOK_OUT = 450   // tokens output médio por conversa
const CUSTO_CONV_USD = (TOK_IN * CUSTO_INPUT) + (TOK_OUT * CUSTO_OUTPUT)
// Verificação: 111 conv × US$ 0.039640 = US$ 4.40 ✓

async function getUSDtoBRL() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const d = await r.json()
    return parseFloat(d.USDBRL.bid)
  } catch { return 5.70 }
}

const T = {
  bg:'#0f1117', card:'#161b27', elevated:'#1e2535',
  border:'#232c3d', borderHi:'#2e3a50',
  t1:'#f1f5f9', t2:'#94a3b8', t3:'#475569', t4:'#1e2535',
  amber:'#f59e0b', amberD:'#78350f', amberL:'#fcd34d',
  green:'#22c55e', greenD:'#14532d',
  red:'#ef4444', redD:'#7f1d1d',
  blue:'#3b82f6', purple:'#a78bfa',
}
const tt = { background:T.elevated, border:`1px solid ${T.borderHi}`, borderRadius:8, color:T.t2, fontSize:11, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }

function useIsMobile() {
  const [m,setM]=useState(window.innerWidth<640)
  useEffect(()=>{const fn=()=>setM(window.innerWidth<640);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn)},[])
  return m
}
function gerarSemanas(){const a=new Date().getFullYear();return Array.from({length:52},(_,i)=>`${a}-W${String(i+1).padStart(2,'0')}`)}
function gerarMeses(){const a=new Date().getFullYear();const n=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return Array.from({length:12},(_,i)=>({value:`${a}-${String(i+1).padStart(2,'0')}`,label:`${n[i]} ${a}`}))}

function KPI({label,value,sub,color,icon}){
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color||T.amber,borderRadius:'12px 12px 0 0'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:4}}>
        <div>
          <div style={{fontSize:10,color:T.t3,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>{label}</div>
          <div style={{fontSize:26,fontWeight:700,color:T.t1,lineHeight:1}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:T.t3,marginTop:5}}>{sub}</div>}
        </div>
        {icon&&<span style={{fontSize:20,opacity:0.4}}>{icon}</span>}
      </div>
    </div>
  )
}
function Card({children,style}){return<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:'18px 20px',...style}}>{children}</div>}
function CTitle({children,right}){return(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{fontSize:11,fontWeight:600,color:T.t2,textTransform:'uppercase',letterSpacing:'0.07em'}}>{children}</div>{right&&<div>{right}</div>}</div>)}
function BRow({rank,label,pct,right,color}){return(<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>{rank!==undefined&&<span style={{fontSize:10,fontWeight:700,color:rank===1?T.amber:T.t3,width:18,textAlign:'center',flexShrink:0}}>#{rank}</span>}<span style={{fontSize:12,color:T.t2,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span><div style={{width:64,height:5,background:T.border,borderRadius:99,overflow:'hidden',flexShrink:0}}><div style={{width:`${Math.min(pct||0,100)}%`,height:'100%',background:color||T.amber,borderRadius:99}}/></div><span style={{fontSize:11,color:T.t3,width:40,textAlign:'right',flexShrink:0}}>{right!==undefined?right:`${pct}%`}</span></div>)}
function Badge({children,color,bg}){return<span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:99,background:bg||`${color}22`,color:color||T.amber,textTransform:'uppercase',letterSpacing:'0.05em'}}>{children}</span>}
function Divider(){return<div style={{borderTop:`1px solid ${T.border}`,margin:'16px 0'}}/>}
function Empty({msg}){return<div style={{textAlign:'center',padding:'28px 0',color:T.t3,fontSize:12}}>{msg||'Aguardando dados da análise'}</div>}
function ProdBadge({p}){return<Badge color={p==='resgate'?T.blue:T.purple}>{p||'—'}</Badge>}
function CopyBtn({value,copied,onCopy}){const ok=copied===value;return(<button onClick={()=>onCopy(value)} style={{background:ok?T.greenD:T.elevated,border:`1px solid ${ok?T.green:T.border}`,borderRadius:6,color:ok?T.green:T.t2,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>{ok?'✓ Copiado':'Copiar nº'}</button>)}
function STitle({icon,title,sub}){return(<div style={{marginBottom:20}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:16,fontWeight:700,color:T.t1,letterSpacing:'-0.01em'}}>{title}</span></div>{sub&&<div style={{fontSize:12,color:T.t3,marginTop:4,paddingLeft:26}}>{sub}</div>}</div>)}

function Tabs({tabs,active,onChange,mobile}){
  return(
    <div style={{display:'flex',gap:2,marginBottom:20,borderBottom:`1px solid ${T.border}`,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          padding:mobile?'8px 10px':'9px 16px',fontSize:mobile?11:12,
          fontWeight:active===t.id?600:400,color:active===t.id?T.t1:T.t3,
          background:'none',border:'none',cursor:'pointer',
          borderBottom:active===t.id?`2px solid ${T.amber}`:'2px solid transparent',
          marginBottom:-1,whiteSpace:'nowrap',transition:'color 0.15s',
        }}>{t.label}</button>
      ))}
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
  const [alunosSemProgresso, setAlunosSemProgresso] = useState([])
  const [copied, setCopied] = useState(null)
  const [usdBrl, setUsdBrl] = useState(5.70)
  const [convDiarias, setConvDiarias] = useState([])
  const [diaSel, setDiaSel] = useState(null)
  const [alunosAtivos, setAlunosAtivos] = useState([])
  const [convPorAluno, setConvPorAluno] = useState({})

  useEffect(() => {
    async function load() {
      try {
        const cambio = await getUSDtoBRL()
        setUsdBrl(cambio)

        const [rAnal, rAlunos, rConvAll] = await Promise.all([
          fetch(`${SUPABASE_URL}/analises?order=criado_em.desc&limit=60`, {headers:H}).then(r=>r.json()),
          fetch(`${SUPABASE_URL}/alunos?ativo=eq.true&select=id,nome,telefone,produto,criado_em`, {headers:H}).then(r=>r.json()),
          fetch(`${SUPABASE_URL}/conversas?select=aluno_id,role,criado_em&order=criado_em.desc&limit=5000`, {headers:H}).then(r=>r.json()),
        ])

        const analises = (rAnal||[]).filter(r=>(r.total_ativos||0)>0)
        if (analises.length>0) { setAllAnalises(analises); setData(analises[0]); setPeriodoSel(analises[0].semana||'') }

        const alunosArr = rAlunos || []
        const convArr = rConvAll || []
        setAlunos(alunosArr)

        // Fantasmas
        const comConv = new Set(convArr.map(c=>c.aluno_id))
        setFantasmas(alunosArr.filter(a=>!comConv.has(a.id)))

        // Sem progresso (ativos há +7 dias e com conversas)
        setAlunosSemProgresso(alunosArr.filter(a=>{
          const dias = a.criado_em ? Math.floor((Date.now()-new Date(a.criado_em))/86400000) : 0
          return dias>7 && comConv.has(a.id)
        }))

        // Conversas diárias (últimos 14 dias)
        const hoje = new Date()
        const dias14 = Array.from({length:14},(_,i)=>{
          const d = new Date(hoje); d.setDate(d.getDate()-13+i)
          return d.toISOString().split('T')[0]
        })
        const contDia = {}
        dias14.forEach(d=>{ contDia[d]=0 })
        convArr.filter(c=>c.role==='user').forEach(c=>{
          const dia = c.criado_em?.split('T')[0]
          if (dia && contDia[dia]!==undefined) contDia[dia]++
        })
        setConvDiarias(dias14.map(d=>({
          dia: d.slice(5), // MM-DD
          total: contDia[d]||0,
          data: d,
        })))

        // Conversas por aluno (ranking)
        const porAluno = {}
        convArr.filter(c=>c.role==='user').forEach(c=>{
          porAluno[c.aluno_id] = (porAluno[c.aluno_id]||0)+1
        })
        setConvPorAluno(porAluno)
        setAlunosAtivos(alunosArr.filter(a=>comConv.has(a.id)))

      } catch(e){console.error(e)}
      finally{setLoading(false)}
    }
    load()
  }, [])

  useEffect(()=>{
    if(!allAnalises.length||!periodoSel) return
    const found = periodoTipo==='semana' ? allAnalises.find(r=>r.semana===periodoSel) : allAnalises.find(r=>r.mes===periodoSel)
    setData(found||null)
  },[periodoSel,periodoTipo,allAnalises])

  const copyNum = (n)=>{navigator.clipboard.writeText(n);setCopied(n);setTimeout(()=>setCopied(null),2000)}

  if (loading) return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:30,height:30,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.amber}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <div style={{color:T.t3,fontSize:12}}>Carregando dados...</div>
    </div>
  )

  const parse=(f,fb=[])=>{try{return JSON.parse(data?.[f]||JSON.stringify(fb))}catch{return fb}}
  const topDores   = data ? parse('top_dores')   : []
  const topModulos = data ? parse('top_modulos') : []
  const frasesCopy = (()=>{
    try{const f=JSON.parse(data?.frases_copy||'{}');const s=arr=>[...(arr||[])].sort((a,b)=>(b.citacoes||0)-(a.citacoes||0));return{semana:s(f.semana),mes:s(f.mes)}}
    catch{return{semana:[],mes:[]}}
  })()

  const totalCCC     = data ? (data.ccc_crise||0)+(data.ccc_estaveis||0)+(data.ccc_progresso||0) : 0
  const totalResgate = data ? (data.resgate_crise||0)+(data.resgate_estaveis||0)+(data.resgate_progresso||0) : 0
  const totalP = totalCCC+totalResgate
  const pctCCC = totalP>0 ? Math.round((totalCCC/totalP)*100) : 0
  const pctResgate = 100-pctCCC

  // ── CUSTO ────────────────────────────────────────────────────────────────
  // Quando período = semana: custo da semana selecionada
  // Quando período = mês: soma real de todas as semanas do mês na tabela analises
  const mesSel = data?.mes || ''
  const semanasSdoMes = allAnalises.filter(r => r.mes === mesSel)
  const convDoMes = semanasSdoMes.reduce((s, r) => s + (r.total_conversas || 0), 0)
  const convSemana = data?.total_conversas || 0

  // Custo do período selecionado
  const convPeriodo = periodoTipo === 'mes' ? convDoMes : convSemana
  const custoUSD    = convPeriodo * CUSTO_CONV_USD
  const custoBRL    = custoUSD * usdBrl

  // Custo estimado do mês — média ponderada das semanas reais disponíveis
  // Se já temos semanas do mês atual, extrapolamos para 4 semanas com base na média real
  const semanasComDados = allAnalises.filter(r => (r.total_conversas || 0) > 0)
  const mediaConvSemana = semanasComDados.length > 0
    ? semanasComDados.reduce((s, r) => s + (r.total_conversas || 0), 0) / semanasComDados.length
    : convSemana
  const semanasNoMes = 4
  const custoMesEstUSD = mediaConvSemana * semanasNoMes * CUSTO_CONV_USD
  const custoMesEstBRL = custoMesEstUSD * usdBrl
  const baseEstimativa = `média de ${semanasComDados.length} semana(s) real(is): ${Math.round(mediaConvSemana)} conv/sem × ${semanasNoMes} sem`

  // Custo real acumulado do mês selecionado (soma das semanas já registradas)
  const custoMesRealUSD = convDoMes * CUSTO_CONV_USD
  const custoMesRealBRL = custoMesRealUSD * usdBrl

  // Projeções de escala — baseadas na média real de conversas por aluno
  // Base: média de conversas/aluno/semana das últimas semanas com dados
  const convPorAlunoMedia = semanasComDados.length > 0
    ? semanasComDados.reduce((s, r) => s + ((r.total_conversas || 0) / Math.max(r.total_ativos || 1, 1)), 0) / semanasComDados.length
    : (data?.total_ativos ? convSemana / data.total_ativos : 0)
  const convPorAluno_ = convPorAlunoMedia
  const baseProjecao = `${convPorAlunoMedia.toFixed(1)} conv/aluno/sem · média de ${semanasComDados.length} semana(s)`

  const projecoes = [
    {label:'Atual', leads: data?.total_ativos||0},
    {label:'2.5x',  leads: Math.round((data?.total_ativos||0)*2.5)},
    {label:'5x',    leads: Math.round((data?.total_ativos||0)*5)},
    {label:'10x',   leads: Math.round((data?.total_ativos||0)*10)},
    {label:'20x',   leads: Math.round((data?.total_ativos||0)*20)},
  ].map(p=>{
    const cSem = Math.round(convPorAlunoMedia * p.leads)
    const cMes = cSem * semanasNoMes
    const usdSem = cSem * CUSTO_CONV_USD
    const usdMes = cMes * CUSTO_CONV_USD
    return {
      ...p,
      conv: cSem,
      convMes: cMes,
      usdSem: usdSem.toFixed(2),
      brlSem: (usdSem * usdBrl).toFixed(2),
      usdMes: usdMes.toFixed(2),
      brlMes: (usdMes * usdBrl).toFixed(2),
    }
  })

  // Histórico semanas com custo
  const historico = allAnalises.slice(0,10).reverse().map(r=>({
    s: r.semana?.split('-W')[1] ? `S${r.semana.split('-W')[1]}` : r.semana?.slice(-2),
    conv: r.total_conversas||0,
    ativos: r.total_ativos||0,
    crise: r.total_crise||0,
    prog: r.total_progresso||0,
    custoUSD: parseFloat(((r.total_conversas||0)*CUSTO_CONV_USD).toFixed(3)),
  }))

  const diasEng  = [{d:'Seg',v:18},{d:'Ter',v:24},{d:'Qua',v:31},{d:'Qui',v:27},{d:'Sex',v:22},{d:'Sáb',v:14},{d:'Dom',v:9}]
  const horasEng = [{h:'6h',v:3},{h:'8h',v:8},{h:'10h',v:14},{h:'12h',v:11},{h:'14h',v:9},{h:'16h',v:12},{h:'18h',v:19},{h:'20h',v:22},{h:'22h',v:15}]

  const g=(cols)=>({display:'grid',gridTemplateColumns:mobile?'1fr':`repeat(${cols}, 1fr)`,gap:14,marginBottom:16})

  const mainTabs=[
    {id:'geral',     label:mobile?'📊':'📊 Geral'},
    {id:'resgate',   label:mobile?'🔵':'🔵 Resgate'},
    {id:'ccc',       label:mobile?'🟣':'🟣 CCC'},
    {id:'comercial', label:mobile?'🚀':'🚀 Operação'},
    {id:'copy',      label:mobile?'💬':'💬 Copy'},
    {id:'churn',     label:mobile?'⚠️':'⚠️ Risco'},
    {id:'custo',     label:mobile?'💵':'💵 Custo'},
  ]

  const fantResgate = fantasmas.filter(a=>a.produto==='resgate')
  const fantCCC     = fantasmas.filter(a=>a.produto==='ccc')

  // Ranking de alunos mais ativos
  const rankingAtivos = alunosAtivos
    .map(a=>({...a, msgs: convPorAluno[a.id]||0}))
    .sort((a,b)=>b.msgs-a.msgs)
    .slice(0,10)

  // Inativos há +3 dias (reengajamento)
  const agora = Date.now()
  const inativos3d = alunos.filter(a=>{
    const ultimaConv = convDiarias.filter(d=>d.total>0)
    return !convPorAluno[a.id] || Math.floor((agora-new Date(a.criado_em))/86400000) > 3
  }).slice(0,20)

  return (
    <div style={{background:T.bg,minHeight:'100vh'}}>
      <style>{`*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:${T.bg}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px}button:focus{outline:none}select option{background:${T.elevated}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{maxWidth:1000,margin:'0 auto',padding:mobile?'18px 14px':'30px 28px'}}>

        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:14}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
              <div style={{fontSize:mobile?18:22,fontWeight:700,color:T.t1,letterSpacing:'-0.02em'}}>S.O.S Roncada</div>
            </div>
            <div style={{fontSize:11,color:T.t3,paddingLeft:15}}>Central de inteligência · atualizado diariamente às 03:00</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden'}}>
              {['semana','mes'].map(t=>(
                <button key={t} onClick={()=>{setPeriodoTipo(t);setPeriodoSel(t==='semana'?(allAnalises[0]?.semana||''):(allAnalises[0]?.mes||''))}} style={{padding:'6px 14px',fontSize:11,background:periodoTipo===t?T.amber:'transparent',color:periodoTipo===t?'#000':T.t3,border:'none',cursor:'pointer',fontWeight:periodoTipo===t?700:400}}>{t==='semana'?'Semana':'Mês'}</button>
              ))}
            </div>
            <select value={periodoSel} onChange={e=>setPeriodoSel(e.target.value)} style={{background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8,color:T.t1,padding:'6px 12px',fontSize:11,cursor:'pointer',appearance:'none',minWidth:120}}>
              {periodoTipo==='semana' ? todasSemanas.map(s=><option key={s} value={s}>{s}</option>) : todosMeses.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <Tabs tabs={mainTabs} active={mainTab} onChange={setMainTab} mobile={mobile}/>

        {/* ════ GERAL ════ */}
        {mainTab==='geral' && (
          <>
            <div style={g(4)}>
              <KPI label="Alunos ativos"       value={data?.total_ativos||0}   color={T.amber} icon="👥"/>
              <KPI label="Conversas na semana" value={data?.total_conversas||0} color={T.blue}  icon="💬"/>
              <KPI label="Inativos +3 dias"    value={data?.total_inativos||0}  color={T.red}   icon="😶"/>
              <KPI label={periodoTipo==='mes'?'Custo do mês':'Custo da semana'} value={`US$ ${custoUSD.toFixed(2)}`} color={T.t3} icon="💵" sub={`R$ ${custoBRL.toFixed(2)} · câmbio ${usdBrl.toFixed(2)}`}/>
            </div>

            <div style={g(2)}>
              <Card>
                <CTitle>Distribuição por produto</CTitle>
                <BRow label="Resgate" pct={pctResgate} color={T.blue}   right={`${pctResgate}%`}/>
                <BRow label="CCC"     pct={pctCCC}     color={T.purple} right={`${pctCCC}%`}/>
                <Divider/>
                <div style={{display:'flex',gap:10}}>
                  <div style={{flex:1,background:T.elevated,borderRadius:8,padding:'10px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:700,color:T.blue}}>{totalResgate}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:2}}>Resgate</div>
                  </div>
                  <div style={{flex:1,background:T.elevated,borderRadius:8,padding:'10px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:700,color:T.purple}}>{totalCCC}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:2}}>CCC</div>
                  </div>
                </div>
              </Card>
              <Card>
                <CTitle>Conversas — histórico semanal</CTitle>
                {historico.length>1 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={historico} margin={{top:4,right:4,bottom:0,left:-24}}>
                      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.amber} stopOpacity={0.25}/><stop offset="95%" stopColor={T.amber} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="s" tick={{fontSize:10,fill:T.t3}}/>
                      <YAxis tick={{fontSize:10,fill:T.t3}}/>
                      <Tooltip contentStyle={tt}/>
                      <Area type="monotone" dataKey="conv" stroke={T.amber} fill="url(#ga)" strokeWidth={2} dot={false} name="conversas"/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Empty/>}
              </Card>
            </div>

            {/* Conversas diárias — clicável */}
            <Card style={{marginBottom:16}}>
              <CTitle right={diaSel && <button onClick={()=>setDiaSel(null)} style={{background:T.elevated,border:`1px solid ${T.border}`,borderRadius:6,color:T.t2,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>✕ Limpar</button>}>
                Mensagens por dia — últimos 14 dias {diaSel&&<span style={{color:T.amber,fontWeight:600}}> · {diaSel}</span>}
              </CTitle>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias} barSize={mobile?14:20} margin={{top:4,right:4,bottom:0,left:-24}}
                  onClick={e=>e?.activePayload && setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="dia" tick={{fontSize:9,fill:T.t3}}/>
                  <YAxis tick={{fontSize:9,fill:T.t3}}/>
                  <Tooltip contentStyle={tt} formatter={v=>[v,'mensagens']}/>
                  <Bar dataKey="total" name="mensagens" radius={[4,4,0,0]}>
                    {convDiarias.map((d,i)=><Cell key={i} fill={d.data===diaSel?T.amber:T.blue}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div style={{marginTop:12,padding:'10px 14px',background:T.elevated,borderRadius:8,fontSize:12,color:T.t2}}>
                  📅 <strong style={{color:T.t1}}>{diaSel}</strong> — {convDiarias.find(d=>d.data===diaSel)?.total||0} mensagens de usuários
                  <span style={{color:T.t3,marginLeft:12}}>· Custo estimado: US$ {((convDiarias.find(d=>d.data===diaSel)?.total||0)*CUSTO_CONV_USD).toFixed(3)}</span>
                </div>
              )}
            </Card>

            <div style={g(2)}>
              <Card>
                <CTitle>Melhores dias da semana</CTitle>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={diasEng} barSize={16} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="d" tick={{fontSize:10,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}}/>
                    <Tooltip contentStyle={tt}/>
                    <Bar dataKey="v" fill={T.blue} radius={[4,4,0,0]} name="conversas"/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>Horários de pico</CTitle>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={horasEng} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <defs><linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="h" tick={{fontSize:10,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}}/>
                    <Tooltip contentStyle={tt}/>
                    <Area type="monotone" dataKey="v" stroke={T.green} fill="url(#gh)" strokeWidth={2} dot={false} name="mensagens"/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
            {historico.length>1 && (
              <Card>
                <CTitle>Evolução da base</CTitle>
                <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap'}}>
                  {[[T.amber,'ativos'],[T.red,'em crise'],[T.green,'progresso']].map(([c,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.t3}}>
                      <div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={historico} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="s" tick={{fontSize:10,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}}/>
                    <Tooltip contentStyle={tt}/>
                    <Line type="monotone" dataKey="ativos" stroke={T.amber} strokeWidth={2} dot={{r:3}} name="ativos"/>
                    <Line type="monotone" dataKey="crise"  stroke={T.red}   strokeWidth={2} dot={{r:3}} name="crise" strokeDasharray="4 3"/>
                    <Line type="monotone" dataKey="prog"   stroke={T.green} strokeWidth={2} dot={{r:3}} name="progresso"/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}

        {/* ════ RESGATE ════ */}
        {mainTab==='resgate' && (
          <>
            <STitle icon="🔵" title="Resgate — Método Completo" sub="7 módulos · programa integral de restauração conjugal"/>
            <div style={g(3)}>
              <KPI label="Em crise"     value={data?.resgate_crise    ||0} color={T.red}   icon="🆘"/>
              <KPI label="Estáveis"     value={data?.resgate_estaveis ||0} color={T.amber} icon="⚖️"/>
              <KPI label="Em progresso" value={data?.resgate_progresso||0} color={T.green} icon="📈" sub="avançando no método"/>
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Estado emocional — Resgate</CTitle>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart barSize={34} margin={{top:4,right:4,bottom:0,left:-24}} data={[
                    {e:'Crise',    v:data?.resgate_crise    ||0},
                    {e:'Estável',  v:data?.resgate_estaveis ||0},
                    {e:'Progresso',v:data?.resgate_progresso||0},
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="e" tick={{fontSize:11,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}}/>
                    <Tooltip contentStyle={tt}/>
                    <Bar dataKey="v" name="alunos" radius={[6,6,0,0]}>
                      {[T.red,T.amber,T.green].map((c,i)=><Cell key={i} fill={c}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CTitle>Top dores — Resgate</CTitle>
                {topDores.length>0
                  ? [...topDores].sort((a,b)=>b.percentual-a.percentual).map((d,i)=><BRow key={i} rank={i+1} label={d.dor} pct={d.percentual} color={T.blue}/>)
                  : <Empty/>}
              </Card>
            </div>
            <Card>
              <CTitle>Módulos mencionados nas conversas</CTitle>
              <div style={{background:T.elevated,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:11,color:T.t2}}>
                💡 <strong style={{color:T.t1}}>Como interpretar:</strong> o clone identifica qual módulo é mais relevante para a dúvida do aluno e o menciona na resposta. Alta frequência de um módulo = muitos alunos com dúvidas daquele tema específico. Isso indica onde o conteúdo precisa de mais suporte ou aprofundamento.
              </div>
              {topModulos.length>0
                ? [...topModulos].sort((a,b)=>b.percentual-a.percentual).map((m,i)=>(
                    <div key={i} style={{marginBottom:12}}>
                      <BRow rank={i+1} label={m.modulo} pct={m.percentual} color={T.blue}/>
                    </div>
                  ))
                : <Empty/>}
            </Card>
          </>
        )}

        {/* ════ CCC ════ */}
        {mainTab==='ccc' && (
          <>
            <STitle icon="🟣" title="Como Convencer seu Cônjuge" sub="4 módulos · produto de entrada · porta para o Resgate"/>
            <div style={g(3)}>
              <KPI label="Em crise"     value={data?.ccc_crise    ||0} color={T.red}   icon="🆘"/>
              <KPI label="Estáveis"     value={data?.ccc_estaveis ||0} color={T.amber} icon="⚖️"/>
              <KPI label="Em progresso" value={data?.ccc_progresso||0} color={T.green} icon="📈"/>
            </div>
            <div style={g(2)}>
              <Card>
                <CTitle>Estado emocional — CCC</CTitle>
                {totalCCC>0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart barSize={34} margin={{top:4,right:4,bottom:0,left:-24}} data={[
                      {e:'Crise',    v:data?.ccc_crise    ||0},
                      {e:'Estável',  v:data?.ccc_estaveis ||0},
                      {e:'Progresso',v:data?.ccc_progresso||0},
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="e" tick={{fontSize:11,fill:T.t3}}/>
                      <YAxis tick={{fontSize:10,fill:T.t3}}/>
                      <Tooltip contentStyle={tt}/>
                      <Bar dataKey="v" name="alunos" radius={[6,6,0,0]}>
                        {[T.red,T.amber,T.green].map((c,i)=><Cell key={i} fill={c}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <Empty msg="Aguardando primeiros alunos CCC conversarem"/>}
              </Card>
              <Card>
                <CTitle>🔑 Sinais de upgrade para o Resgate</CTitle>
                <div style={{fontSize:11,color:T.t3,marginBottom:12}}>Alunos CCC que mencionaram temas do programa completo</div>
                <div style={{background:T.elevated,borderRadius:8,padding:'12px 14px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:22,fontWeight:700,color:T.amber}}>{Math.round(totalCCC*0.3)}</div>
                      <div style={{fontSize:11,color:T.t3,marginTop:2}}>potenciais upgrades</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:14,fontWeight:600,color:T.green}}>R$ {(Math.round(totalCCC*0.3)*150).toLocaleString('pt-BR')}</div>
                      <div style={{fontSize:10,color:T.t3}}>receita potencial</div>
                    </div>
                  </div>
                </div>
                <div style={{fontSize:10,color:T.t3}}>⚠️ Dados reais após ajuste no workflow de análise</div>
              </Card>
            </div>
            <Card>
              <CTitle>Top dores — CCC</CTitle>
              {totalCCC>0
                ? (topDores.length>0
                    ? [...topDores].sort((a,b)=>b.percentual-a.percentual).map((d,i)=><BRow key={i} rank={i+1} label={d.dor} pct={d.percentual} color={T.purple}/>)
                    : <Empty/>)
                : <Empty msg="Aguardando primeiros alunos CCC — dados aparecerão quando houver conversas deste produto"/>}
            </Card>
          </>
        )}

        {/* ════ OPERAÇÃO ════ */}
        {mainTab==='comercial' && (
          <>
            <STitle icon="🚀" title="Central de operação" sub="Engajamento, alunos ativos e reengajamento"/>

            {/* Engajamento diário */}
            <Card style={{marginBottom:14}}>
              <CTitle>📅 Engajamento diário — últimos 14 dias</CTitle>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={convDiarias} barSize={mobile?12:18} margin={{top:4,right:4,bottom:0,left:-24}}
                  onClick={e=>e?.activePayload&&setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="dia" tick={{fontSize:9,fill:T.t3}}/>
                  <YAxis tick={{fontSize:9,fill:T.t3}}/>
                  <Tooltip contentStyle={tt} formatter={v=>[v,'mensagens']}/>
                  <Bar dataKey="total" name="mensagens" radius={[4,4,0,0]}>
                    {convDiarias.map((d,i)=><Cell key={i} fill={d.data===diaSel?T.amber:T.green}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div style={{marginTop:10,padding:'8px 12px',background:T.elevated,borderRadius:8,fontSize:12,color:T.t2}}>
                  📅 <strong style={{color:T.t1}}>{diaSel}</strong> — {convDiarias.find(d=>d.data===diaSel)?.total||0} mensagens · US$ {((convDiarias.find(d=>d.data===diaSel)?.total||0)*CUSTO_CONV_USD).toFixed(3)}
                </div>
              )}
            </Card>

            {/* Ranking alunos mais ativos */}
            <Card style={{marginBottom:14}}>
              <CTitle right={<Badge color={T.amber}>{rankingAtivos.length} alunos</Badge>}>
                🏆 Alunos mais ativos — total de mensagens
              </CTitle>
              {rankingAtivos.length>0 ? (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr>{['#','Nome','Produto','Mensagens','Telefone'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'7px 10px',color:T.t3,fontWeight:500,fontSize:10,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {rankingAtivos.map((a,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:i===0?`${T.amber}11`:'transparent'}}>
                          <td style={{padding:'9px 10px',color:i===0?T.amber:T.t3,fontWeight:700}}>#{i+1}</td>
                          <td style={{padding:'9px 10px',color:T.t1,fontWeight:500}}>{a.nome||'—'}</td>
                          <td style={{padding:'9px 10px'}}><ProdBadge p={a.produto}/></td>
                          <td style={{padding:'9px 10px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:60,height:5,background:T.border,borderRadius:99,overflow:'hidden'}}>
                                <div style={{width:`${Math.min((a.msgs/(rankingAtivos[0]?.msgs||1))*100,100)}%`,height:'100%',background:i===0?T.amber:T.blue,borderRadius:99}}/>
                              </div>
                              <span style={{color:T.t1,fontWeight:600}}>{a.msgs}</span>
                            </div>
                          </td>
                          <td style={{padding:'9px 10px',color:T.t3,fontFamily:'monospace',fontSize:11}}>{a.telefone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty/>}
            </Card>

            {/* Reengajamento */}
            <Card>
              <CTitle right={<Badge color={T.red}>{data?.total_inativos||0} inativos</Badge>}>
                🔁 Reengajamento — inativos para contato
              </CTitle>
              <div style={{fontSize:11,color:T.t3,marginBottom:12}}>Alunos que podem precisar de uma mensagem manual do Pedro</div>
              {fantasmas.length>0 || (data?.total_inativos||0)>0 ? (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr>{['Nome','Produto','Telefone','Status','Ação'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'7px 10px',color:T.t3,fontWeight:500,fontSize:10,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {[...fantasmas,...alunos.filter(a=>!fantasmas.find(f=>f.id===a.id)).filter(a=>{
                        const dias=a.criado_em?Math.floor((Date.now()-new Date(a.criado_em))/86400000):0
                        return dias>3 && !convPorAluno[a.id]
                      })].slice(0,15).map((a,i)=>{
                        const dias=a.criado_em?Math.floor((Date.now()-new Date(a.criado_em))/86400000):null
                        const isFantasma=fantasmas.find(f=>f.id===a.id)
                        return(
                          <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:'9px 10px',color:T.t1,fontWeight:500}}>{a.nome||'—'}</td>
                            <td style={{padding:'9px 10px'}}><ProdBadge p={a.produto}/></td>
                            <td style={{padding:'9px 10px',color:T.t3,fontFamily:'monospace',fontSize:11}}>{a.telefone}</td>
                            <td style={{padding:'9px 10px'}}>
                              <Badge color={isFantasma?T.t3:T.amber}>{isFantasma?'nunca conversou':'inativo'}</Badge>
                            </td>
                            <td style={{padding:'9px 10px'}}><CopyBtn value={a.telefone} copied={copied} onCopy={copyNum}/></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty msg="🎉 Todos os alunos estão engajados"/>}
            </Card>
          </>
        )}

        {/* ════ COPY ════ */}
        {mainTab==='copy' && (
          <>
            <STitle icon="💬" title="Painel de copy" sub="Frases reais dos alunos — ouro para comunicação, conteúdo e vendas"/>
            <Tabs tabs={[{id:'semana',label:'📅 Esta semana'},{id:'mes',label:'🗓️ Este mês'}]} active={copyTab} onChange={setCopyTab} mobile={mobile}/>
            <Card>
              <CTitle right={<Badge color={T.amber}>{frasesCopy[copyTab].length} frases</Badge>}>
                {copyTab==='semana'?'Ranking semanal — por citações':'Ranking mensal — por citações'}
              </CTitle>
              {frasesCopy[copyTab].length>0 ? frasesCopy[copyTab].map((f,i)=>(
                <div key={i} style={{padding:'14px 0',borderBottom:i<frasesCopy[copyTab].length-1?`1px solid ${T.border}`:'none',display:'flex',gap:14,alignItems:'flex-start'}}>
                  <div style={{minWidth:28,height:28,borderRadius:8,background:i===0?T.amberD:T.elevated,color:i===0?T.amberL:T.t3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>#{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:T.t1,lineHeight:1.6,fontStyle:'italic',marginBottom:8}}>"{f.frase}"</div>
                    <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
                      <Badge color={T.amber}>{f.citacoes} citações</Badge>
                      {f.categoria&&<Badge color={T.t2}>{f.categoria}</Badge>}
                      {f.produto&&<ProdBadge p={f.produto}/>}
                    </div>
                  </div>
                </div>
              )) : <Empty/>}
            </Card>
          </>
        )}

        {/* ════ RISCO ════ */}
        {mainTab==='churn' && (
          <>
            <STitle icon="⚠️" title="Risco de churn" sub="Alunos que precisam de atenção imediata"/>
            <div style={g(3)}>
              <KPI label="Inativos +3 dias"    value={data?.total_inativos||0} color={T.red}   icon="🔕"/>
              <KPI label="Em crise ativa"       value={data?.total_crise   ||0} color={T.red}   icon="🆘" sub="mencionaram crise emocional"/>
              <KPI label="Sem progresso +7d"    value={alunosSemProgresso.length} color={T.amber} icon="📉" sub="ativos há +7 dias"/>
            </div>
            {(data?.total_crise||0)>0 && (
              <div style={{background:`${T.redD}55`,border:`1px solid ${T.red}44`,borderRadius:12,padding:'14px 18px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:20}}>🆘</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.red}}>Alunos em crise emocional detectada</div>
                  <div style={{fontSize:12,color:T.t2,marginTop:3}}>{data?.total_crise} aluno(s) mencionaram palavras de crise nas conversas desta semana. Verificar manualmente.</div>
                </div>
              </div>
            )}
            <Card style={{marginBottom:14}}>
              <CTitle right={<Badge color={T.amber}>{alunosSemProgresso.length}</Badge>}>
                📉 Alunos sem progresso — ativos há +7 dias
              </CTitle>
              {alunosSemProgresso.length>0 ? (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr>{['Nome','Produto','Telefone','Dias ativo','Ação'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'7px 10px',color:T.t3,fontWeight:500,fontSize:10,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {alunosSemProgresso.map((a,i)=>{
                        const dias=a.criado_em?Math.floor((Date.now()-new Date(a.criado_em))/86400000):null
                        return(
                          <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:'9px 10px',color:T.t1,fontWeight:500}}>{a.nome||'—'}</td>
                            <td style={{padding:'9px 10px'}}><ProdBadge p={a.produto}/></td>
                            <td style={{padding:'9px 10px',color:T.t3,fontFamily:'monospace',fontSize:11}}>{a.telefone}</td>
                            <td style={{padding:'9px 10px'}}><span style={{color:dias>30?T.red:T.amber,fontWeight:600}}>{dias!==null?`${dias}d`:'—'}</span></td>
                            <td style={{padding:'9px 10px'}}><CopyBtn value={a.telefone} copied={copied} onCopy={copyNum}/></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty msg="🎉 Nenhum aluno parado"/>}
            </Card>
            <Card>
              <CTitle>Evolução do risco</CTitle>
              {historico.length>1 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={historico} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={0.2}/><stop offset="95%" stopColor={T.red} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="s" tick={{fontSize:10,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}}/>
                    <Tooltip contentStyle={tt}/>
                    <Area type="monotone" dataKey="crise" stroke={T.red} fill="url(#gr)" strokeWidth={2} dot={{r:3,fill:T.red}} name="em crise"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty/>}
            </Card>
          </>
        )}

        {/* ════ CUSTO ════ */}
        {mainTab==='custo' && (
          <>
            <STitle icon="💵" title="Custo do clone" sub={`claude-sonnet-4-6 · $3/MTok input + $15/MTok output · câmbio US$1 = R$${usdBrl.toFixed(2)} (tempo real)`}/>
            {periodoTipo==='mes' && custoMesRealUSD>0 && (
              <div style={{background:`${T.green}11`,border:`1px solid ${T.green}33`,borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:12,color:T.t2}}>
                ✅ <strong style={{color:T.green}}>Custo real acumulado — {mesSel}:</strong> US$ {custoMesRealUSD.toFixed(2)} · R$ {custoMesRealBRL.toFixed(2)} · {semanasSdoMes.length} semana(s) · {convDoMes} conversas
              </div>
            )}
            <div style={g(3)}>
              <KPI
                label={periodoTipo==='mes' ? 'Custo real do mês' : 'Custo da semana'}
                value={`US$ ${custoUSD.toFixed(2)}`}
                color={T.amber} icon="📅"
                sub={`R$ ${custoBRL.toFixed(2)} · ${convPeriodo} conv.` + (periodoTipo==='mes' ? ` · ${semanasSdoMes.length} sem.` : '')}
              />
              <KPI
                label="Estimativa mensal"
                value={`US$ ${custoMesEstUSD.toFixed(2)}`}
                color={T.blue} icon="🗓️"
                sub={`R$ ${custoMesEstBRL.toFixed(2)} · média de ${semanasComDados.length} sem. reais`}
              />
              <KPI label="Custo por conversa" value={`US$ ${CUSTO_CONV_USD.toFixed(4)}`} color={T.t3} icon="💬" sub={`R$ ${(CUSTO_CONV_USD*usdBrl).toFixed(4)} · 800tok in + 300tok out`}/>
            </div>

            {historico.length>1 && (
              <Card style={{marginBottom:14}}>
                <CTitle>Custo semanal — histórico (US$)</CTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={historico} margin={{top:4,right:4,bottom:0,left:-10}}>
                    <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.amber} stopOpacity={0.25}/><stop offset="95%" stopColor={T.amber} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="s" tick={{fontSize:10,fill:T.t3}}/>
                    <YAxis tick={{fontSize:10,fill:T.t3}} tickFormatter={v=>`$${v.toFixed(2)}`}/>
                    <Tooltip contentStyle={tt} formatter={v=>[`US$ ${v.toFixed(3)} · R$ ${(v*usdBrl).toFixed(2)}`,'custo']}/>
                    <Area type="monotone" dataKey="custoUSD" stroke={T.amber} fill="url(#gc)" strokeWidth={2} dot={{r:3,fill:T.amber}} name="custo US$"/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Custo diário clicável */}
            <Card style={{marginBottom:14}}>
              <CTitle right={diaSel&&<button onClick={()=>setDiaSel(null)} style={{background:T.elevated,border:`1px solid ${T.border}`,borderRadius:6,color:T.t2,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>✕</button>}>
                Custo por dia — últimos 14 dias (US$) {diaSel&&<span style={{color:T.amber,fontWeight:600}}> · {diaSel}</span>}
              </CTitle>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={convDiarias.map(d=>({...d,custoUSD:parseFloat((d.total*CUSTO_CONV_USD).toFixed(4))}))} barSize={mobile?12:18} margin={{top:4,right:4,bottom:0,left:-10}}
                  onClick={e=>e?.activePayload&&setDiaSel(e.activePayload[0]?.payload?.data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="dia" tick={{fontSize:9,fill:T.t3}}/>
                  <YAxis tick={{fontSize:9,fill:T.t3}} tickFormatter={v=>`$${v.toFixed(3)}`}/>
                  <Tooltip contentStyle={tt} formatter={(v,n,p)=>[`US$ ${v.toFixed(4)} · R$ ${(v*usdBrl).toFixed(3)}`,'custo']}/>
                  <Bar dataKey="custoUSD" name="custo US$" radius={[4,4,0,0]}>
                    {convDiarias.map((d,i)=><Cell key={i} fill={d.data===diaSel?T.amberL:T.amber}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {diaSel && (
                <div style={{marginTop:10,padding:'10px 14px',background:T.elevated,borderRadius:8,fontSize:12}}>
                  <span style={{color:T.t1,fontWeight:600}}>📅 {diaSel}</span>
                  <span style={{color:T.t2,marginLeft:12}}>{convDiarias.find(d=>d.data===diaSel)?.total||0} mensagens</span>
                  <span style={{color:T.amber,marginLeft:12,fontWeight:600}}>US$ {((convDiarias.find(d=>d.data===diaSel)?.total||0)*CUSTO_CONV_USD).toFixed(4)}</span>
                  <span style={{color:T.t3,marginLeft:8}}>· R$ {((convDiarias.find(d=>d.data===diaSel)?.total||0)*CUSTO_CONV_USD*usdBrl).toFixed(3)}</span>
                </div>
              )}
            </Card>

            {/* Projeções */}
            <Card style={{marginBottom:14}}>
              <CTitle>Projeção por escala</CTitle>
              <div style={{background:T.elevated,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:11,color:T.t2}}>
                📐 <strong style={{color:T.t1}}>Base do cálculo:</strong> {baseProjecao}<br/>
                <span style={{color:T.t3}}>Fórmula: leads × {convPorAluno_.toFixed(1)} conv/aluno/sem × custo/conv (US$ {CUSTO_CONV_USD.toFixed(4)}) × câmbio R${usdBrl.toFixed(2)}</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr>{['Escala','Leads','Conv/sem','Conv/mês','US$/sem','R$/sem','US$/mês','R$/mês'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 12px',color:T.t3,fontWeight:500,fontSize:10,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {projecoes.map((p,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:i===0?`${T.amber}11`:'transparent'}}>
                        <td style={{padding:'10px 12px'}}><span style={{background:i===0?T.amberD:T.elevated,color:i===0?T.amberL:T.t2,padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:600}}>{p.label}</span></td>
                        <td style={{padding:'10px 12px',color:T.t1,fontWeight:500}}>{p.leads.toLocaleString('pt-BR')}</td>
                        <td style={{padding:'10px 12px',color:T.t2}}>{p.conv.toLocaleString('pt-BR')}</td>
                        <td style={{padding:'10px 12px',color:T.t2}}>{p.convMes.toLocaleString('pt-BR')}</td>
                        <td style={{padding:'10px 12px',color:T.amber,fontWeight:600}}>US$ {p.usdSem}</td>
                        <td style={{padding:'10px 12px',color:T.t2}}>R$ {p.brlSem}</td>
                        <td style={{padding:'10px 12px',color:T.blue,fontWeight:600}}>US$ {p.usdMes}</td>
                        <td style={{padding:'10px 12px',color:T.green,fontWeight:600}}>R$ {p.brlMes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CTitle>Custo mensal projetado por escala (R$)</CTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={projecoes} barSize={36} margin={{top:4,right:4,bottom:0,left:-10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="label" tick={{fontSize:11,fill:T.t3}}/>
                  <YAxis tick={{fontSize:10,fill:T.t3}} tickFormatter={v=>`R$${v}`}/>
                  <Tooltip contentStyle={tt} formatter={(v,n,p)=>[`R$ ${p.payload.brlMes}/mês · US$ ${p.payload.usdMes}/mês`,'custo mensal']}/>
                  <Bar dataKey="mesBRL" name="R$/mês" radius={[6,6,0,0]}>
                    {projecoes.map((_,i)=><Cell key={i} fill={i===0?T.amber:i<3?T.blue:T.purple}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{fontSize:10,color:T.t3,marginTop:10}}>
                * câmbio em tempo real: US$1 = R${usdBrl.toFixed(2)} · modelo: claude-sonnet-4-6 · ~{TOK_IN} tokens input + {TOK_OUT} output por conversa
              </div>
            </Card>
          </>
        )}

        <div style={{textAlign:'center',fontSize:10,color:T.t4,marginTop:48,paddingBottom:24}}>
          S.O.S Roncada · dados confidenciais · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
