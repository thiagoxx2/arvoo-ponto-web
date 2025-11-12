/**
 * Normaliza storage_path gerando variações comuns
 * 
 * Padrão observado: empresa/<eid>/colaborador/<cid>/<arquivo>
 * Padrão alternativo: <eid>/<cid>/<arquivo>
 * 
 * Esta função gera ambos os candidatos para tentar em ordem
 */
export function normalizeStoragePath(raw: string): string[] {
  // Remove / inicial e colapsa barras duplas
  const cleaned = raw
    .replace(/^\/+/, '')           // Remove / do início
    .replace(/\/{2,}/g, '/')       // Colapsa // para /
    .trim()
  
  const parts = cleaned.split('/')
  const candidates: string[] = [cleaned] // Sempre tenta o original primeiro
  
  // Padrão: empresa/<eid>/colaborador/<cid>/<resto>
  // Gerar candidato sem os rótulos: <eid>/<cid>/<resto>
  if (parts[0] === 'empresa' && parts[2] === 'colaborador' && parts.length >= 5) {
    const eid = parts[1]     // ID da empresa
    const cid = parts[3]     // ID do colaborador
    const resto = parts.slice(4).join('/') // Resto do path (arquivo)
    
    const withoutLabels = `${eid}/${cid}/${resto}`
    candidates.push(withoutLabels)
  }
  
  // Padrão inverso: <eid>/<cid>/<resto>
  // Gerar candidato com labels: empresa/<eid>/colaborador/<cid>/<resto>
  if (parts.length >= 3 && !parts[0].startsWith('empresa')) {
    // Verificar se é um UUID (formato comum)
    const looksLikeUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    
    if (looksLikeUuid(parts[0]) && looksLikeUuid(parts[1])) {
      const eid = parts[0]
      const cid = parts[1]
      const resto = parts.slice(2).join('/')
      
      const withLabels = `empresa/${eid}/colaborador/${cid}/${resto}`
      candidates.push(withLabels)
    }
  }
  
  // Remover duplicatas mantendo ordem
  return Array.from(new Set(candidates))
}
