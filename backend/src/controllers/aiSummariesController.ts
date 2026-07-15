import { Request, Response } from 'express';
import { query } from '../config/database.js';

// Get all AI summaries
export const getAllAISummaries = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM ai_summaries ORDER BY created_at DESC');
    
    // Transform to camelCase
    const summaries = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      content: row.content,
      periodStart: row.period_start,
      periodEnd: row.period_end
    }));
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching AI summaries:', error);
    res.status(500).json({ error: 'Failed to fetch AI summaries' });
  }
};

// Create new AI summary
export const createAISummary = async (req: Request, res: Response) => {
  try {
    const { id, date, content, periodStart, periodEnd } = req.body;
    
    const result = await query(
      'INSERT INTO ai_summaries (id, date, content, period_start, period_end) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, date, content, periodStart, periodEnd]
    );
    
    const row = result.rows[0];
    const summary = {
      id: row.id,
      date: row.date,
      content: row.content,
      periodStart: row.period_start,
      periodEnd: row.period_end
    };
    
    res.status(201).json(summary);
  } catch (error) {
    console.error('Error creating AI summary:', error);
    res.status(500).json({ error: 'Failed to create AI summary' });
  }
};
