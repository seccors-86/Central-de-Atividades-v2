import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User } from '../types';
import { Project } from '../services/projects';
import { Trash2, RefreshCw, Briefcase, CheckCircle2, Archive, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RecycleBinProps {
  archivedTasks: Task[];
  archivedProjects: Project[];
  onRestoreTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onRestoreProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onBulkDeleteTasks: (ids: string[]) => Promise<void>;
  onBulkRestoreTasks: (tasks: Task[]) => Promise<void>;
  onBulkDeleteProjects: (ids: string[]) => Promise<void>;
  onBulkRestoreProjects: (projects: Project[]) => Promise<void>;
  users: User[];
}

export const RecycleBin: React.FC<RecycleBinProps> = ({
  archivedTasks,
  archivedProjects,
  onRestoreTask,
  onDeleteTask,
  onRestoreProject,
  onDeleteProject,
  onBulkDeleteTasks,
  onBulkRestoreTasks,
  onBulkDeleteProjects,
  onBulkRestoreProjects,
  users
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  // Estados para diálogos de confirmação customizados
  const [itemToRestore, setItemToRestore] = useState<{ type: 'task' | 'project'; id: string; name: string; originalItem: any } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'task' | 'project'; id: string; name: string } | null>(null);
  const [bulkAction, setBulkAction] = useState<{ action: 'restore' | 'delete'; taskCount: number; projectCount: number } | null>(null);

  const getUser = (id: string) => users.find(u => u.id === id);

  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return '--';
    }
  };

  // ─── Task Selection ─────────────────────────────────────────
  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllTasks = () => {
    if (selectedTaskIds.size === archivedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(archivedTasks.map(t => t.id)));
    }
  };

  // ─── Project Selection ──────────────────────────────────────
  const toggleProject = (id: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllProjects = () => {
    if (selectedProjectIds.size === archivedProjects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(archivedProjects.map(p => p.id)));
    }
  };

  // ─── Executores de Ação Confirmada ─────────────────────────
  const executeRestoreItem = async () => {
    if (!itemToRestore) return;
    try {
      if (itemToRestore.type === 'project') {
        await onRestoreProject(itemToRestore.originalItem);
      } else {
        await onRestoreTask(itemToRestore.originalItem);
      }
    } catch (e) {
      console.error('Erro ao restaurar:', e);
    } finally {
      setItemToRestore(null);
    }
  };

  const executeDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'project') {
        await onDeleteProject(itemToDelete.id);
      } else {
        await onDeleteTask(itemToDelete.id);
      }
    } catch (e) {
      console.error('Erro ao excluir permanentemente:', e);
    } finally {
      setItemToDelete(null);
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    try {
      if (bulkAction.action === 'restore') {
        if (bulkAction.taskCount > 0) await onBulkRestoreTasks(archivedTasks.filter(t => selectedTaskIds.has(t.id)));
        if (bulkAction.projectCount > 0) await onBulkRestoreProjects(archivedProjects.filter(p => selectedProjectIds.has(p.id)));
      } else {
        if (bulkAction.taskCount > 0) await onBulkDeleteTasks(Array.from(selectedTaskIds));
        if (bulkAction.projectCount > 0) await onBulkDeleteProjects(Array.from(selectedProjectIds));
      }
    } catch (e) {
      console.error(`Erro na ação em lote (${bulkAction.action}):`, e);
    } finally {
      setBulkAction(null);
      setSelectedTaskIds(new Set());
      setSelectedProjectIds(new Set());
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────
  const handleBulkRestoreSelected = () => {
    const taskCount = selectedTaskIds.size;
    const projectCount = selectedProjectIds.size;
    if (taskCount === 0 && projectCount === 0) return;
    setBulkAction({ action: 'restore', taskCount, projectCount });
  };

  const handleBulkDeleteSelected = () => {
    const taskCount = selectedTaskIds.size;
    const projectCount = selectedProjectIds.size;
    if (taskCount === 0 && projectCount === 0) return;
    setBulkAction({ action: 'delete', taskCount, projectCount });
  };

  const totalSelected = selectedTaskIds.size + selectedProjectIds.size;

  const TaskCheckIcon = selectedTaskIds.size === archivedTasks.length && archivedTasks.length > 0
    ? CheckSquare
    : selectedTaskIds.size > 0
      ? MinusSquare
      : Square;

  const ProjectCheckIcon = selectedProjectIds.size === archivedProjects.length && archivedProjects.length > 0
    ? CheckSquare
    : selectedProjectIds.size > 0
      ? MinusSquare
      : Square;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-300 uppercase tracking-tighter">Lixeira do Sistema</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gerencie itens arquivados (Somente Administradores)</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-[#374A67] dark:text-orange-400 rounded-xl border border-orange-100 dark:border-orange-800">
           <Archive size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">{archivedTasks.length + archivedProjects.length} Itens</span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {totalSelected > 0 && (
        <div className="sticky top-24 z-[8] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">
            {totalSelected} item(ns) selecionado(s)
          </span>
          <div className="flex items-center gap-3">
            {(selectedTaskIds.size > 0 || selectedProjectIds.size > 0) && (
              <>
                <button
                  onClick={handleBulkRestoreSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-100 dark:border-blue-800"
                >
                  <RefreshCw size={14} /> Restaurar Selecionados
                </button>
                <button
                  onClick={handleBulkDeleteSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-100 dark:border-red-800"
                >
                  <Trash2 size={14} /> Excluir Selecionados
                </button>
              </>
            )}
            <button
              onClick={() => { setSelectedTaskIds(new Set()); setSelectedProjectIds(new Set()); }}
              className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Archived Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} /> Projetos Arquivados
              <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{archivedProjects.length}</span>
            </h3>
            {archivedProjects.length > 0 && (
              <button
                onClick={selectAllProjects}
                className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 hover:text-[#374A67] uppercase tracking-widest transition-colors"
              >
                <ProjectCheckIcon size={16} className={selectedProjectIds.size > 0 ? 'text-[#374A67]' : ''} />
                {selectedProjectIds.size === archivedProjects.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {archivedProjects.length === 0 ? (
              <div className="p-10 text-center bg-gray-50 dark:bg-gray-700 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 text-xs font-bold">Nenhum projeto na lixeira.</div>
            ) : (
              archivedProjects.map(project => (
                <div
                  key={project.id}
                  className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all cursor-pointer ${
                    selectedProjectIds.has(project.id)
                      ? 'border-[#374A67] bg-orange-50/30 dark:bg-orange-900/10'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                  onClick={() => toggleProject(project.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      selectedProjectIds.has(project.id)
                        ? 'bg-[#374A67] border-[#374A67] text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedProjectIds.has(project.id) && <CheckSquare size={14} />}
                    </div>
                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{project.name}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-black">
                        {project.updated_at ? `Arquivado em ${safeFormatDate(project.updated_at)}` : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setItemToRestore({ type: 'project', id: project.id, name: project.name, originalItem: project })}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                      title="Restaurar"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={() => setItemToDelete({ type: 'project', id: project.id, name: project.name })}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Archived Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} /> Tarefas Arquivadas
              <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
            </h3>
            {archivedTasks.length > 0 && (
              <button
                onClick={selectAllTasks}
                className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 hover:text-[#374A67] uppercase tracking-widest transition-colors"
              >
                <TaskCheckIcon size={16} className={selectedTaskIds.size > 0 ? 'text-[#374A67]' : ''} />
                {selectedTaskIds.size === archivedTasks.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {archivedTasks.length === 0 ? (
              <div className="p-10 text-center bg-gray-50 dark:bg-gray-700 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 text-xs font-bold">Nenhuma tarefa na lixeira.</div>
            ) : (
              archivedTasks.map(task => {
                const owner = getUser(task.ownerId);
                return (
                  <div
                    key={task.id}
                    className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all cursor-pointer ${
                      selectedTaskIds.has(task.id)
                        ? 'border-[#374A67] bg-orange-50/30 dark:bg-orange-900/10'
                        : 'border-gray-100 dark:border-gray-700'
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        selectedTaskIds.has(task.id)
                          ? 'bg-[#374A67] border-[#374A67] text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedTaskIds.has(task.id) && <CheckSquare size={14} />}
                      </div>
                      <img src={owner?.avatarUrl} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-700" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{task.title}</h4>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{task.projectName || 'Tarefa Avulsa'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setItemToRestore({ type: 'task', id: task.id, name: task.title, originalItem: task })}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                        title="Restaurar"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={() => setItemToDelete({ type: 'task', id: task.id, name: task.title })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Customizado - Confirmar Restauração */}
      <AnimatePresence>
        {itemToRestore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToRestore(null)}
              className="absolute inset-0 bg-[#080A0D]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
                  <RefreshCw size={40} className="text-blue-600" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-[#0E1116] dark:text-gray-100 uppercase tracking-tighter mb-2">Restaurar {itemToRestore.type === 'project' ? 'Projeto' : 'Tarefa'}?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-4">
                    Deseja restaurar o item <span className="font-black text-blue-600 block my-1">"{itemToRestore.name}"</span>? Ele voltará para a lista ativa do sistema.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={executeRestoreItem}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    Confirmar Restauração
                  </button>
                  <button
                    onClick={() => setItemToRestore(null)}
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

      {/* Modal Customizado - Confirmar Exclusão Permanente */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
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
                  <h3 className="text-2xl font-black text-[#0E1116] dark:text-gray-100 uppercase tracking-tighter mb-2">Excluir para Sempre?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-4 text-red-500 font-bold">
                    ATENÇÃO: O item "{itemToDelete.name}" será EXCLUÍDO PERMANENTEMENTE. Esta ação não poderá ser desfeita!
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={executeDeleteItem}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    Confirmar Exclusão Permanente
                  </button>
                  <button
                    onClick={() => setItemToDelete(null)}
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

      {/* Modal Customizado - Confirmar Ação em Lote */}
      <AnimatePresence>
        {bulkAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkAction(null)}
              className="absolute inset-0 bg-[#080A0D]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-10 text-center space-y-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-8 ${
                  bulkAction.action === 'restore' ? 'bg-blue-50 ring-blue-50/50' : 'bg-red-50 ring-red-50/50'
                }`}>
                  {bulkAction.action === 'restore' ? (
                    <RefreshCw size={40} className="text-blue-600" />
                  ) : (
                    <Trash2 size={40} className="text-red-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-[#0E1116] dark:text-gray-100 uppercase tracking-tighter mb-2">
                    {bulkAction.action === 'restore' ? 'Restaurar Selecionados?' : 'Excluir Selecionados?'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-4">
                    {bulkAction.action === 'restore' ? (
                      <span>Deseja restaurar {bulkAction.taskCount > 0 ? `${bulkAction.taskCount} tarefa(s) ` : ''}{bulkAction.projectCount > 0 ? `${bulkAction.projectCount} projeto(s)` : ''} selecionado(s)?</span>
                    ) : (
                      <span className="text-red-500 font-bold">Deseja EXCLUIR PERMANENTEMENTE {bulkAction.taskCount > 0 ? `${bulkAction.taskCount} tarefa(s) ` : ''}{bulkAction.projectCount > 0 ? `${bulkAction.projectCount} projeto(s)` : ''} selecionado(s)? Esta ação é irreversível!</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={executeBulkAction}
                    className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${
                      bulkAction.action === 'restore'
                        ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95'
                        : 'bg-red-500 shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95'
                    }`}
                  >
                    {bulkAction.action === 'restore' ? 'Confirmar Restauração' : 'Confirmar Exclusão Permanente'}
                  </button>
                  <button
                    onClick={() => setBulkAction(null)}
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
