import { Request, Response } from 'express';
import { query, getClient } from '../config/database.js';
import { awardXP } from '../utils/gamificationEngine.js';

// Get all activity logs with tags
export const getAllActivityLogs = async (req: Request, res: Response) => {
  try {
    // Get all logs
    const logsResult = await query(`
      SELECT al.*, 
             json_agg(DISTINCT alt.tag_id) FILTER (WHERE alt.tag_id IS NOT NULL) as tag_ids
      FROM activity_logs al
      LEFT JOIN activity_log_tags alt ON al.id = alt.activity_log_id
      GROUP BY al.id
      ORDER BY al.date DESC, al.timestamp DESC
    `);
    
    // Transform snake_case to camelCase for frontend compatibility
    const logs = logsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      date: row.date,
      content: row.content,
      status: row.status,
      timestamp: parseInt(row.timestamp),
      tagIds: row.tag_ids || []
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

// Get activity log by ID
export const getActivityLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT al.*, 
             json_agg(DISTINCT alt.tag_id) FILTER (WHERE alt.tag_id IS NOT NULL) as tag_ids
      FROM activity_logs al
      LEFT JOIN activity_log_tags alt ON al.id = alt.activity_log_id
      WHERE al.id = $1
      GROUP BY al.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    const row = result.rows[0];
    const log = {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      content: row.content,
      status: row.status,
      timestamp: parseInt(row.timestamp),
      tagIds: row.tag_ids || []
    };
    
    res.json(log);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
};

// Create new activity log
export const createActivityLog = async (req: Request, res: Response) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id, userId, date, content, status, timestamp, tagIds } = req.body;
    
    // Insert activity log
    const logResult = await client.query(
      'INSERT INTO activity_logs (id, user_id, date, content, status, timestamp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, userId, date, content, status, timestamp]
    );
    
    // Insert tags if provided
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await client.query(
          'INSERT INTO activity_log_tags (activity_log_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const row = logResult.rows[0];
    const log = {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      content: row.content,
      status: row.status,
      timestamp: parseInt(row.timestamp),
      tagIds: tagIds || []
    };

    // Processar gamificação e atribuir XP
    let gamificationResult = null;
    try {
      gamificationResult = await awardXP(userId, 'activity_log', {
        date: row.date,
        timestamp: parseInt(row.timestamp)
      });
    } catch (gErr) {
      console.error('Erro ao conceder XP para log de atividade:', gErr);
    }
    
    res.status(201).json({
      ...log,
      gamification: gamificationResult
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  } finally {
    client.release();
  }
};

// Update activity log
export const updateActivityLog = async (req: Request, res: Response) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { userId, date, content, status, timestamp, tagIds } = req.body;
    
    // Update activity log
    const logResult = await client.query(
      'UPDATE activity_logs SET user_id = $1, date = $2, content = $3, status = $4, timestamp = $5 WHERE id = $6 RETURNING *',
      [userId, date, content, status, timestamp, id]
    );
    
    if (logResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    // Delete existing tags
    await client.query('DELETE FROM activity_log_tags WHERE activity_log_id = $1', [id]);
    
    // Insert new tags
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await client.query(
          'INSERT INTO activity_log_tags (activity_log_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const row = logResult.rows[0];
    const log = {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      content: row.content,
      status: row.status,
      timestamp: parseInt(row.timestamp),
      tagIds: tagIds || []
    };
    
    res.json(log);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating activity log:', error);
    res.status(500).json({ error: 'Failed to update activity log' });
  } finally {
    client.release();
  }
};

// Delete activity log
export const deleteActivityLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM activity_logs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    res.json({ message: 'Activity log deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity log:', error);
    res.status(500).json({ error: 'Failed to delete activity log' });
  }
};
