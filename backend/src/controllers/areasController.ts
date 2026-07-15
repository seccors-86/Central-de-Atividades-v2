import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { getSubtreeAreaIds } from '../utils/hierarchy.js';

// Get all areas
export const getAllAreas = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM areas ORDER BY name');
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id
    })));
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
};

// Get area by ID
export const getAreaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM areas WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching area:', error);
    res.status(500).json({ error: 'Failed to fetch area' });
  }
};

// Create new area
export const createArea = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id, name, parentId } = req.body;
    
    // Se gestor, validar limites
    if (user.role === 'manager') {
      if (!parentId) {
        return res.status(403).json({ error: 'Gestores não podem criar gerências/áreas raiz de nível superior.' });
      }
      const allowedAreas = await getSubtreeAreaIds(user.area_id);
      if (!allowedAreas.includes(parentId)) {
        return res.status(403).json({ error: 'Você só pode criar subáreas dentro da sua própria área/gerência.' });
      }
    }
    
    const result = await query(
      'INSERT INTO areas (id, name, parent_id) VALUES ($1, $2, $3) RETURNING *',
      [id, name, parentId || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({ error: 'Failed to create area' });
  }
};

// Update area (or create if doesn't exist)
export const updateArea = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, parentId } = req.body;
    
    // Se gestor, validar limites
    if (user.role === 'manager') {
      const allowedAreas = await getSubtreeAreaIds(user.area_id);
      
      // Checar se a área já existe
      const existing = await query('SELECT id FROM areas WHERE id = $1', [id]);
      
      if (existing.rows.length > 0) {
        // A área editada precisa estar na subárvore do gestor
        if (!allowedAreas.includes(id)) {
          return res.status(403).json({ error: 'Você não tem permissão para editar áreas de outros setores.' });
        }
      }
      
      // O gestor não pode remover o parentId (tornando-a área raiz)
      if (!parentId) {
        return res.status(403).json({ error: 'Gestores não podem transformar subáreas em gerências raiz.' });
      }
      
      // O novo pai deve pertencer à subárvore do gestor
      if (!allowedAreas.includes(parentId)) {
        return res.status(403).json({ error: 'O setor pai precisa pertencer à sua própria área/gerência.' });
      }
    }
    
    // Use UPSERT: Insert if not exists, update if exists
    const result = await query(
      `INSERT INTO areas (id, name, parent_id) 
       VALUES ($1, $2, $3)
       ON CONFLICT (id) 
       DO UPDATE SET name = $2, parent_id = $3
       RETURNING *`,
      [id, name, parentId || null]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating area:', error);
    res.status(500).json({ error: 'Failed to update area' });
  }
};

// Delete area
export const deleteArea = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Se gestor, validar limites
    if (user.role === 'manager') {
      const allowedAreas = await getSubtreeAreaIds(user.area_id);
      
      // O gestor não pode excluir sua própria gerência raiz
      if (id === user.area_id) {
        return res.status(403).json({ error: 'Você não pode excluir a sua própria gerência raiz.' });
      }
      
      if (!allowedAreas.includes(id)) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir áreas fora da sua gerência.' });
      }
    }
    
    const result = await query('DELETE FROM areas WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    res.json({ message: 'Area deleted successfully' });
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({ error: 'Failed to delete area' });
  }
};
