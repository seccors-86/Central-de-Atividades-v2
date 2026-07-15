import { Request, Response } from 'express';
import { query } from '../config/database.js';
import crypto from 'crypto';

const ensureTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS project_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS project_statuses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6b7280',
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS project_kpis (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`
    INSERT INTO project_categories (id, name, position)
    SELECT * FROM (VALUES
      ('sustentacao', 'Sustentação', 1),
      ('estrategico', 'Estratégico', 2),
      ('inovacao', 'Inovação', 3),
      ('rpa', 'RPA', 4),
      ('processos', 'Melhoria de Processos', 5)
    ) AS tmp(id, name, position)
    WHERE NOT EXISTS (SELECT 1 FROM project_categories)
    ON CONFLICT DO NOTHING;
  `);
  await query(`
    INSERT INTO project_statuses (id, name, color, position)
    SELECT * FROM (VALUES
      ('ativo', 'Ativo', '#005C46', 1),
      ('impedido', 'Impedido', '#ef4444', 2),
      ('atrasado', 'Atrasado', '#f97316', 3),
      ('pausado', 'Pausado', '#6b7280', 4),
      ('concluido', 'Concluído', '#16a34a', 5),
      ('backlog', 'Não iniciado/Backlog', '#64748b', 6),
      ('cancelado', 'Cancelado', '#991b1b', 7)
    ) AS tmp(id, name, color, position)
    WHERE NOT EXISTS (SELECT 1 FROM project_statuses)
    ON CONFLICT DO NOTHING;
  `);
  await query(`
    INSERT INTO project_kpis (id, name, position)
    SELECT * FROM (VALUES
      ('receita-bruta', 'Receita Bruta', 1),
      ('vendas', 'Vendas', 2),
      ('novos-clientes', 'Novos Clientes', 3)
    ) AS tmp(id, name, position)
    WHERE NOT EXISTS (SELECT 1 FROM project_kpis)
    ON CONFLICT DO NOTHING;
  `);
};

const slugify = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();

export const getProjectConfig = async (_req: Request, res: Response) => {
  try {
    await ensureTables();
    const [categories, statuses, kpis] = await Promise.all([
      query('SELECT * FROM project_categories ORDER BY LOWER(name) ASC'),
      query('SELECT * FROM project_statuses ORDER BY LOWER(name) ASC'),
      query('SELECT * FROM project_kpis ORDER BY LOWER(name) ASC')
    ]);
    res.json({ categories: categories.rows, statuses: statuses.rows, kpis: kpis.rows });
  } catch (error) {
    console.error('getProjectConfig error:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações de projetos.' });
  }
};

export const createProjectCategory = async (req: Request, res: Response) => {
  try {
    await ensureTables();
    const { name, position } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const id = slugify(name);
    const result = await query(
      'INSERT INTO project_categories (id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [id, name.trim(), position || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createProjectCategory error:', error);
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
};

export const updateProjectCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const result = await query(
      'UPDATE project_categories SET name = $1, position = $2 WHERE id = $3 RETURNING *',
      [name, position || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateProjectCategory error:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
};

export const deleteProjectCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM project_categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada.' });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteProjectCategory error:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria.' });
  }
};

export const createProjectStatus = async (req: Request, res: Response) => {
  try {
    await ensureTables();
    const { name, color, position } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const id = slugify(name);
    const result = await query(
      'INSERT INTO project_statuses (id, name, color, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name.trim(), color || '#6b7280', position || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createProjectStatus error:', error);
    res.status(500).json({ error: 'Erro ao criar status.' });
  }
};

export const updateProjectStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, position } = req.body;
    const result = await query(
      'UPDATE project_statuses SET name = $1, color = $2, position = $3 WHERE id = $4 RETURNING *',
      [name, color || '#6b7280', position || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Status não encontrado.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateProjectStatus error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
};

export const deleteProjectStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM project_statuses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Status não encontrado.' });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteProjectStatus error:', error);
    res.status(500).json({ error: 'Erro ao excluir status.' });
  }
};

export const createProjectKpi = async (req: Request, res: Response) => {
  try {
    await ensureTables();
    const { name, position } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const id = slugify(name);
    const result = await query(
      'INSERT INTO project_kpis (id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [id, name.trim(), position || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createProjectKpi error:', error);
    res.status(500).json({ error: 'Erro ao criar KPI.' });
  }
};

export const updateProjectKpi = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const result = await query(
      'UPDATE project_kpis SET name = $1, position = $2 WHERE id = $3 RETURNING *',
      [name, position || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'KPI não encontrado.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateProjectKpi error:', error);
    res.status(500).json({ error: 'Erro ao atualizar KPI.' });
  }
};

export const deleteProjectKpi = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM project_kpis WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'KPI não encontrado.' });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteProjectKpi error:', error);
    res.status(500).json({ error: 'Erro ao excluir KPI.' });
  }
};
