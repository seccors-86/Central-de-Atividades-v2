import { query } from '../config/database.js';

/**
 * Retorna todos os IDs das áreas que pertencem à subárvore da área fornecida (incluindo ela mesma).
 */
export const getSubtreeAreaIds = async (areaId: string): Promise<string[]> => {
  if (!areaId) return [];
  
  const result = await query(`
    WITH RECURSIVE subareas AS (
      SELECT id FROM areas WHERE id = $1
      UNION ALL
      SELECT a.id FROM areas a
      INNER JOIN subareas s ON a.parent_id = s.id
    )
    SELECT id FROM subareas
  `, [areaId]);
  
  return result.rows.map(row => row.id);
};

/**
 * Retorna o ID da área raiz (de maior hierarquia) à qual a área fornecida pertence.
 */
export const getRootAreaId = async (areaId: string): Promise<string> => {
  if (!areaId) return '';
  
  const result = await query(`
    WITH RECURSIVE parent_areas AS (
      SELECT id, parent_id FROM areas WHERE id = $1
      UNION ALL
      SELECT a.id, a.parent_id FROM areas a
      INNER JOIN parent_areas p ON a.id = p.parent_id
    )
    SELECT id FROM parent_areas WHERE parent_id IS NULL OR parent_id = '' LIMIT 1
  `, [areaId]);

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }
  return areaId;
};
