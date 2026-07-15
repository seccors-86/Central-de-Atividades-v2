import { Request, Response } from 'express';
import { query } from '../config/database.js';

// Get all status configs
export const getAllStatuses = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM status_configs ORDER BY label');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
};

// Create new status
export const createStatus = async (req: Request, res: Response) => {
  try {
    const { id, label, color, type } = req.body;
    
    const result = await query(
      'INSERT INTO status_configs (id, label, color, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, label, color, type]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
};

// Update status
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, color, type } = req.body;
    
    const result = await query(
      'UPDATE status_configs SET label = $1, color = $2, type = $3 WHERE id = $4 RETURNING *',
      [label, color, type, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Delete status
export const deleteStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM status_configs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    res.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error deleting status:', error);
    res.status(500).json({ error: 'Failed to delete status' });
  }
};
