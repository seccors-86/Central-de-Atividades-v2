import { Router } from 'express';
import {
  getProjects, getProjectById, createProject, updateProject, deleteProject,
  getProjectMembers, addProjectMember, removeProjectMember,
  getProjectActivities, createProjectActivity,
  updateProjectActivity, deleteProjectActivity,
  getProjectKPIs, permanentDeleteProject, syncFromPortal, updateFromPortal
} from '../controllers/projectsController.js';

const router = Router();

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────
// IMPORTANTE: rotas estáticas SEMPRE antes das dinâmicas (:id)
router.get('/kpis', getProjectKPIs);

// ─── Atividades (rotas sem projectId no path) ────────────────────────────────
// Ficam antes de /:id para evitar que "activities" seja capturado como :id
router.put('/activities/:activityId', updateProjectActivity);
router.delete('/activities/:activityId', deleteProjectActivity);

// ─── CRUD de Projetos ────────────────────────────────────────────────────────
router.get('/', getProjects);
router.post('/', createProject);
router.post('/sync', syncFromPortal);
router.patch('/sync/:id', updateFromPortal);
router.delete('/permanent/:id', permanentDeleteProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// ─── Membros / Compartilhamento ──────────────────────────────────────────────
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', addProjectMember);
router.delete('/:id/members/:userId', removeProjectMember);

// ─── Atividades por Projeto ──────────────────────────────────────────────────
router.get('/:projectId/activities', getProjectActivities);
router.post('/:projectId/activities', createProjectActivity);

export default router;
