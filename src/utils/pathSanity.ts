// src/utils/pathSanity.ts
export function normalizeStoragePath(raw: string): string[] {
    // Remove / inicial e colapsa barras duplas
    const cleaned = raw.replace(/^\/+/, '').replace(/\/{2,}/g, '/').trim()
  
    const parts = cleaned.split('/')
    const candidates: string[] = [cleaned]
  
    // Padrão atual observado: empresa/<eid>/colaborador/<cid>/<resto>
    // Gerar candidato sem os rótulos (histórico comum do projeto):
    // => <eid>/<cid>/<resto>
    if (parts[0] === 'empresa' && parts[2] === 'colaborador' && parts.length >= 5) {
      const eid = parts[1]
      const cid = parts[3]
      const resto = parts.slice(4).join('/')
      candidates.push(`${eid}/${cid}/${resto}`)
    }
  
    // Dedup
    return Array.from(new Set(candidates))
  }
  