import { Request, Response } from 'express';
import { query } from '../config/database.js';

// Get all tags
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

// Create new tag
export const createTag = async (req: Request, res: Response) => {
  try {
    const { id, name, color } = req.body;
    
    const result = await query(
      'INSERT INTO tags (id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [id, name, color]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
};

// Update tag
export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    
    const result = await query(
      'UPDATE tags SET name = $1, color = $2 WHERE id = $3 RETURNING *',
      [name, color, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
};

// Delete tag
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
};
