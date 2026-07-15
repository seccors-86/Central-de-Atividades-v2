import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, MapPin, Users, TrendingUp, Archive, Plus,
  Activity, SquareCheckBig, Settings, Tag, User as UserIcon,
  Briefcase, Clock, FileText, ChevronRight, Upload, Link, Trash2,
  ExternalLink, Pen, AlertCircle, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Project, ProjectActivity, getProjectActivities, updateActivity, createActivity, deleteActivity, updateProject, getProjectMembers, ProjectMember } from '../services/projects';
import { Task, User, Tag as TaskTag, Area, Client, KanbanBucket } from '../types';
import { TaskBoard } from './TaskBoard';
import { TaskModal } from './TaskModal';
import { ProjectShareModal } from './ProjectShareModal';
import { CommentsSection } from './CommentsSection';
import { HtmlRenderer } from './HtmlRenderer';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  users: User[];
  tags: TaskTag[];
  currentUser: User;
  isManager: boolean;
  areas: Area[];
  clients: Client[];
  buckets?: KanbanBucket[];
  projects?: Project[];
  onUpdate?: (updated: Project) => void;
  onEdit?: () => void;
}



const mapActivityToTask = (activity: ProjectActivity, project: Project): Task => {
  if (!activity) return {} as Task;
  const parseArrayField = (value: any) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const progress = activity.progress ?? (activity.status === 'done' || activity.status === 'Concluído' ? 100 : 0);

  const ownerId = activity.responsible_id || project.creator_id || '';

  return {
    id: activity.id || Math.random().toString(),
    title: activity.title || 'Sem título',
    description: activity.description || '',
    ownerId: ownerId,
    memberIds: parseArrayField(activity.memberIds),
    startDate: activity.start_date || activity.created_at || new Date().toISOString(),
    deadline: activity.deadline || activity.created_at || new Date().toISOString(),
    progress,
    status: activity.status || 'todo',
    areaId: project.area_id,
    tagIds: parseArrayField(activity.tagIds),
    projectId: project.id,
    projectName: project.name,
    flowStep: activity.flow_step,
    priority: activity.priority || 'Média',
    timeLogs: parseArrayField(activity.time_logs),
    subtasks: parseArrayField(activity.subtasks),
    hours: activity.hours,
    notes: activity.notes,
    taskType: activity.task_type === 'support' ? 'support' : 'activity',
    client: activity.client_id || undefined,
    demandanteAreaId: activity.demandante_area_id || project.demandante_area_id || undefined,
    publicarPortal: activity.publicar_portal || false
  };
};

