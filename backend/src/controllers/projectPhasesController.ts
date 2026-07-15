import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getPhases = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM project_phases ORDER BY position ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project phases:', error);
    res.status(500).json({ error: 'Failed to fetch project phases' });
  }
};

export const createPhase = async (req: Request, res: Response) => {
  try {
    const { name, color, position } = req.body;
    const result = await query(
      'INSERT INTO project_phases (name, color, position) VALUES ($1, $2, $3) RETURNING *',
      [name, color, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project phase:', error);
    res.status(500).json({ error: 'Failed to create project phase' });
  }
};

export const updatePhase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, position } = req.body;
    const result = await query(
      'UPDATE project_phases SET name = $1, color = $2, position = $3 WHERE id = $4 RETURNING *',
      [name, color, position, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project phase:', error);
    res.status(500).json({ error: 'Failed to update project phase' });
  }
};

export const deletePhase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM project_phases WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    res.json({ message: 'Phase deleted successfully' });
  } catch (error) {
    console.error('Error deleting project phase:', error);
    res.status(500).json({ error: 'Failed to delete project phase' });
  }
};
