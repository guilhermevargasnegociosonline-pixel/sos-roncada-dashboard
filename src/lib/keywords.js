// Extração de palavras-chave client-side — sem depender de reprocessar a análise em lote.
// Prioriza termos do universo de relacionamento/reconquista (mais úteis pra copy/vendas do
// que uma extração genérica), com fallback pra palavras significativas quando nada do
// vocabulário bate.

const VOCABULARIO_TEMA = [
  'traição', 'traiu', 'trair', 'infidelidade', 'amante',
  'separação', 'separados', 'divórcio', 'divorciar',
  'silêncio', 'silencio', 'bloqueou', 'bloqueio', 'ignorando', 'ignorou',
  'ciúme', 'ciumes', 'ciumento',
  'filhos', 'filha', 'filho', 'crianças',
  'perdão', 'perdoar', 'arrependimento', 'arrependido',
  'reconciliação', 'reconciliar', 'restauração', 'restaurar', 'reconquista', 'reconquistar',
  'confiança', 'desconfiança',
  'oração', 'deus', 'fé', 'igreja',
  'depressão', 'ansiedade', 'crise',
  'saudade', 'sozinho', 'sozinha', 'solidão',
  'amor', 'apaixonado', 'apaixonada',
  'medo', 'insegurança', 'inseguro', 'insegura',
  'raiva', 'mágoa', 'magoada', 'magoado', 'dor', 'sofrimento',
  'casamento', 'casados', 'esposa', 'marido', 'cônjuge',
  'namoro', 'namorado', 'namorada',
]

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'uns', 'umas', 'e', 'é', 'que', 'com', 'por', 'para', 'pra', 'pro',
  'eu', 'ele', 'ela', 'eles', 'elas', 'nós', 'você', 'voce', 'vc', 'me', 'te', 'se', 'lhe',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa',
  'mais', 'muito', 'muita', 'já', 'ja', 'não', 'nao', 'sim', 'ainda', 'como', 'quando',
  'foi', 'ser', 'estar', 'está', 'esta', 'estou', 'está', 'tem', 'têm', 'ter', 'tinha',
  'isso', 'isso', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'tudo', 'nada',
  'mas', 'ou', 'só', 'so', 'bem', 'sobre', 'até', 'ate', 'depois', 'antes', 'agora',
  'vou', 'vai', 'fazer', 'fiz', 'faço', 'quero', 'queria', 'posso', 'consigo',
])

function normalizar(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function extrairPalavrasChave(frase, max = 3) {
  if (!frase) return []
  const fraseNorm = normalizar(frase)
  const encontradas = []

  for (const termo of VOCABULARIO_TEMA) {
    const termoNorm = normalizar(termo)
    // \b nas bordas evita que "filho" seja "encontrado" dentro de "filhos", ou "ciúme" dentro de "ciúmes"
    const bate = new RegExp(`\\b${termoNorm}\\b`).test(fraseNorm)
    if (bate && !encontradas.some(t => normalizar(t) === termoNorm)) {
      encontradas.push(termo)
    }
    if (encontradas.length >= max) break
  }

  if (encontradas.length < max) {
    const palavras = frase
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(p => p.length >= 5 && !STOPWORDS.has(normalizar(p)))
    const vistos = new Set(encontradas.map(normalizar))
    for (const p of palavras) {
      const pn = normalizar(p)
      if (!vistos.has(pn)) {
        encontradas.push(p.toLowerCase())
        vistos.add(pn)
      }
      if (encontradas.length >= max) break
    }
  }

  return encontradas
}
