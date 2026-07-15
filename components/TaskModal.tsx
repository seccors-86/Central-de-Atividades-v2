import React, { useState, useEffect } from "react";
import { Task, User, Area, Tag, Subtask, TimeLog, Client, KanbanBucket } from "../types";
import { Project, getProjects } from "../services/projects";
import { CommentsSection } from './CommentsSection';
import { RichTextEditor } from './RichTextEditor';

import { authService } from "../services/auth";
import { SearchableSelect } from './SearchableSelect';
import { MultiSelect } from './MultiSelect';
import {
  X,
  User as UserIcon,
  Save,
  Flag,
  Users,
  Tag as TagIcon,
  CheckSquare,
  Plus,
  Briefcase,
  Clock,
  MapPin,
  Trash2,
  Edit2
} from "lucide-react";
import { format } from "date-fns";
import { generateUUID } from "../utils";
import { getTagStyle } from "../tagUtils";
import type { ProjectKpiConfig } from '../services/projectConfig';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  areas: Area[];
  clients?: Client[];
  tags: Tag[];
  currentAreaId: string;
  onSave: (task: Task, isNew?: boolean) => void;
  onDelete?: (taskId: string) => void;
  editingTask?: Task;
  initialProjectId?: string;
  initialProjectPhases?: string[];
  initialFlowStep?: string;
  buckets?: KanbanBucket[];
  highlightCommentId?: string | null;
  onHighlightConsumed?: () => void;
  projectKpis?: ProjectKpiConfig[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  users,
  areas,
  clients = [],
  tags,
  currentAreaId,
  onSave,
  editingTask,
  onDelete,
  initialProjectId,
  initialProjectPhases = [],
  initialFlowStep,
  buckets = [],
}) => {
  const [activeTab, setActiveTab] = useState<'simples' | 'completa'>('simples');

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deadline, setDeadline] = useState(format(new Date(), "yyyy-MM-dd"));
  const [progress, setProgress] = useState(0);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);

  // Project & Phase
  const [projectId, setProjectId] = useState<string>("");
  const [flowStep, setFlowStep] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Time Logs
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [manualTimeDate, setManualTimeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualTimeStart, setManualTimeStart] = useState("");
  const [manualTimeEnd, setManualTimeEnd] = useState("");
  const [editingTimeLogIndex, setEditingTimeLogIndex] = useState<number | null>(null);

  // Extra fields from ProjectActivity
  const [taskType, setTaskType] = useState<'activity' | 'support'>('activity');
  const [priority, setPriority] = useState("Média");
  const [hours, setHours] = useState("0");
  const [clientId, setClientId] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [demandanteAreaId, setDemandanteAreaId] = useState("");
  const [publicarPortal, setPublicarPortal] = useState(false);

  // Load projects list
  useEffect(() => {
    if (isOpen) {
      setLoadingProjects(true);
      getProjects({ limit: '200' })
        .then(res => setProjects(res.data))
        .catch(() => setProjects([]))
        .finally(() => setLoadingProjects(false));
    }
  }, [isOpen]);

  // Get selected project phases
  const selectedProject = projects.find(p => p.id === projectId);
  const projectPhases = initialProjectPhases && initialProjectId === projectId
    ? initialProjectPhases
    : (Array.isArray(selectedProject?.selected_phases)
        ? selectedProject.selected_phases
        : (typeof (selectedProject?.selected_phases as any) === 'string' && (selectedProject?.selected_phases as any).startsWith('[')
          ? JSON.parse(selectedProject?.selected_phases as any)
          : []));

  useEffect(() => {
    if (!editingTask && selectedProject) {
      if (selectedProject.client_id && !clientId) {
        setClientId(selectedProject.client_id);
      }
      if (selectedProject.demandante_area_id && !demandanteAreaId) {
        setDemandanteAreaId(selectedProject.demandante_area_id);
      }
    }
  }, [selectedProject, editingTask]);

  // Recalcular progresso baseado no checklist
  useEffect(() => {
    if (subtasks.length > 0) {
      const completedCount = subtasks.filter(st => st.completed).length;
      const newProgress = Math.round((completedCount / subtasks.length) * 100);
      setProgress(newProgress);
    }
  }, [subtasks]);

  // Auto-atualizar status dependendo do progresso se for manual (não bucket)
  useEffect(() => {
    if (progress === 100) {
      setTaskStatus("done");
    } else if (progress === 0 && taskStatus === "done") {
      setTaskStatus("todo");
    }
  }, [progress]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setOwnerId(editingTask.ownerId);
      setMemberIds(editingTask.memberIds || []);
      setSelectedTagIds(editingTask.tagIds || []);
      setStartDate(
        editingTask.startDate
          ? format(new Date(editingTask.startDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd")
      );
      setDeadline(
        editingTask.deadline
          ? format(new Date(editingTask.deadline), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd")
      );
      setProgress(editingTask.progress);
      setSubtasks(editingTask.subtasks || []);
      setProjectId(editingTask.projectId || "");
      setFlowStep(editingTask.flowStep || "");
      setTimeLogs((editingTask.timeLogs || []).filter(Boolean));
      setTaskType(editingTask.taskType || 'activity');
      setPriority(editingTask.priority || "Média");
      setHours(editingTask.hours || "0");
      setClientId(editingTask.client || "");
      setDemandanteAreaId(editingTask.demandanteAreaId || "");
      setPublicarPortal(editingTask.publicarPortal || false);
      setTaskStatus(editingTask.status || "todo");
    } else {
      setTitle("");
      setDescription("");
      const defaultUser =
        users.find((u) => u.areaId === currentAreaId) || users[0];
      const currentUser = authService.getUser();
      const loggedUser = users.find(u => u.id === currentUser?.id);
      setOwnerId(loggedUser?.id || defaultUser?.id || "");
      setMemberIds([]);
      setSelectedTagIds([]);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setDeadline(format(new Date(), "yyyy-MM-dd"));
      setProgress(0);
      setSubtasks([]);
      setProjectId(initialProjectId || "");
      setFlowStep(initialFlowStep || "");
      setTimeLogs([]);
      setTaskType('activity');
      setPriority("Média");
      setHours("0");
      setClientId("");
      setDemandanteAreaId("");
      setPublicarPortal(false);
      setTaskStatus("todo");
    }
  }, [editingTask, isOpen, currentAreaId, users, initialProjectId]);

  // Reset flowStep when project changes
  useEffect(() => {
    if (projectId && projectPhases.length > 0) {
      if (!projectPhases.includes(flowStep)) {
        setFlowStep("");
      }
    } else if (!projectId) {
      setFlowStep("");
    }
  }, [projectId, projectPhases]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ownerId) return;

    // Validation for flowStep is removed so "Sem fase especifica" works

    const selectedOwner = users.find(u => u.id === ownerId);
    const taskAreaId = selectedOwner ? selectedOwner.areaId : currentAreaId;

    const task: Task = {
      id: editingTask ? editingTask.id : generateUUID(),
      title,
      description,
      ownerId,
      memberIds,
      startDate,
      deadline,
      progress,
      status: taskStatus,
      areaId: taskAreaId,
      tagIds: selectedTagIds,
      subtasks,
      projectId: projectId || undefined,
      projectName: selectedProject?.name,
      flowStep: flowStep || undefined,
      timeLogs,
      taskType,
      priority,
      hours,
      client: clientId || undefined,
      demandanteAreaId: demandanteAreaId || undefined,
      publicarPortal: publicarPortal
    };

    onSave(task, !editingTask);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: generateUUID(), title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle("");
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubtaskDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSubtaskId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubtaskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSubtaskDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    if (!draggedSubtaskId || draggedSubtaskId === dropId) return;

    const newSubtasks = [...subtasks];
    const dragIndex = newSubtasks.findIndex(st => st.id === draggedSubtaskId);
    const dropIndex = newSubtasks.findIndex(st => st.id === dropId);

    if (dragIndex > -1 && dropIndex > -1) {
      const [draggedItem] = newSubtasks.splice(dragIndex, 1);
      newSubtasks.splice(dropIndex, 0, draggedItem);
      setSubtasks(newSubtasks);
    }
    setDraggedSubtaskId(null);
  };

  const saveEditedSubtask = () => {
    if (editingSubtaskId && editingSubtaskTitle.trim()) {
      setSubtasks(subtasks.map(st =>
        st.id === editingSubtaskId ? { ...st, title: editingSubtaskTitle.trim() } : st
      ));
    }
    setEditingSubtaskId(null);
  };

  const calculateDurationSeconds = (dateStr: string, startStr: string, endStr: string) => {
    try {
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);
      const start = new Date(`${dateStr}T00:00:00`);
      start.setHours(startH, startM, 0, 0);
      const end = new Date(`${dateStr}T00:00:00`);
      end.setHours(endH, endM, 0, 0);
      if (end < start) end.setDate(end.getDate() + 1); // Passou da meia noite
      return Math.floor((end.getTime() - start.getTime()) / 1000);
    } catch {
      return 0;
    }
  };

  const getLogISOStrings = (dateStr: string, startStr: string, endStr: string) => {
    const start = new Date(`${dateStr}T${startStr}:00`);
    const end = new Date(`${dateStr}T${endStr}:00`);
    if (end < start) end.setDate(end.getDate() + 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  };

  const handleAddManualTime = () => {
    if (!manualTimeDate || !manualTimeStart || !manualTimeEnd) return;

    const duration = calculateDurationSeconds(manualTimeDate, manualTimeStart, manualTimeEnd);
    if (duration <= 0) {
      alert("A hora de fim deve ser posterior à hora de início (ou no dia seguinte).");
      return;
    }

    const { startISO, endISO } = getLogISOStrings(manualTimeDate, manualTimeStart, manualTimeEnd);

    if (editingTimeLogIndex !== null) {
      // Edit
      const updatedLogs = [...timeLogs];
      updatedLogs[editingTimeLogIndex] = {
        ...updatedLogs[editingTimeLogIndex],
        startTime: startISO,
        endTime: endISO,
        durationSeconds: duration
      };
      setTimeLogs(updatedLogs);
      setEditingTimeLogIndex(null);
    } else {
      // Add
      const currentUser = authService.getUser();
      const newLog: TimeLog = {
        id: generateUUID(),
        userId: currentUser?.id,
        startTime: startISO,
        endTime: endISO,
        durationSeconds: duration
      };
      setTimeLogs([...timeLogs, newLog]);
    }

    setManualTimeStart("");
    setManualTimeEnd("");
  };

  const handleEditTimeLog = (index: number) => {
    const log = timeLogs[index];
    if (log?.startTime && log.endTime) {
      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      setManualTimeDate(format(start, 'yyyy-MM-dd'));
      setManualTimeStart(format(start, 'HH:mm'));
      setManualTimeEnd(format(end, 'HH:mm'));
      setEditingTimeLogIndex(index);
    } else {
      alert("Não é possível editar um lançamento em andamento.");
    }
  };

  const handleDeleteTimeLog = (index: number) => {
    setTimeLogs(timeLogs.filter((_, idx) => idx !== index));
    if (editingTimeLogIndex === index) {
      setEditingTimeLogIndex(null);
      setManualTimeStart("");
      setManualTimeEnd("");
    }
  };

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (userId && !memberIds.includes(userId)) {
      setMemberIds([...memberIds, userId]);
    }
    e.target.value = "";
  };

  const removeMember = (userId: string) => {
    setMemberIds(memberIds.filter((id) => id !== userId));
  };

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tagId = e.target.value;
    if (tagId && !selectedTagIds.includes(tagId)) {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
    e.target.value = "";
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
  };

  // Format duration seconds to human-readable
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const totalTimeSeconds = timeLogs.reduce((acc, log) => acc + (log?.durationSeconds || 0), 0);

  // Sort users alphabetically
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
          <h3 className="text-lg font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2">
            <Flag className="w-5 h-5 text-[#374A67]" />
            {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 pt-3 gap-6 shrink-0">
          <button type="button" onClick={() => setActiveTab('simples')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'simples' ? 'border-[#374A67] text-[#374A67]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Simplificada</button>
          <button type="button" onClick={() => setActiveTab('completa')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'completa' ? 'border-[#374A67] text-[#374A67]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Completa</button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 bg-white dark:bg-gray-800"
        >
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
              Título da Tarefa
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm"
              placeholder="Ex: Entrega do Relatório Anual"
              required
            />
          </div>

          {/* Task Type Selector */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTaskType('activity')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                taskType === 'activity'
                  ? 'bg-white dark:bg-gray-700 text-[#374A67] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Atividade
            </button>
            <button
              type="button"
              onClick={() => setTaskType('support')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                taskType === 'support'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Suporte
            </button>
          </div>

          {/* Project & Phase (Completa Only) */}
          {activeTab === 'completa' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Projeto (Opcional)
              </label>
              {!!initialProjectId ? (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-sm font-medium shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Selecione um projeto...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <SearchableSelect
                  options={projects.map(p => ({ label: p.name, value: p.id }))}
                  value={projectId}
                  onChange={(val) => {
                    setProjectId(val);
                    setFlowStep(""); // Reset phase when project changes
                  }}
                  placeholder={loadingProjects ? "Carregando..." : "Nenhum projeto"}
                />
              )}
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Jornada / Fase
              </label>
              <select
                value={flowStep}
                onChange={(e) => setFlowStep(e.target.value)}
                disabled={!projectId || projectPhases.length === 0}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Sem fase específica</option>
                {projectPhases.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {activeTab === 'completa' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                    Progresso
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none transition-all text-sm font-black text-gray-900 dark:text-gray-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none transition-all text-sm font-bold text-gray-900 dark:text-gray-100"
                  >
                    {buckets && buckets.length > 0 ? (
                      buckets.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="todo">A Fazer / Backlog</option>
                        <option value="doing">Em Andamento</option>
                        <option value="done">Concluído</option>
                        <option value="impedimento">Impedimento</option>
                      </>
                    )}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none text-sm text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-gray-700 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Prazo Final
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none text-sm text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-gray-700 shadow-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="z-0 relative">
            <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
              Descrição
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Detalhes da entrega..."
            />
          </div>

          {/* Demandante (Cliente e Área) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Cliente (Demandante)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100"
              >
                <option value="">Selecione um Cliente (Opcional)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Área Demandante
              </label>
              <SearchableSelect
                options={areas.map(a => ({ label: a.name, value: a.id }))}
                value={demandanteAreaId}
                onChange={setDemandanteAreaId}
                placeholder="Selecione uma Área (Opcional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Responsável Principal
              </label>
              <div className="relative">
                <div className="absolute left-3 top-[18px] z-10 w-4 h-4 text-gray-500 dark:text-gray-400">
                  <UserIcon className="w-full h-full" />
                </div>
                <SearchableSelect
                  options={sortedUsers.map(u => ({ label: u.name, value: u.id }))}
                  value={ownerId}
                  onChange={setOwnerId}
                  className="[&>button]:pl-9"
                  placeholder="Selecione um Responsável"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium shadow-sm"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Tempo Estimado (Completa Only) */}
          {activeTab === 'completa' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50/20 dark:bg-orange-950/10 rounded-xl border border-orange-100/30 dark:border-orange-900/20 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#374A67]" /> Tempo Estimado (Minutos)
              </label>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium shadow-sm"
                placeholder="Ex: 90"
              />
            </div>
            <div className="flex items-center justify-start md:pt-5">
              {Number(hours) > 0 && (
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-sm">
                  Equivale a: <strong className="text-[#374A67] font-mono">{Math.floor(Number(hours) / 60)}h{Number(hours) % 60 > 0 ? ` ${Number(hours) % 60}m` : ''}</strong>
                </span>
              )}
            </div>
          </div>
          )}

          {/* Checklist */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase mb-2">
              <CheckSquare className="w-4 h-4 text-gray-500" /> Checklist (Subtarefas)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Adicionar novo item..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    draggable
                    onDragStart={(e) => handleSubtaskDragStart(e, st.id)}
                    onDragOver={handleSubtaskDragOver}
                    onDrop={(e) => handleSubtaskDrop(e, st.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border group cursor-grab active:cursor-grabbing transition-colors ${
                      draggedSubtaskId === st.id
                        ? 'bg-gray-100 dark:bg-gray-600 border-dashed border-gray-400 opacity-50'
                        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent hover:border-gray-100 dark:hover:border-gray-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 cursor-grab shrink-0"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtask(st.id)}
                      className="w-4 h-4 text-[#374A67] rounded focus:ring-[#374A67] cursor-pointer shrink-0"
                    />

                    {editingSubtaskId === st.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onBlur={saveEditedSubtask}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedSubtask();
                          if (e.key === 'Escape') setEditingSubtaskId(null);
                        }}
                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-[#374A67] rounded outline-none text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setEditingSubtaskId(st.id);
                          setEditingSubtaskTitle(st.title);
                        }}
                        className={`flex-1 text-sm font-medium select-none ${st.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {st.title}
                      </span>
                    )}

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSubtaskId !== st.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubtaskId(st.id);
                            setEditingSubtaskTitle(st.title);
                          }}
                          className="text-gray-400 hover:text-blue-500 p-1"
                          title="Editar (duplo clique)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSubtask(st.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'completa' && (
            <>
            {/* Members Multi-select Dropdown */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-2">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Envolvidos
              </label>
              <div className="mb-2">
                <MultiSelect
                  label="Outros Envolvidos"
                  options={sortedUsers
                    .filter((u) => u.id !== ownerId)
                    .map(u => ({ label: u.name, value: u.id }))}
                  selectedValues={memberIds}
                  onChange={setMemberIds}
                />
              </div>
            </div>

            {/* Tags Multi-select */}
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-2 flex items-center gap-1">
                <TagIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Classificar Tarefa
              </label>
              <div className="relative mb-2">
                <select
                  onChange={handleTagSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Adicionar tags...
                  </option>
                  {sortedTags.map((tag) => (
                    <option
                      key={tag.id}
                      value={tag.id}
                      disabled={selectedTagIds.includes(tag.id)}
                    >
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border"
                      style={getTagStyle(tag.name)}
                    >
                      <span>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Logs */}
            <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
              <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-3">
                <Clock className="w-4 h-4 text-[#0E1116] dark:text-[#5F819B]" /> Tempo Investido
                <span className="ml-auto text-sm font-black text-[#0E1116] dark:text-[#5F819B]">
                  Total: {formatDuration(totalTimeSeconds)}
                </span>
              </label>

              <div className="flex flex-col gap-2 mb-3">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={manualTimeDate}
                    onChange={(e) => setManualTimeDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="time"
                    value={manualTimeStart}
                    onChange={(e) => setManualTimeStart(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    title="Hora Início"
                  />
                  <input
                    type="time"
                    value={manualTimeEnd}
                    onChange={(e) => setManualTimeEnd(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    title="Hora Fim"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualTime}
                    className={`px-3 py-1.5 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-1 ${editingTimeLogIndex !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0E1116] hover:bg-[#080A0D]'}`}
                    disabled={!manualTimeDate || !manualTimeStart || !manualTimeEnd}
                  >
                    {editingTimeLogIndex !== null ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingTimeLogIndex !== null ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editingTimeLogIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTimeLogIndex(null);
                        setManualTimeStart("");
                        setManualTimeEnd("");
                      }}
                      className="px-2 py-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {timeLogs.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {timeLogs.map((log, idx) => (
                    <div key={idx} className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg border ${editingTimeLogIndex === idx ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                      <span className="font-mono">
                        {log?.startTime ? format(new Date(log.startTime), 'dd/MM HH:mm') : '—'}
                        {' → '}
                        {log?.endTime ? format(new Date(log.endTime), 'HH:mm') : <span className="text-green-600 font-bold animate-pulse">Em andamento...</span>}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#0E1116]">
                          {log?.durationSeconds ? formatDuration(log.durationSeconds) : '—'}
                        </span>
                        {log?.endTime && (
                          <button
                            type="button"
                            onClick={() => handleEditTimeLog(idx)}
                            className="text-blue-400 hover:text-blue-600 p-1"
                            title="Editar Lançamento"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTimeLog(idx)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publicar no Portal de Transparência */}
            {(authService.getUser()?.role === 'admin' || authService.getUser()?.pode_publicar) ? (
              <div className="flex items-center gap-3 p-3.5 bg-green-50/40 dark:bg-green-950/20 rounded-xl border border-green-100/50 dark:border-green-900/30">
                <input
                  type="checkbox"
                  id="task-publicar-portal"
                  checked={publicarPortal}
                  onChange={e => setPublicarPortal(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                />
                <div>
                  <label htmlFor="task-publicar-portal" className="block text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                    Publicar no Portal de Transparência
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Esta tarefa ficará visível publicamente no Portal de Transparência do cliente.
                  </p>
                </div>
              </div>
            ) : (
              publicarPortal && (
                <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-gray-150 dark:border-gray-800 opacity-60">
                  <input
                    type="checkbox"
                    id="task-publicar-portal-disabled"
                    checked={true}
                    disabled
                    className="w-4 h-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                  />
                  <div>
                    <label htmlFor="task-publicar-portal-disabled" className="block text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed">
                      Publicar no Portal de Transparência (Ativo)
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Esta tarefa está publicada. Apenas usuários autorizados podem remover esta publicação.
                    </p>
                  </div>
                </div>
              )
            )}

            {editingTask && (
              <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-8">
                <CommentsSection entityType="task" entityId={editingTask.id} currentUser={authService.getUser()} />
              </div>
            )}
            </>
          )}

          <div className="pt-2 flex justify-between border-t border-gray-100 dark:border-gray-700 mt-2">
            {editingTask && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingTask.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all font-bold text-sm"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            ) : <div />}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#374A67] text-white rounded-lg hover:bg-[#2B3C57] transition-all font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              {editingTask ? "Atualizar Tarefa" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
