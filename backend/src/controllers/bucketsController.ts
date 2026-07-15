import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getBuckets = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM kanban_buckets ORDER BY position ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({ error: 'Failed to fetch buckets' });
  }
};

export const createBucket = async (req: Request, res: Response) => {
  try {
    const { id, name, color, position } = req.body;
    const result = await query(
      'INSERT INTO kanban_buckets (id, name, color, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, color, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ error: 'Failed to create bucket' });
  }
};

export const updateBucket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, position } = req.body;
    const result = await query(
      'UPDATE kanban_buckets SET name = $1, color = $2, position = $3 WHERE id = $4 RETURNING *',
      [name, color, position, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bucket:', error);
    res.status(500).json({ error: 'Failed to update bucket' });
  }
};

export const deleteBucket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Optional: Check if there are tasks using this bucket before deleting? 
    // Usually it's better to move them to 'todo' or another column.
    // For now, let's just delete it.
    const result = await query('DELETE FROM kanban_buckets WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    res.json({ message: 'Bucket deleted successfully' });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({ error: 'Failed to delete bucket' });
  }
};
