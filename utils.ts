/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID() if available (secure contexts),
 * otherwise falls back to a timestamp-based random string generator.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for non-secure contexts (http)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Formata um valor de minutos estimados (string ou número) para exibição amigável.
 * Se for um valor numérico puro, trata como minutos (ex: "90" -> "1h 30m").
 * Se contiver letras, retorna o próprio texto (compatibilidade legado).
 */
export function formatEstimatedMinutes(str: string | undefined): string {
  if (!str) return '0h';
  const trimmed = str.trim();
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    const mins = parseFloat(trimmed.replace(',', '.')) || 0;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) {
      return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
    }
    return `${m}m`;
  }
  return trimmed;
}

/**
 * Converte um valor de tempo estimado (string ou número) para horas fracionadas (number).
 * Trata número puro como minutos.
 */
export function parseHoursStr(str: string | undefined): number {
  if (!str) return 0;
  const trimmed = str.trim();
  // Se for um número puro, tratamos como minutos (ex: "90" -> 1.5 horas)
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    const mins = parseFloat(trimmed.replace(',', '.')) || 0;
    return mins / 60;
  }
  // Formato legado "2h 30m"
  const match = trimmed.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (match) {
    const h = parseInt(match[1]) || 0;
    const m = parseInt(match[2]) || 0;
    return h + (m / 60);
  }
  // Formato legado com apenas minutos "90m" ou "90 min"
  const minMatch = trimmed.match(/(\d+)\s*(?:m|min)/i);
  if (minMatch) {
    const m = parseInt(minMatch[1]) || 0;
    return m / 60;
  }
  return (parseFloat(trimmed.replace(',', '.')) || 0) / 60; // Padrão minutos
}

/**
 * Retorna os IDs da área solicitada e de todas as suas descendentes (filhas, netas, etc.)
 */
export function getAreaDescendants(areaIds: string[], allAreas: any[]): string[] {
  if (!areaIds || areaIds.length === 0) return [];
  const resultSet = new Set<string>(areaIds);
  let newlyAdded = true;

  while (newlyAdded) {
    newlyAdded = false;
    for (const area of allAreas) {
      const pid = area.parentId || area.parent_id;
      if (pid && resultSet.has(pid) && !resultSet.has(area.id)) {
        resultSet.add(area.id);
        newlyAdded = true;
      }
    }
  }
  return Array.from(resultSet);
}

/**
 * Regra de filtro hierárquico:
 * - Gerência (área com subáreas) inclui suas subáreas.
 * - Subárea (sem filhos) filtra somente ela mesma.
 */
export function getHierarchicalAreaFilterIds(areaIds: string[], allAreas: any[]): string[] {
  if (!areaIds || areaIds.length === 0) return [];

  const resultSet = new Set<string>();
  for (const areaId of areaIds) {
    const area = allAreas.find((a: any) => a.id === areaId);
    const hasChildren = allAreas.some((a: any) => (a.parentId || a.parent_id) === areaId);

    if (area && hasChildren) {
      getAreaDescendants([areaId], allAreas).forEach(id => resultSet.add(id));
    } else {
      resultSet.add(areaId);
    }
  }

  return Array.from(resultSet);
}
