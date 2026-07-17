import type { Request, Response } from 'express';
import { query } from '../config/database.js';
import { recordSecurityEvent } from '../security/audit.js';

const toSummary = (row: any) => ({
  id: row.id,
  date: row.date,
  title: row.title || 'Resumo com IA',
  content: row.content,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  templateId: row.template_id || 'legacy',
  question: row.question || '',
  format: row.format || 'markdown',
  scopeType: row.scope_type || 'all',
  scopeId: row.scope_id || null,
  scopeLabel: row.scope_label || 'Toda a empresa',
  provider: row.provider || 'legacy',
  model: row.model || '',
  createdBy: row.created_by || null,
  createdByName: row.created_by_name || '',
  metadata: row.metadata || {},
  createdAt: row.created_at
});

export const getAllAISummaries = async (req: Request, res: Response) => {
  try {
    const result = req.user.role === 'admin'
      ? await query(`SELECT s.*, u.name AS created_by_name
          FROM ai_summaries s LEFT JOIN users u ON u.id = s.created_by
          ORDER BY s.created_at DESC LIMIT 250`)
      : await query(`SELECT s.*, u.name AS created_by_name
          FROM ai_summaries s LEFT JOIN users u ON u.id = s.created_by
          WHERE s.created_by = $1 ORDER BY s.created_at DESC LIMIT 250`, [req.user.id]);
    res.json(result.rows.map(toSummary));
  } catch (error) {
    console.error('Error fetching AI summaries:', error);
    res.status(500).json({ error: 'Falha ao buscar o histórico de relatórios com IA.' });
  }
};

export const deleteAISummary = async (req: Request, res: Response) => {
  try {
    const result = req.user.role === 'admin'
      ? await query('DELETE FROM ai_summaries WHERE id = $1 RETURNING id', [req.params.id])
      : await query('DELETE FROM ai_summaries WHERE id = $1 AND created_by = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Relatório não encontrado.' });
    void recordSecurityEvent(req, 'ai_report_deleted', 200, { report_id: req.params.id });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting AI summary:', error);
    res.status(500).json({ error: 'Falha ao excluir o relatório.' });
  }
};