// Mapper back to ProjectActivity
const mapTaskToActivityStatus = (task: Task): string => {
  return task.status || 'todo';
};

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  onBack,
  users,
  tags,
  areas,
  clients,
  currentUser,
  isManager,
  buckets,
  projects,
  onUpdate,
  onEdit
}) => {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedMembers, setSharedMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [localSelectedPhases, setLocalSelectedPhases] = useState<string[]>(() => {
    const phases = project.selected_phases as any;
    if (Array.isArray(phases)) return phases;
    if (typeof phases === 'string' && phases.startsWith('[')) {
      try { return JSON.parse(phases); } catch (e) { }
    }
    return ['Backlog', 'Triagem / Priorização / Viabilidade', 'Planejamento', 'Execução', 'Encerramento'];
  });

  const [documents, setDocuments] = useState<any[]>(() => {
    const docs = project.documents as any;
    if (Array.isArray(docs)) return docs;
    if (typeof docs === 'string' && docs.startsWith('[')) {
      try { return JSON.parse(docs); } catch (e) { }
    }
    return [];
  });
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [editingDocIdx, setEditingDocIdx] = useState<number | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocLink, setNewDocLink] = useState('');

  const [currentProjectPhase, setCurrentProjectPhase] = useState(project.phase || localSelectedPhases[0] || 'Backlog');
  const [selectedFlowStep, setSelectedFlowStep] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'tarefas' | 'mural'>('tarefas');

  const loadActivities = async () => {
    try {
      const data = await getProjectActivities(project.id);
      setActivities(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getProjectMembers(project.id);
      setSharedMembers(data);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadActivities();
    loadSharedMembers();
  }, [project.id]);

  useEffect(() => {
    const phases = project.selected_phases as any;
    if (Array.isArray(phases)) {
      setLocalSelectedPhases(phases);
    } else if (typeof phases === 'string' && phases.startsWith('[')) {
      try { setLocalSelectedPhases(JSON.parse(phases)); } catch (e) { }
    }
  }, [project.selected_phases]);

  const handleUpdateTask = async (updatedTask: Task) => {
    const newStatus = updatedTask.status || 'todo';

    // Atualiza otimisticamente
    setActivities(prev => prev.map(a =>
      a.id === updatedTask.id ? { ...a, status: newStatus, progress: updatedTask.progress } : a
    ));

    try {
      await updateActivity(updatedTask.id, {
        status: newStatus,
        flow_step: updatedTask.flowStep,
        responsible_id: updatedTask.ownerId,
        priority: updatedTask.priority,
        progress: updatedTask.progress,
        time_logs: updatedTask.timeLogs,
        subtasks: updatedTask.subtasks,
        memberIds: updatedTask.memberIds,
        task_type: updatedTask.taskType,
        client_id: updatedTask.client,
        demandante_area_id: updatedTask.demandanteAreaId,
        publicar_portal: updatedTask.publicarPortal,
        notes: updatedTask.notes,
        tagIds: updatedTask.tagIds,
        start_date: updatedTask.startDate,
        deadline: updatedTask.deadline,
        title: updatedTask.title,
        description: updatedTask.description,
      });
      loadActivities();
      window.dispatchEvent(new Event('refresh_tasks'));
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      alert('Não foi possível atualizar a atividade. Tente novamente.');
      loadActivities();
    }
  };

  const handleDeleteTask = (taskId: string) => {
    console.log("[handleDeleteTask] Solicitando exclusão da tarefa ID:", taskId);
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    console.log("[confirmDeleteTask] Iniciando exclusão da tarefa ID no backend:", taskToDelete);
    try {
      await deleteActivity(taskToDelete);
      console.log("[confirmDeleteTask] Exclusão bem-sucedida no backend. Recarregando atividades...");
      await loadActivities();
    } catch (error) {
      console.error('[confirmDeleteTask] Erro ao excluir atividade:', error);
      alert('Não foi possível excluir a atividade. Tente novamente.');
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsActivityModalOpen(true);
  };

  const handleOpenNewActivity = () => {
    setEditingTask(undefined);
    setIsActivityModalOpen(true);
  };

  const handleSaveTask = async (task: Task, isNew?: boolean) => {
    try {
      if (isNew) {
        await createActivity(project.id, {
          id: task.id,
          title: task.title,
          description: task.description,
          flow_step: task.flowStep || selectedFlowStep || 'Planejamento',
          responsible_id: task.ownerId,
          priority: task.priority,
          hours: task.hours,
          status: task.status,
          progress: task.progress,
          time_logs: task.timeLogs,
          subtasks: task.subtasks,
          memberIds: task.memberIds,
          task_type: task.taskType,
          client_id: task.client,
          demandante_area_id: task.demandanteAreaId,
          publicar_portal: task.publicarPortal,
          notes: task.notes,
          tagIds: task.tagIds,
          project_id: project.id,
          start_date: task.startDate,
          deadline: task.deadline
        });
      } else {
        await updateActivity(task.id, {
          title: task.title,
          description: task.description,
          flow_step: task.flowStep,
          responsible_id: task.ownerId,
          priority: task.priority,
          hours: task.hours,
          status: task.status,
          progress: task.progress,
          time_logs: task.timeLogs,
          subtasks: task.subtasks,
          memberIds: task.memberIds,
          task_type: task.taskType,
          client_id: task.client,
          demandante_area_id: task.demandanteAreaId,
          publicar_portal: task.publicarPortal,
          notes: task.notes,
          tagIds: task.tagIds,
          start_date: task.startDate,
          deadline: task.deadline
        });
      }
      loadActivities();
      window.dispatchEvent(new Event('refresh_tasks'));
      setIsActivityModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar atividade.');
    }
  };

  const handleAddDocument = async () => {
    if (!newDocName || !newDocLink) return;
    try {
      let newDocs = [];
      if (editingDocIdx !== null) {
        newDocs = [...documents];
        newDocs[editingDocIdx] = { ...newDocs[editingDocIdx], name: newDocName, url: newDocLink };
      } else {
        newDocs = [...documents, { name: newDocName, url: newDocLink, date: new Date().toISOString() }];
      }

      await updateProject(project.id, { documents: newDocs });
      setDocuments(newDocs);
      setNewDocName('');
      setNewDocLink('');
      setShowAddDoc(false);
      setEditingDocIdx(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar o link do documento.');
    }
  };

  const handleEditDocument = (index: number) => {
    const doc = documents[index];
    setNewDocName(doc.name);
    setNewDocLink(doc.url);
    setEditingDocIdx(index);
    setShowAddDoc(true);
  };

  const handleDeleteDocument = async (index: number) => {
    if (window.confirm('Remover este link do documento?')) {
      try {
        const newDocs = documents.filter((_, i) => i !== index);
        await updateProject(project.id, { documents: newDocs });
        setDocuments(newDocs);
      } catch(err) {
        alert('Erro ao remover documento');
      }
    }
  };

  const tasks: Task[] = activities.map(a => mapActivityToTask(a, project));
  const deadlineStatus = project.end_date ? (differenceInDays(parseISO(project.end_date), new Date()) < 0 ? 'atrasado' : (differenceInDays(parseISO(project.end_date), new Date()) <= 10 ? 'risco' : 'prazo')) : 'prazo';

  const updateProjectPhase = async (phase: string) => {
    setCurrentProjectPhase(phase);
    try {
      await updateProject(project.id, { phase: phase });
      if(onUpdate) onUpdate({ ...project, phase: phase });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
             <h2 className="text-lg font-black text-gray-900 dark:text-gray-300 tracking-tight">{project.name}</h2>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.category || 'Geral'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setActiveView('tarefas')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'tarefas' ? 'bg-[#374A67] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Tarefas</button>
           <button onClick={() => setActiveView('mural')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'mural' ? 'bg-[#374A67] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Mural</button>
           <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#374A67]/10 hover:bg-[#374A67]/20 text-[#374A67] rounded-xl text-xs font-bold transition-all border border-[#374A67]/15">
             <Users className="w-4 h-4" /> Compartilhar
           </button>
           <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-gray-100 dark:border-gray-700">
             <Settings className="w-4 h-4" /> Configurações
           </button>
         </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-8">

          {/* Project Description */}
          {project.description && (
            <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <FileText className="w-4 h-4 text-[#374A67]" /> Descrição do Projeto
              </h3>
              <HtmlRenderer
                content={project.description}
                className="text-sm whitespace-pre-wrap leading-relaxed"
              />
            </div>
          )}

          {activeView === 'mural' ? (
            <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">
              <CommentsSection
                entityType="project"
                entityId={project.id}
                currentUser={currentUser}
                isProjectAll={true}
                onTaskClick={(taskId) => {
                  const t = tasks.find(tsk => tsk.id === taskId);
                  if (t) handleEditTask(t);
                }}
              />
            </div>
          ) : (
            <>
              {/* Journey Visualizer */}
          <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black text-gray-900 dark:text-gray-300 uppercase tracking-[0.2em] flex items-center gap-2">
                   <TrendingUp className="w-4 h-4 text-[#374A67]" /> Jornada do Projeto
                </h3>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 flex items-center gap-1.5"
                  >
                    <Pen size={12} /> Editar Etapas
                  </button>
                )}
             </div>

             <div className="relative flex items-center justify-between px-4">
                <div className="absolute left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 -z-0 mx-8" />
                {(localSelectedPhases.length > 0 ? localSelectedPhases : ['Sem fase específica']).map((phase, idx) => {
                  const isCurrent = currentProjectPhase === phase;
                  const visiblePhases = localSelectedPhases.length > 0 ? localSelectedPhases : ['Sem fase específica'];
                  const isPast = visiblePhases.indexOf(currentProjectPhase) > visiblePhases.indexOf(phase);
                  const isSemFase = phase.toLowerCase() === 'sem fase específica';

                  // Se "Sem fase específica" for o primeiro (idx 0), os próximos números devem ser idx em vez de idx + 1
                  const displayNum = localSelectedPhases[0]?.toLowerCase() === 'sem fase específica' && !isSemFase ? idx : (idx + 1);

                  return (
                    <div key={phase} className="relative z-10 flex flex-col items-center gap-3 w-20">
                       <button
                         onClick={() => updateProjectPhase(phase)}
                         className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border-2 ${
                           isCurrent ? 'bg-[#374A67] border-[#374A67] text-white scale-125 shadow-orange-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-orange-300'
                         }`}
                       >
                         {isPast ? <SquareCheckBig size={18} /> : (isSemFase ? '!' : displayNum)}
                       </button>
                       <span
                         className={`text-[9px] font-black uppercase tracking-wider absolute -bottom-10 w-24 text-center leading-tight line-clamp-2 ${isCurrent ? 'text-[#374A67]' : 'text-gray-400'}`}
                         title={phase}
                       >
                          {phase}
                       </span>
                    </div>
                  );
                })}
             </div>
             <div className="h-10" />
          </div>

          {/* Delivery Control (Kanban / Steps) */}
          <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[400px]">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#E6FAFC] rounded-2xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#0E1116]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-300 uppercase tracking-widest">Controle de Entrega</h3>
                    <p className="text-[10px] font-bold text-gray-400">Gerencie as atividades por etapa do fluxo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFlowStep && (
                    <button
                      onClick={() => setSelectedFlowStep(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-100 dark:border-gray-700"
                    >
                      Ver Todas as Fases <X className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={handleOpenNewActivity} className="flex items-center gap-2 px-4 py-2 bg-[#374A67] text-white rounded-xl text-xs font-black hover:bg-[#e67a1d] transition-all shadow-md shadow-orange-100">
                    <Plus size={16} /> Nova Atividade
                  </button>
                </div>
             </div>

             {loading ? (
                <div className="py-20 text-center text-gray-500 dark:text-gray-400 font-medium">Carregando atividades...</div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-700">
                    <TaskBoard
                      tasks={selectedFlowStep ? tasks.filter(t => t.flowStep === selectedFlowStep) : tasks}
                      users={users}
                      tags={tags}
                      currentUserId={currentUser.id}
                      isManager={isManager}
                      onUpdateTask={handleUpdateTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      simpleMode={true}
                      buckets={buckets}
                      initialViewMode="list"
                    />
                  </div>
                </div>
              )}
          </div>
           </>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">
           <div className="card-premium p-8">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Resumo de Gestão</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Dono do Projeto</label>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                       <img src={users.find(u => u.id === project.creator_id)?.avatarUrl} className="w-8 h-8 rounded-full" />
                       <span className="text-xs font-black text-gray-700 dark:text-gray-300">{users.find(u => u.id === project.creator_id)?.name || 'Desconhecido'}</span>
                    </div>
                 </div>

                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Responsável Principal</label>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                       {project.owner_id ? (
                         <>
                           <img src={users.find(u => u.id === project.owner_id)?.avatarUrl} className="w-8 h-8 rounded-full" />
                           <span className="text-xs font-black text-gray-700 dark:text-gray-300">{users.find(u => u.id === project.owner_id)?.name || 'Desconhecido'}</span>
                         </>
                       ) : (
                         <span className="text-xs font-black text-gray-400">Não atribuído</span>
                       )}
                    </div>
                 </div>

                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Área Demandante</label>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs font-black text-gray-700 dark:text-gray-300">
                       {areas.find(a => a.id === project.demandante_area_id)?.name || 'Não atribuída'}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Check-in</label>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs font-black text-gray-700 dark:text-gray-300">
                           {project.start_date ? format(parseISO(project.start_date), 'dd/MM/yyyy') : format(parseISO(project.created_at), 'dd/MM/yyyy')}
                        </div>
                     </div>
                    <div>
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Prazo Final</label>
                       <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs font-black text-gray-700 dark:text-gray-300">
                          {project.end_date ? format(parseISO(project.end_date), 'dd/MM/yyyy') : '---'}
                       </div>
                    </div>
                 </div>

                 {(project.parent_id || project.depends_on_id) && (
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      {project.parent_id && (
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Subprojeto de</label>
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-xs font-black text-blue-700 dark:text-blue-300">
                             {projects?.find(p => p.id === project.parent_id)?.name || 'Projeto Desconhecido'}
                          </div>
                        </div>
                      )}
                      {project.depends_on_id && (
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Depende do Projeto</label>
                          <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-2xl border border-orange-100 dark:border-orange-800 text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-2">
                             <AlertCircle size={14} />
                             {projects?.find(p => p.id === project.depends_on_id)?.name || 'Projeto Desconhecido'}
                          </div>
                        </div>
                      )}
                    </div>
                 )}

                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Status do Prazo</label>
                    <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${
                       deadlineStatus === 'atrasado' ? 'bg-red-50 border-red-100 dark:border-red-800 text-red-700' :
                       deadlineStatus === 'risco' ? 'bg-orange-50 border-orange-100 dark:border-orange-800 text-[#374A67]' :
                       'bg-[#E6FAFC] border-[#0E1116]/20 text-[#0E1116]'
                    }`}>
                       {deadlineStatus === 'atrasado' ? <AlertCircle size={18} /> : (deadlineStatus === 'risco' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />)}
                       <span className="text-xs font-black uppercase tracking-widest">{deadlineStatus}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Membros Compartilhados */}
           <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center text-[#374A67] shrink-0">
                       <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-900 dark:text-gray-300 uppercase tracking-widest leading-tight">Membros Compartilhados</h3>
                 </div>
                 <button onClick={() => setIsShareModalOpen(true)} className="p-1.5 text-gray-400 hover:text-[#374A67] bg-gray-50 dark:bg-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg transition-all" title="Gerenciar Compartilhamento">
                    <Plus size={14} />
                 </button>
              </div>

              <div className="flex flex-col gap-3">
                {loadingMembers ? (
                  <div className="py-4 text-center text-gray-400 text-[10px] font-bold">Carregando...</div>
                ) : sharedMembers.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-[10px] font-bold border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                     Nenhuma equipe convidada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sharedMembers.map(member => (
                      <div key={member.user_id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/30 border border-gray-50 dark:border-gray-700/50 rounded-xl">
                        <img
                          src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                          className="w-7 h-7 rounded-full border border-gray-100 dark:border-gray-700 shrink-0"
                          alt={member.name}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 truncate">{member.name}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider truncate">{member.area_name || 'Compartilhado'}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                          member.role === 'editor'
                            ? 'bg-purple-50 dark:bg-purple-950/15 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-50 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {member.role === 'editor' ? 'Editor' : 'Leitor'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>

           {/* Asset Manager (Improved) */}
           <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col mb-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                       <Archive className="w-4 h-4" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-900 dark:text-gray-300 uppercase tracking-widest leading-tight">Asset Manager</h3>
                 </div>
                 <button onClick={() => { setEditingDocIdx(null); setShowAddDoc(true); }} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black hover:bg-purple-700 transition-all">
                   <Plus size={14} /> Novo Asset
                 </button>
              </div>

              {showAddDoc && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top duration-300 space-y-3">
                   <input
                     type="text"
                     placeholder="Nome do Asset"
                     className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-purple-200 outline-none"
                     value={newDocName}
                     onChange={(e) => setNewDocName(e.target.value)}
                   />
                   <input
                     type="text"
                     placeholder="URL do Link"
                     className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-purple-200 outline-none"
                     value={newDocLink}
                     onChange={(e) => setNewDocLink(e.target.value)}
                   />
                   <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => { setShowAddDoc(false); setEditingDocIdx(null); }} className="px-3 py-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">Cancelar</button>
                      <button onClick={handleAddDocument} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold">{editingDocIdx !== null ? 'Salvar' : 'Adicionar'}</button>
                   </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {documents.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-[10px] font-bold border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">Nenhum asset vinculado.</div>
                ) : (
                  documents.map((doc, idx) => (
                    <div key={idx} className="flex flex-col p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-purple-200 transition-all group gap-2">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors shrink-0">
                             <FileText size={14} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                             <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 line-clamp-1">{doc.name}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{format(parseISO(doc.date), 'dd/MM/yyyy')}</p>
                          </div>
                       </div>
                       <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-50 mt-1">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-black text-purple-600 hover:text-purple-800 transition-all">
                             Acessar <ExternalLink size={10} />
                          </a>
                          <div className="flex gap-1">
                             <button onClick={() => handleEditDocument(idx)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 rounded-lg transition-all">
                               <Pen size={12} />
                             </button>
                             <button onClick={() => handleDeleteDocument(idx)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 rounded-lg transition-all">
                               <Trash2 size={12} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>

           {isManager && (
             <button
               onClick={onEdit}
               className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl hover:bg-orange-50 hover:text-[#374A67] hover:border-orange-200 transition-all group font-bold text-xs shadow-sm"
             >
                <Settings size={16} className="text-gray-400 group-hover:text-[#374A67]" />
                Editar Projeto
             </button>
           )}
        </div>
      </div>

      <TaskModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveTask}
        users={users}
        areas={areas}
        tags={tags}
        currentAreaId={project.area_id}
        editingTask={editingTask}
        onDelete={handleDeleteTask}
        initialProjectId={project.id}
        initialProjectPhases={localSelectedPhases}
        initialFlowStep={selectedFlowStep || undefined}
        clients={clients}
        buckets={buckets}
      />

      <ProjectShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
        users={users}
        areas={areas}
        currentUser={currentUser}
        onMembersChanged={loadSharedMembers}
      />

      {/* Modal de Confirmação de Exclusão de Atividade */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToDelete(null)}
              className="absolute inset-0 bg-[#080A0D]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
                  <Trash2 size={40} className="text-red-500" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-[#0E1116] dark:text-gray-100 uppercase tracking-tighter mb-2">Excluir Atividade?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-4">
                    A atividade <span className="font-black text-red-500 block my-1">"{activities.find(a => a.id === taskToDelete)?.title || 'esta atividade'}"</span> será removida permanentemente do projeto.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={confirmDeleteTask}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    Confirmar Exclusão
                  </button>
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="w-full py-4 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
