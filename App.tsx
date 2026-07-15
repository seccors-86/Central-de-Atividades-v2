import React, { useState, useEffect } from "react";
import {
  User,
  ActivityLog,
  Tag,
  StatusConfig,
  AISummary,
  Area,
  Client,
  Task,
  GamificationProfile,
  Badge,
  XPResult,
  TimeLog,
} from "./types";
import * as storage from "./services/storage";
import * as geminiService from "./services/geminiService";
import { gamificationService } from "./services/gamification";
import { authService } from "./services/auth";
import { Login } from "./components/Login";
import { ActivityInput } from "./components/ActivityInput";
import { ActivityFeed } from "./components/ActivityFeed";
import { SummaryModal } from "./components/SummaryModal";
import { TagManagerModal } from "./components/TagManagerModal";
import { StatusManagerModal } from "./components/StatusManagerModal";
import { Dashboard } from "./components/Dashboard";
import { UserManagerModal } from "./components/UserManagerModal";
import { BucketManagerModal } from "./components/BucketManagerModal";
import { PhaseManagerModal } from "./components/PhaseManagerModal";
import { ClientManagerModal } from "./components/ClientManagerModal";
import { AISummaryHistoryModal } from "./components/AISummaryHistoryModal";
import { GamificationWidget } from "./components/GamificationWidget";
import { TaskBoard } from "./components/TaskBoard";
import { Gamificacao } from "./components/Gamificacao";
import { GamificationCelebration } from "./components/GamificationCelebration";
import { UserProfileModal } from "./components/UserProfileModal";
import { TaskModal } from "./components/TaskModal";
import { ProjectsModule } from "./components/ProjectsModule";
import { DashboardModule } from "./components/DashboardModule";
import { ProjectModal } from "./components/ProjectModal";
import { PrioritizationView } from "./components/PrioritizationView";
import { RecycleBin } from "./components/RecycleBin";
import { SupportModule } from "./components/SupportModule";
import { SuggestionsModule } from './components/SuggestionsModule';
import { GlobalHierarchicalSelect } from './components/GlobalHierarchicalSelect';
import { ProjectConfigManagerModal } from './components/ProjectConfigManagerModal';
import { NotificationBell } from './components/NotificationBell';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { Project, createProject, getProjects, updateProject, deleteProject, permanentDeleteProject } from "./services/projects";
import { KanbanBucket, ProjectPhase } from "./types";
import * as bucketService from "./services/buckets";
import * as phaseService from "./services/projectPhases";
import * as projectConfigService from "./services/projectConfig";
import * as notificationService from "./services/notifications";
import {
  Layout,
  LogOut,
  Sparkles,
  Filter,
  Settings2,
  Users,
  Calendar,
  ListChecks,
  History,
  XCircle,
  Briefcase,
  Plus,
  BookOpen,
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Archive,
  Star,
  Trash2,
  Building2,
  Kanban,
  Activity,
  Square,
  Trophy,
  Lightbulb,
  ShieldCheck
} from "lucide-react";
import {
  format,
  isSameDay,
  parseISO,
  subDays,
  isSaturday,
  isSunday,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { generateUUID, getHierarchicalAreaFilterIds } from "./utils";

const safeArray = (value: any): any[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return value ? [value] : [];
};

const sanitizeProject = (p: any): Project => ({
  ...p,
  selected_phases: safeArray(p.selected_phases)
});

const sanitizeTimeLogs = (timeLogs: any): TimeLog[] => {
  let parsed = timeLogs;

  if (typeof parsed === 'string' && parsed.startsWith('[')) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
};

const sanitizeTask = (t: any): Task => ({
  ...t,
  tagIds: safeArray(t.tagIds),
  memberIds: Array.isArray(t.memberIds) ? t.memberIds : [],
  timeLogs: sanitizeTimeLogs(t.timeLogs),
  subtasks: safeArray(t.subtasks)
});

const getSubtreeAreaIdsFrontend = (areaId: string | null, areasList: Area[]): string[] => {
  if (!areaId) return [];
  const result: string[] = [areaId];
  const children = areasList.filter(a => a.parentId === areaId);
  for (const child of children) {
    result.push(...getSubtreeAreaIdsFrontend(child.id, areasList));
  }
  return result;
};

const getRootAreaIdFrontend = (areaId: string | null, areasList: Area[]): string => {
  if (!areaId) return "";
  const currentArea = areasList.find(a => a.id === areaId);
  if (!currentArea) return areaId;
  if (!currentArea.parentId) return areaId;
  return getRootAreaIdFrontend(currentArea.parentId, areasList);
};

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [buckets, setBuckets] = useState<KanbanBucket[]>([]);
  const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([]);
  const [projectCategories, setProjectCategories] = useState<projectConfigService.ProjectCategoryConfig[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<projectConfigService.ProjectStatusConfig[]>([]);
  const [projectKpis, setProjectKpis] = useState<projectConfigService.ProjectKpiConfig[]>([]);
  const [notifications, setNotifications] = useState<notificationService.AppNotification[]>([]);
  const [projectNotificationTarget, setProjectNotificationTarget] = useState<string | null>(null);
  const [taskNotificationHighlightId, setTaskNotificationHighlightId] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<AISummary[]>([]);
  const [editingLog, setEditingLog] = useState<ActivityLog | undefined>(
    undefined
  );

  const allowedSubtreeAreaIds = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return areas.map(a => a.id);
    }

    if (currentUser.role === 'manager') {
      return getSubtreeAreaIdsFrontend(currentUser.areaId, areas);
    }

    // Colaborador mantém o escopo da gerência imediata.
    let rootAreaId = currentUser.areaId;
    const userArea = areas.find(a => a.id === rootAreaId);
    if (userArea && userArea.parentId) {
      rootAreaId = userArea.parentId;
    }

    return getSubtreeAreaIdsFrontend(rootAreaId, areas);
  }, [currentUser, areas]);

  const allowedAreas = React.useMemo(() => {
    return areas.filter(a => allowedSubtreeAreaIds.includes(a.id));
  }, [areas, allowedSubtreeAreaIds]);

  const dashboardUsers = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return users;
    return users.filter(u => allowedSubtreeAreaIds.includes(u.areaId));
  }, [currentUser, users, allowedSubtreeAreaIds]);

  const isTaskInAllowedTeamScope = React.useCallback((task: Task) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    const taskAreaIds = [
      task.areaId,
      task.demandanteAreaId,
      (task as any).area_id,
      (task as any).demandante_area_id,
    ].filter(Boolean) as string[];

    if (taskAreaIds.some(areaId => allowedSubtreeAreaIds.includes(areaId))) {
      return true;
    }

    if (task.ownerId === currentUser.id || task.memberIds?.includes(currentUser.id)) {
      return true;
    }

    const relatedUserIds = [task.ownerId, ...(task.memberIds || [])].filter(Boolean);
    return relatedUserIds.some(userId => {
      const user = users.find(u => u.id === userId);
      return Boolean(user?.areaId && allowedSubtreeAreaIds.includes(user.areaId));
    });
  }, [allowedSubtreeAreaIds, currentUser, users]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "tasks" | "projects" | "priority" | "support" | "recycle" | "gamification" | "suggestions">(
    (localStorage.getItem('activeTab') as any) || "dashboard"
  );

  // Dashboard Filters (Manager Only)
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [dateFilterType, setDateFilterType] = useState<'deadline' | 'execution'>('deadline');

  // UI States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiHistoryOpen, setIsAiHistoryOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectConfigModalOpen, setIsProjectConfigModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);

  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [celebrationData, setCelebrationData] = useState<XPResult | null>(null);

  const refreshProjects = React.useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await getProjects({ limit: '100' });
    setProjects(res.data.map(sanitizeProject));
  }, [isAuthenticated]);

  const getCurrentBadgeInfo = () => {
    if (!gamificationProfile || allBadges.length === 0) return null;
    let current = allBadges[0];
    const levelBadges = allBadges
      .filter(b => b.badgeType === 'level' || !b.badgeType)
      .sort((a, b) => a.minXp - b.minXp);
    for (let i = 0; i < levelBadges.length; i++) {
      if (gamificationProfile.xpTotal >= levelBadges[i].minXp) {
        current = levelBadges[i];
      }
    }
    return current;
  };

  // Global Active Timer state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser) {
      setActiveTask(null);
      setTimerSeconds(0);
      return;
    }

    const runningTask = tasks.find(t => t.timeLogs?.some(log => log && !log.endTime && log.userId === currentUser.id));
    if (runningTask) {
      setActiveTask(runningTask);
      const openLog = runningTask.timeLogs!.find(l => l && !l.endTime && l.userId === currentUser.id);
      if (openLog) {
        const start = new Date(openLog.startTime).getTime();
        const update = () => {
          setTimerSeconds(Math.floor((Date.now() - start) / 1000));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
      }
    } else {
      setActiveTask(null);
      setTimerSeconds(0);
    }
  }, [tasks]);

  useEffect(() => {
    const handleRefreshTasks = async () => {
      try {
        const loadedTasks = await storage.getTasks();
        setTasks(loadedTasks.map(sanitizeTask));
      } catch (err) {
        console.error("Failed to refresh tasks:", err);
      }
    };
    window.addEventListener('refresh_tasks', handleRefreshTasks);
    return () => window.removeEventListener('refresh_tasks', handleRefreshTasks);
  }, []);

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Set currentUser from JWT stored user
        const storedUser = authService.getUser();
        const [
          loadedUsers,
          loadedAreas,
          loadedLogs,
          loadedTasks,
          loadedTags,
          loadedStatuses,
          loadedAiHistory,
          loadedClients,
          loadedBuckets,
          loadedPhases,
          loadedProjectConfig,
          loadedNotifications
        ] = await Promise.all([
          storage.getUsers(),
          storage.getAreas(),
          storage.getLogs(),
          storage.getTasks(),
          storage.getTags(),
          storage.getStatuses(),
          storage.getAISummaries(),
          storage.getClients(),
          bucketService.getBuckets(),
          phaseService.getPhases(),
          projectConfigService.getProjectConfig(),
          notificationService.getNotifications()
        ]);

        setUsers(loadedUsers);
        setAreas(loadedAreas);
        setClients(loadedClients);
        setLogs(loadedLogs);
        setTasks(loadedTasks.map(sanitizeTask));
        setTags(loadedTags || []);
        setStatuses(loadedStatuses || []);
        setBuckets(loadedBuckets || []);
        setProjectPhases(loadedPhases || []);
        setProjectCategories(loadedProjectConfig?.categories || []);
        setProjectStatuses(loadedProjectConfig?.statuses || []);
        setProjectKpis(loadedProjectConfig?.kpis || []);
        setNotifications(loadedNotifications || []);
        setAiHistory(loadedAiHistory);

        // Set current user from backend user list (match by id from JWT)
        if (storedUser) {
          const matchedUser = loadedUsers.find((u) => u.id === storedUser.id);
          if (matchedUser) {
            setCurrentUser(matchedUser);
            try {
              const [profile, badgesList] = await Promise.all([
                gamificationService.getProfile(matchedUser.id),
                gamificationService.getBadges()
              ]);
              setGamificationProfile(profile);
              setAllBadges(badgesList);
            } catch (gameErr) {
              console.error("Erro ao carregar dados de gamificação:", gameErr);
            }
          } else {
            authService.logout();
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Falha ao carregar dados. Por favor, recarregue a página.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProjects();
    }
  }, [isAuthenticated, refreshProjects]);

  useEffect(() => {
    window.addEventListener('refresh_projects', refreshProjects);
    return () => window.removeEventListener('refresh_projects', refreshProjects);
  }, [refreshProjects]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Se não autenticado, mostra Login
  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#374A67] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Erro</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#374A67] text-white rounded-lg hover:bg-[#2B3C57] transition-colors font-bold"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const handleLogin = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) setCurrentUser(user);
    // Reset filters
    setSelectedFilter("all");
    setDateRange({ start: null, end: null });
    setActiveTab("activities");
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setEditingLog(undefined);
  };

  // --- LOG HANDLERS ---
  const handleSaveLog = async (log: ActivityLog) => {
    const res = await storage.saveLog(log);
    if (res && res.gamification) {
      handleGamificationResponse(res.gamification);
    }
    const updatedLogs = await storage.getLogs();
    setLogs(updatedLogs);
    setEditingLog(undefined);
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      await storage.deleteLog(id);
      const updatedLogs = await storage.getLogs();
      setLogs(updatedLogs);
    }
  };

  // --- TASK HANDLERS ---
  const handleSaveTask = async (task: Task, isNew?: boolean) => {
    // Check if progress changed to create dynamic log
    const existingTask = tasks.find((t) => t.id === task.id);
    const progressChanged =
      !existingTask || existingTask.progress !== task.progress;

    const res = await storage.saveTask(task, isNew);
    if (res && res.gamification && currentUser) {
      let matchedResult = null;
      if (Array.isArray(res.gamification)) {
        matchedResult = res.gamification.find((g: any) => g.userId === currentUser.id);
      } else {
        matchedResult = res.gamification;
      }
      if (matchedResult) {
        handleGamificationResponse(matchedResult);
      }
    }

    // Automation: Create log if progress changed or timer was used
    const hasTimeLogs = (task.timeLogs || []).length > 0;
    const isDone = task.progress === 100;
    const isStarted = task.progress > 0 || hasTimeLogs;

    if (isStarted && currentUser) {
      const totalSeconds = (task.timeLogs || []).reduce((acc, tl) => {
        if (tl?.durationSeconds) return acc + tl.durationSeconds;
        if (tl?.startTime && tl.endTime) return acc + Math.floor((new Date(tl.endTime).getTime() - new Date(tl.startTime).getTime())/1000);
        return acc;
      }, 0);

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const timeStr = totalSeconds > 0 ? ` [Tempo: ${h}h ${m}m]` : "";

      const typeStr = task.taskType === 'support' ? 'Suporte' : (task.projectName ? 'Projeto' : 'Atividade');
      const projectStr = task.projectName ? ` (${task.projectName})` : "";

      const logContent = `${typeStr}${projectStr}: "${task.title}" - Status: ${task.progress}%${timeStr}`;

      const newLog: ActivityLog = {
        id: generateUUID(),
        userId: currentUser.id,
        date: format(new Date(), "yyyy-MM-dd"),
        content: logContent,
        status: isDone ? "done" : "doing",
        tagIds: task.tagIds || [],
        timestamp: Date.now(),
      };

      // Apenas salva se for uma mudança relevante (evitar logs duplicados no mesmo dia para a mesma tarefa com mesmo progresso)
      // Aqui poderíamos adicionar uma verificação extra se necessário.
      const logRes = await storage.saveLog(newLog);
      if (logRes && logRes.gamification) {
        handleGamificationResponse(logRes.gamification);
      }
      const updatedLogs = await storage.getLogs();
      setLogs(updatedLogs);
    }

    const updatedTasks = await storage.getTasks();
    setTasks(updatedTasks);
    setEditingTask(undefined);
  };

  const handleStopActiveTimer = async () => {
    if (!activeTask) return;
    const now = new Date().toISOString();
    const updatedLogs = (activeTask.timeLogs || []).map(tl => {
      if (tl && !tl.endTime) {
        const start = new Date(tl.startTime).getTime();
        const end = new Date();
        const duration = Math.floor((end.getTime() - start) / 1000);
        return { ...tl, endTime: now, durationSeconds: duration };
      }
      return tl;
    });

    await handleSaveTask({ ...activeTask, timeLogs: updatedLogs });
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (window.confirm("Deseja arquivar esta tarefa? Ela poderá ser recuperada na Lixeira pelo administrador.")) {
      await storage.saveTask({ ...task, archived: true });
      const updatedTasks = await storage.getTasks();
      setTasks(updatedTasks);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(undefined);
  };

  const handleRestoreTask = async (task: Task) => {
    await storage.saveTask({ ...task, archived: false });
    const updatedTasks = await storage.getTasks();
    setTasks(updatedTasks);
  };

  const handlePermanentDeleteTask = async (id: string) => {
    await storage.deleteTask(id);
    const updatedTasks = await storage.getTasks();
    setTasks(updatedTasks);
  };

  // Exclusão em lote sem confirmação individual (o RecycleBin já confirma)
  const handleBulkDeleteTasks = async (ids: string[]) => {
    console.log('🗑️ Bulk delete tasks:', ids);
    try {
      for (const id of ids) {
        console.log('  Deleting:', id);
        await storage.deleteTask(id);
        console.log('  ✅ Deleted:', id);
      }
      const updatedTasks = await storage.getTasks();
      setTasks(updatedTasks);
      console.log('✅ Bulk delete complete, tasks reloaded');
    } catch (e) {
      console.error('❌ Bulk delete error:', e);
    }
  };

  const handleBulkRestoreTasks = async (tasks: Task[]) => {
    for (const task of tasks) {
      await storage.saveTask({ ...task, archived: false });
    }
    const updatedTasks = await storage.getTasks();
    setTasks(updatedTasks);
  };

  const handleRestoreProject = async (project: any) => {
    await updateProject(project.id, { archived: false });
    const projectsRes = await getProjects({ limit: '100' });
    setProjects(projectsRes.data);
  };

  const handlePermanentDeleteProject = async (id: string) => {
    await permanentDeleteProject(id);
    const projectsRes = await getProjects({ limit: '100' });
    setProjects(projectsRes.data);
  };

  // Exclusão em lote sem confirmação individual
  const handleBulkDeleteProjects = async (ids: string[]) => {
    for (const id of ids) {
      await permanentDeleteProject(id);
    }
    const projectsRes = await getProjects({ limit: '100' });
    setProjects(projectsRes.data);
  };

  const handleBulkRestoreProjects = async (projects: Project[]) => {
    for (const project of projects) {
      await updateProject(project.id, { archived: false });
    }
    const projectsRes = await getProjects({ limit: '100' });
    setProjects(projectsRes.data);
  };


  // --- CONFIG HANDLERS ---
  const handleSaveTags = async (newTags: Tag[]) => {
    await storage.saveTags(newTags);
    // storage.saveTags doesn't return the new list, but we passed it in.
    // However, to be safe and consistent with backend, we should reload or trust the input.
    // Since saveTags is bulk update, we can just set state.
    setTags(newTags);
  };

  const handleSaveStatuses = async (newStatuses: StatusConfig[]) => {
    await storage.saveStatuses(newStatuses);
    setStatuses(newStatuses);
  };

  const refreshNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Erro ao atualizar notificações:', err);
    }
  };

  const handleNotificationNavigate = async (link: string) => {
    const taskMatch = link.match(/\/tasks\/([^/]+)\/comments\/([^/?#]+)/);
    if (taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1]);
      const commentId = decodeURIComponent(taskMatch[2]);
      let task = tasks.find(t => t.id === taskId);
      if (!task) {
        const loadedTasks = await storage.getTasks();
        const sanitizedTasks = loadedTasks.map(sanitizeTask);
        setTasks(sanitizedTasks);
        task = sanitizedTasks.find(t => t.id === taskId);
      }
      if (task) {
        setEditingTask(task);
        setTaskNotificationHighlightId(commentId);
        setIsTaskModalOpen(true);
        setActiveTab('tasks');
      } else {
        alert('Não foi possível abrir a tarefa relacionada à notificação.');
      }
      return;
    }

    setProjectNotificationTarget(link);
    setActiveTab('projects');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open_project_comment', { detail: { link } }));
    }, 0);
  };

  const handleSaveUsers = async (newUsers: User[]) => {
    // Apenas salva usuários que realmente foram alterados ou criados
    const changedUsers = newUsers.filter(nu => {
      const old = users.find(u => u.id === nu.id);
      return !old || JSON.stringify(old) !== JSON.stringify(nu);
    });

    for (const user of changedUsers) {
      await storage.updateUser(user);
    }

    setUsers(newUsers);
  };

  const handleSaveProfile = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const fullUser: User = {
      ...currentUser,
      ...updatedData,
    };
    await storage.updateUser(fullUser);
    authService.updateUser(fullUser);
    setCurrentUser(fullUser);
    const loadedUsers = await storage.getUsers();
    setUsers(loadedUsers);
  };

  const handleSaveAreas = async (newAreas: Area[]) => {
    // Apenas salva áreas que realmente foram alteradas ou criadas
    const changedAreas = newAreas.filter(na => {
      const old = areas.find(a => a.id === na.id);
      return !old || JSON.stringify(old) !== JSON.stringify(na);
    });

    for (const area of changedAreas) {
      await storage.updateArea(area);
    }

    const updatedAreas = await storage.getAreas();
    setAreas(updatedAreas);
  };

  const handleSaveClients = async (newClients: Client[]) => {
    await storage.saveClients(newClients);
    const updatedClients = await storage.getClients();
    setClients(updatedClients);
  };

  const toggleAreaExpansion = (areaId: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  // --- AI HANDLERS ---
  const handleGenerateSummary = async () => {
    setIsAiModalOpen(true);
    setIsAiLoading(true);

    // Analyze logs only for the current view
    const logsToAnalyze = getFilteredLogs().slice(0, 100);

    const summaryText = await geminiService.generateWeeklySummary(
      logsToAnalyze,
      users
    );
    setAiSummary(summaryText);

    // Save to history
    const newSummary: AISummary = {
      id: generateUUID(),
      date: new Date().toISOString(),
      content: summaryText,
      periodStart: dateRange.start
        ? dateRange.start.toISOString()
        : subDays(new Date(), 7).toISOString(),
      periodEnd: dateRange.end
        ? dateRange.end.toISOString()
        : new Date().toISOString(),
    };
    await storage.saveAISummary(newSummary);
    const updatedHistory = await storage.getAISummaries();
    setAiHistory(updatedHistory);

    setIsAiLoading(false);
  };

  // --- FILTER HELPERS ---
  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setDateRange({ start, end });
  };



  // Gestores e membros só veem usuários da sua gerência (ou admin vê todos)
  const manageableUsers = dashboardUsers;

  // Helper to extract which users to filter based on selection
  const getTargetUserIdsForFilter = () => {
    if (selectedFilter === "all") {
      return users.map((u) => u.id);
    }

    if (selectedFilter.startsWith("area:")) {
      const areaId = selectedFilter.split(":")[1];
      const areaFilterIds = getHierarchicalAreaFilterIds([areaId], areas);
      return users.filter((u) => areaFilterIds.includes(u.areaId)).map((u) => u.id);
    }

    if (selectedFilter.startsWith("user:")) {
      const userId = selectedFilter.split(":")[1];
      return [userId];
    }

    return [];
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    if (selectedFilter !== "all") {
      const targetUserIds = getTargetUserIdsForFilter();
      filtered = filtered.filter((l) => targetUserIds.includes(l.userId));
    }

    if (dateRange.start && dateRange.end) {
      if (isSameDay(dateRange.start, dateRange.end)) {
        filtered = filtered.filter((l) =>
          isSameDay(parseISO(l.date), dateRange.start!)
        );
      } else {
        filtered = filtered.filter((l) => {
          const logDate = parseISO(l.date);
          return isWithinInterval(logDate, {
            start: startOfDay(dateRange.start!),
            end: endOfDay(dateRange.end!),
          });
        });
      }
    }
    return filtered;
  };

  const getFrequencyLogs = () => {
    if (selectedFilter === "all") {
      return logs;
    }

    const targetUserIds = getTargetUserIdsForFilter();
    return logs.filter((l) => targetUserIds.includes(l.userId));
  };

  // Filter Logic for Tasks

  const getFilteredTasks = () => {
    let filtered = tasks.filter(t => !t.archived);

    // Gestores veem tarefas da sua hierarquia mesmo quando a tarefa atende outra área.
    if (currentUser && currentUser.role !== 'admin') {
      filtered = filtered.filter(isTaskInAllowedTeamScope);
    }

    if (selectedFilter === "all") {
      // Show all tasks for all users
    } else if (selectedFilter.startsWith("area:")) {
      const areaId = selectedFilter.split(":")[1];
      const areaFilterIds = getHierarchicalAreaFilterIds([areaId], areas);
      filtered = filtered.filter((t) => {
        const taskAreaIds = [
          t.areaId,
          t.demandanteAreaId,
          (t as any).area_id,
          (t as any).demandante_area_id,
        ].filter(Boolean) as string[];
        return taskAreaIds.some(taskAreaId => areaFilterIds.includes(taskAreaId));
      });
    } else if (selectedFilter.startsWith("user:")) {
      const userId = selectedFilter.split(":")[1];
      filtered = filtered.filter(
        (t) => t.ownerId === userId || t.memberIds.includes(userId)
      );
    } else if (selectedFilter.startsWith("project:")) {
      const projectId = selectedFilter.split(":")[1];
      filtered = filtered.filter((t) => t.projectId === projectId);
    }

    if (dateRange.start) {
      const rangeStart = startOfDay(dateRange.start);
      const rangeEnd = endOfDay(dateRange.end || dateRange.start);

      filtered = filtered.filter((t) => {
        try {
          if (dateFilterType === 'execution') {
            if (!t.startDate && !t.deadline) return false;
            const taskStart = startOfDay(parseISO(t.startDate || t.deadline));
            const taskEnd = endOfDay(parseISO(t.deadline || t.startDate));
            return taskStart <= rangeEnd && taskEnd >= rangeStart;
          }

          if (!t.deadline) return false;
          const taskDate = parseISO(t.deadline);
          return isWithinInterval(taskDate, { start: rangeStart, end: rangeEnd });
        } catch {
          return false;
        }
      });
    }

    return filtered;
  };

  const filteredLogs = getFilteredLogs();
  const frequencyLogs = getFrequencyLogs();
  const filteredTasks = getFilteredTasks();

  const getDiarioBordoCount = () => {
    if (!currentUser) return 0;
    const role = currentUser.role || 'member';

    // 1. Filtrar visibilidade usando o mesmo escopo de hierarquia da tela de tarefas.
    const visible = tasks.filter(t => !t.archived).filter(task => {
      if (role === 'admin') return true;
      return isTaskInAllowedTeamScope(task);
    });

    // 2. Filtrar apenas qualificadas (com tempo ou concluídas)
    const qualified = visible.filter(task => {
      const hasTimeLogs = (task.timeLogs || []).some(tl => (tl?.durationSeconds || 0) > 0);
      const isCompleted = task.progress === 100;
      return hasTimeLogs || isCompleted;
    });

    // 3. Contar itens do feed (cada dia de timeLog ou 1 se concluída sem logs)
    let count = 0;
    qualified.forEach(task => {
      const isCompleted = task.progress === 100;
      const timeLogsByDay: Record<string, number> = {};
      let hasLogs = false;
      (task.timeLogs || []).forEach(tl => {
        if (tl?.startTime && tl.durationSeconds && tl.durationSeconds > 0) {
          try {
            const dateStr = format(parseISO(tl.startTime), 'yyyy-MM-dd');
            timeLogsByDay[dateStr] = (timeLogsByDay[dateStr] || 0) + tl.durationSeconds;
            hasLogs = true;
          } catch (e) {}
        }
      });
      if (hasLogs) {
        count += Object.keys(timeLogsByDay).length;
      } else if (isCompleted) {
        count += 1;
      }
    });
    return count;
  };

  const getRecentActivityStatus = (userId: string) => {
    const days = [];
    let current = new Date();
    while (days.length < 7) {
      if (!isSaturday(current) && !isSunday(current)) {
        days.push(current);
      }
      current = subDays(current, 1);
    }
    const workingDays = days.reverse();

    return workingDays.map((date) => {
      const hasLog = logs.some(
        (l) => l.userId === userId && isSameDay(parseISO(l.date), date)
      );
      return { date, hasLog };
    });
  };

  const handleGamificationResponse = (result: XPResult | null) => {
    if (!result || !currentUser) return;
    gamificationService.getProfile(currentUser.id).then(profile => {
      setGamificationProfile(profile);
    }).catch(err => console.error("Erro ao recarregar perfil de gamificação:", err));
    if (result.levelUp || (result.newBadges && result.newBadges.length > 0)) {
      setCelebrationData(result);
    }
  };

  // -- RENDER HELPERS FOR LOGIN --
  const renderUserCard = (user: User) => {
    const activity = getRecentActivityStatus(user.id);

    return (
      <button
        key={user.id}
        onClick={() => handleLogin(user.id)}
        className="w-full flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-[#374A67] hover:bg-orange-50 transition-all group relative overflow-hidden bg-gray-50 dark:bg-gray-700"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600 shadow-sm"
            />
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs shadow-md border border-gray-100 dark:border-gray-700"
              title={user.role === "admin" ? "Administrador" : (user.role === "manager" ? "Gestor" : "Colaborador")}
            >
              {user.role === "admin" ? "A" : (user.role === "manager" ? "G" : "C")}
            </div>
          </div>
          <div className="text-left">
            <p className="font-bold text-[#0E1116] dark:text-gray-100 text-sm group-hover:text-[#374A67]">
              {user.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">
              {user.role === "admin" ? "Administrador" : (user.role === "manager" ? "Gestor" : "Colaborador")}
            </p>
          </div>
        </div>

        <div className="flex gap-0.5 ml-auto mt-2 sm:mt-0">
          {activity.map((day, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-6 rounded-sm ${
                day.hasLog ? "bg-[#0E1116]" : "bg-gray-200"
              }`}
              title={format(day.date, "dd/MM")}
            ></div>
          ))}
        </div>
      </button>
    );
  };

  // Usuário autenticado mas não encontrado na lista (erro)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Usuário não encontrado</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Seu usuário foi autenticado mas não encontrado no sistema.</p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-[#374A67] text-white rounded-lg hover:bg-[#2B3C57] transition-colors font-bold"
          >
            Sair e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const isManager = currentUser.role === "manager" || currentUser.role === "admin";

  // Summary of tasks for the current context (Filtered User or Current User)
  const contextTasks = filteredTasks;

  const todoTasksCount = contextTasks.filter((t) => t.progress === 0).length;
  const doingTasksCount = contextTasks.filter(
    (t) => t.progress > 0 && t.progress < 100
  ).length;
  const doneTasksCount = contextTasks.filter((t) => t.progress === 100).length;

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-gray-900 flex flex-col font-sans text-[#0E1116] dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20 border-b-4 border-[#374A67] transition-colors duration-300 flex flex-col">
        {window.location.href.includes('hmg') && (
          <div className="bg-red-600 text-white text-center py-1 font-bold text-xs tracking-widest uppercase shadow-sm w-full">
            VERSÃO DE HOMOLOGAÇÃO
          </div>
        )}
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("suggestions")}
              className={`p-2 rounded-xl transition-colors relative group ${activeTab === 'suggestions' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
              title="Portal de Ideias"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full border border-white dark:border-gray-900"></span>
            </button>
            <div className="hidden md:block pl-4 border-l-2 border-[#374A67]/25 dark:border-gray-600">
              <img
                src={`${import.meta.env.BASE_URL}nuvyo.png`}
                alt="NUVYO - Gestão Inteligente"
                className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-[#374A67] text-white rounded-lg shadow hover:bg-[#2B3C57] transition-all font-bold text-xs lg:text-sm"
              >
                <Plus className="w-4 h-4" /> Nova Atividade
              </button>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-[#0E1116] text-white rounded-lg shadow hover:bg-[#080A0D] transition-all font-bold text-xs lg:text-sm"
              >
                <Plus className="w-4 h-4" /> Novo Projeto
              </button>
            </div>

            {/* Global Active Timer */}
            {activeTask && (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl animate-pulse shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest leading-none mb-1">Cronômetro Ativo</span>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#0E1116] dark:text-green-300 font-mono">{formatDuration(timerSeconds)}</span>
                      <span className="hidden md:inline-block text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={activeTask.title}>{activeTask.title}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleStopActiveTimer}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-red-50 hover:bg-red-600 dark:bg-red-900/20 dark:hover:bg-red-600 text-red-600 hover:text-white dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  title="Parar Cronômetro"
                >
                  <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                </button>
              </div>
            )}

            {/* Gamification Widget DESATIVADO
            {gamificationProfile && !isManager && (
              <div className="hidden sm:block">
                <GamificationWidget profile={gamificationProfile} allBadges={allBadges} />
              </div>
            )}
            */}

            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              onRefresh={refreshNotifications}
              onNavigate={handleNotificationNavigate}
            />

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-100 dark:border-gray-700 pr-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-left cursor-pointer"
              title="Visualizar e editar meu perfil"
            >
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                {/* GAMIFICAÇÃO DESATIVADA
                {gamificationProfile && allBadges.length > 0 && (() => {
                  const currentBadge = getCurrentBadgeInfo();
                  return currentBadge ? (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#374A67] rounded-full flex items-center justify-center text-[10px] text-white shadow-sm border border-white" title={currentBadge.name}>
                      {currentBadge.icon}
                    </div>
                  ) : null;
                })()}
                */}
              </div>
              <div className="hidden xl:block">
                <p className="text-sm font-bold text-[#0E1116] dark:text-gray-100 leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                    {isManager ? "Gestão" : "Colaborador"}
                  </p>
                  <span className="text-gray-300">•</span>
                  <p className="text-[10px] text-[#0E1116] uppercase tracking-wider font-bold">
                    {areas.find((a) => a.id === currentUser.areaId)?.name}
                  </p>
                </div>
              </div>
            </button>

            {isManager && (
              <div className="relative">
                <button
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className={`p-2.5 rounded-full transition-all ${isConfigOpen ? 'bg-orange-100 text-[#374A67]' : 'text-gray-400 hover:text-[#374A67] hover:bg-orange-50'}`}
                  title="Configurações de Gestão"
                >
                  <Settings2 className="w-6 h-6" />
                </button>

                {isConfigOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel do Gestor</p>
                    </div>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsSecurityModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <ShieldCheck className="w-4 h-4" /> Segurança e MFA
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsStatusModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <ListChecks className="w-4 h-4" /> Status das Atividades
                      </button>
                    )}

                    <button
                      onClick={() => { setIsUserModalOpen(true); setIsConfigOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                    >
                      <Users className="w-4 h-4" /> Equipe & Áreas
                    </button>

                    <button
                      onClick={() => { setIsTagModalOpen(true); setIsConfigOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                    >
                      <Settings2 className="w-4 h-4" /> Gerenciar Tags
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsBucketModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <Kanban className="w-4 h-4" /> Etapas do Kanban
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsPhaseModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <Briefcase className="w-4 h-4" /> Fases dos Projetos
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsProjectConfigModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <Briefcase className="w-4 h-4" /> Categorias/Status Projetos
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setIsClientModalOpen(true); setIsConfigOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-[#374A67] transition-colors font-bold"
                      >
                        <Building2 className="w-4 h-4" /> Gerenciar Clientes
                      </button>
                    )}

                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                    <button
                      onClick={() => { setIsAiHistoryOpen(true); setIsConfigOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors font-bold"
                    >
                      <History className="w-4 h-4" /> Histórico de Resumos IA
                    </button>

                    <button
                      onClick={() => { handleGenerateSummary(); setIsConfigOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white bg-[#0E1116] hover:bg-gray-800 transition-colors font-bold mt-1"
                    >
                      <Sparkles className="w-4 h-4 text-[#374A67]" /> Gerar Resumo com IA
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 text-gray-400 hover:text-[#374A67] hover:bg-orange-50 rounded-full transition-all"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Sair"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Modern Pill Design */}
      <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-20 z-[5] transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
              activeTab === "dashboard"
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            Painel Geral
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
              activeTab === "activities"
                ? "bg-[#374A67] text-white shadow-lg shadow-orange-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Diário de Bordo
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
              activeTab === "tasks"
                ? "bg-[#0E1116] text-white shadow-lg shadow-green-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            <Flag className="w-4 h-4" />
            Tarefas & Suporte
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
              activeTab === "projects"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Projetos
          </button>

          {/* MÓDULO DE GAMIFICAÇÃO DESATIVADO A PEDIDO
          <button
            onClick={() => setActiveTab("gamification")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
              activeTab === "gamification"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Gamificação
          </button>
          */}

          {isManager && (
            <button
              onClick={() => setActiveTab("recycle")}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 transform hover:scale-[1.02] ${
                activeTab === "recycle"
                  ? "bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Lixeira
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-8 w-full">
        {/* MOBILE: Activity Input Removed as requested */}

        {/* Header Actions */}
        {activeTab !== "projects" && activeTab !== "dashboard" && activeTab !== "suggestions" && (
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#0E1116] dark:text-white mb-2">
              {activeTab === "activities"
                ? isManager
                  ? "Visão Geral da Equipe"
                  : "Minhas Atividades"
                : "Tarefas e Suporte"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#374A67]" />
              Área:{" "}
              <span className="text-[#374A67] font-bold">
                {areas.find((a) => a.id === currentUser.areaId)?.name}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {activeTab === "tasks" && (
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#374A67] text-white rounded-lg shadow-lg hover:shadow-xl hover:bg-[#2B3C57] transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Nova Tarefa
              </button>
            )}
            {activeTab === "activities" && isManager && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <Sparkles className="w-4 h-4 text-[#374A67]" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Gestão Ativa</span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* GLOBAL FILTERS (Applies to both tabs) */}
        {activeTab !== "projects" && activeTab !== "dashboard" && activeTab !== "suggestions" && (

          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
              {/* Label */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide flex-shrink-0">
                <Filter className="w-4 h-4" /> Filtros
              </div>

              {/* Separador */}
              <div className="h-7 w-px bg-gray-200 dark:bg-gray-600 hidden lg:block flex-shrink-0"></div>

              {/* Filtro de Colaborador/Área/Projeto */}
              {!(activeTab === "activities" && currentUser?.role === "member") && (
                <>
	                  <GlobalHierarchicalSelect
	                    areas={areas}
	                    users={dashboardUsers}
                    selectedValue={selectedFilter}
                    onChange={setSelectedFilter}
                  />

                  {/* Separador */}
                  <div className="h-7 w-px bg-gray-200 dark:bg-gray-600 hidden lg:block flex-shrink-0"></div>
                </>
              )}

              {/* Filtro de Data */}
              <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch w-full lg:w-auto">
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value as 'deadline' | 'execution')}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#374A67] outline-none text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0"
                >
                  <option value="deadline">Prazo Final</option>
                  <option value="execution">Período de Execução</option>
                </select>
                <div className="flex flex-wrap gap-3 flex-1">
                  <div className="relative flex-1 min-w-[130px]">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      title="Data Início (De)"
                      value={dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : ""}
                      onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value ? parseISO(e.target.value) : null}))}
                      className="w-full pl-9 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#374A67] outline-none text-sm font-medium text-gray-600 dark:text-gray-300 placeholder-gray-400"
                    />
                  </div>
                  <div className="relative flex-1 min-w-[130px]">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      title="Data Fim (Até)"
                      value={dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : ""}
                      onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value ? parseISO(e.target.value) : null}))}
                      className="w-full pl-9 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#374A67] outline-none text-sm font-medium text-gray-600 dark:text-gray-300 placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Indicador de filtro ativo + limpar */}
              {(dateRange.start || selectedFilter !== "all") && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-[#374A67] bg-orange-50 px-3 py-1.5 rounded-lg">
                    Filtro Ativo
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFilter("all");
                      setDateRange({ start: null, end: null });
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Limpar Filtros"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB: DASHBOARD === */}
        {activeTab === "dashboard" && (
          <DashboardModule
            tasks={tasks.filter(t => !t.archived && (
              currentUser?.role === 'admin' ||
              isTaskInAllowedTeamScope(t)
            ))}
            projects={projects.filter(p => !p.archived && (
              currentUser?.role === 'admin' ||
              allowedSubtreeAreaIds.includes(p.area_id) ||
              allowedSubtreeAreaIds.includes(p.demandante_area_id || '') ||
              [p.creator_id, p.dono_id, p.owner_id].some(userId => {
                const relatedUser = users.find(u => u.id === userId);
                return Boolean(relatedUser?.areaId && allowedSubtreeAreaIds.includes(relatedUser.areaId));
              }) ||
              (p.shared_with || []).some(member => member.area_id && allowedSubtreeAreaIds.includes(member.area_id))
            ))}
            users={dashboardUsers}
            areas={areas}
            clients={clients}
            buckets={buckets}
            tags={tags}
            projectKpis={projectKpis}
          />
        )}

        {/* === TAB: ACTIVITIES === */}
        {activeTab === "activities" && (
          <>
            {/* TASKS SUMMARY WIDGET (Visible in Activity Tab) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Briefcase className="w-16 h-16 text-[#374A67]" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-orange-100 rounded-lg text-[#374A67]">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarefas Ativas</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#374A67] tracking-tight">
                    {todoTasksCount + doingTasksCount}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-16 h-16 text-blue-600" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Em Andamento</span>
                  </div>
                  <p className="text-3xl font-extrabold text-blue-900 tracking-tight">
                    {doingTasksCount}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <AlertCircle className="w-16 h-16 text-gray-400" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">A Fazer</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-200 tracking-tight">
                    {todoTasksCount}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CheckCircle2 className="w-16 h-16 text-[#0E1116]" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-100 rounded-lg text-[#0E1116]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Concluídas</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#0E1116] tracking-tight">
                    {doneTasksCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard & Feed */}
            {(isManager || !isManager) && (
              <Dashboard
                logs={filteredLogs}
                frequencyLogs={frequencyLogs}
                users={
                  isManager
                    ? manageableUsers.filter((u) =>
                        getTargetUserIdsForFilter().includes(u.id)
                      )
                    : [currentUser]
                }
                tags={tags}
                statuses={statuses}
                viewMode={isManager ? "manager" : "personal"}
                tasks={tasks.filter(t => !t.archived)}
                currentUser={currentUser}
                areas={areas}
              />
            )}

            {/* Gamification Widget Mobile DESATIVADO
            {gamificationProfile && !isManager && (
              <div className="sm:hidden mb-8">
                <GamificationWidget profile={gamificationProfile} allBadges={allBadges} />
              </div>
            )}
            */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* DESKTOP SIDEBAR for Activity Input Removed */}

              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#0E1116] dark:text-gray-100">
                    {isManager
                      ? `Atividades Registradas`
                      : "Histórico de Atividades"}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {getDiarioBordoCount()} registros
                  </span>
                </div>
                <ActivityFeed
                  areas={areas}
                  logs={filteredLogs}
                  tasks={tasks}
                  users={users}
                  tags={tags}
                  statuses={statuses}
                  currentUserId={currentUser.id}
                  isManager={isManager}
                  onEdit={setEditingLog}
                  onDelete={handleDeleteLog}
                />
              </div>
            </div>
          </>
        )}

        {/* === TAB: TASKS === */}
        {activeTab === "tasks" && (
          <>
            <TaskBoard
              buckets={buckets}
              tasks={filteredTasks}
              users={dashboardUsers}
              tags={tags}
              currentUserId={currentUser.id}
              isManager={isManager}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onUpdateTask={handleSaveTask}
              projects={projects.filter(p => !p.archived)}
              areas={areas}
            />
          </>
        )}

        {/* === TAB: PROJECTS GPO === */}
        {activeTab === "projects" && (
          <ProjectsModule
            currentUser={currentUser}
            users={users}
            areas={areas}
            clients={clients}
            tags={tags}
            isManager={isManager}
            buckets={buckets}
                projectPhases={projectPhases}
                projectCategories={projectCategories}
            projectStatuses={projectStatuses}
            projectKpis={projectKpis}
            notificationTarget={projectNotificationTarget}
            onNotificationTargetHandled={() => setProjectNotificationTarget(null)}
              />
        )}

        {/* === TAB: GAMIFICACAO === */}
        {/*
        {activeTab === "gamification" && (
          <Gamificacao
            currentUser={currentUser}
            users={users}
            isManager={isManager}
          />
        )}
        */}

        {/* === TAB: RECYCLE BIN === */}
        {activeTab === "recycle" && isManager && (
          <RecycleBin
            archivedTasks={tasks.filter(t => t.archived)}
            archivedProjects={projects.filter(p => p.archived)}
            onRestoreTask={handleRestoreTask}
            onDeleteTask={handlePermanentDeleteTask}
            onRestoreProject={handleRestoreProject}
            onDeleteProject={handlePermanentDeleteProject}
            onBulkDeleteTasks={handleBulkDeleteTasks}
            onBulkRestoreTasks={handleBulkRestoreTasks}
            onBulkDeleteProjects={handleBulkDeleteProjects}
            onBulkRestoreProjects={handleBulkRestoreProjects}
            users={users}
          />
        )}

        {/* === TAB: SUGGESTIONS === */}
        {activeTab === 'suggestions' && <SuggestionsModule currentUser={currentUser!} />}

      </main>

      {/* CELEBRAÇÃO DE GAMIFICAÇÃO DESATIVADA
      {celebrationData && (
        <CelebrationOverlay
          points={celebrationData.points}
          badges={celebrationData.badges}
          levelUp={celebrationData.levelUp}
          newLevel={celebrationData.level}
          onClose={() => setCelebrationData(null)}
        />
      )}
      */}

      {/* MODALS */}
      <SummaryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        content={aiSummary}
        isLoading={isAiLoading}
      />

      <AISummaryHistoryModal
        isOpen={isAiHistoryOpen}
        onClose={() => setIsAiHistoryOpen(false)}
        history={aiHistory}
      />

      <TagManagerModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={tags}
        onSaveTags={handleSaveTags}
      />

      <StatusManagerModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        statuses={statuses}
        onSaveStatuses={handleSaveStatuses}
      />

      <UserManagerModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        areas={areas}
        clients={clients}
        onSaveUsers={handleSaveUsers}
        onSaveAreas={handleSaveAreas}
        onSaveClients={handleSaveClients}
        currentUserId={currentUser.id}
        currentUser={currentUser}
      />

      <BucketManagerModal
        isOpen={isBucketModalOpen}
        onClose={() => setIsBucketModalOpen(false)}
        buckets={buckets}
        onBucketsChange={setBuckets}
      />

      <PhaseManagerModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        phases={projectPhases}
        onPhasesChange={setProjectPhases}
      />

      <ClientManagerModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={clients}
        onSaveClients={handleSaveClients}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        users={users}
        areas={areas}
        clients={clients}
        tags={tags}
        currentAreaId={currentUser.areaId}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        editingTask={editingTask}
        highlightCommentId={taskNotificationHighlightId || undefined}
        onHighlightConsumed={() => setTaskNotificationHighlightId(null)}
        projectKpis={projectKpis}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={async (data) => {
          try {
            await createProject(data);
            setIsProjectModalOpen(false);
            if (activeTab === 'projects') {
              window.location.reload(); // Simple reload to refresh projects tab if user is on it
            } else {
              alert('Projeto criado com sucesso!');
            }
          } catch (e) {
            alert('Erro ao criar projeto.');
          }
        }}
        users={users}
        areas={areas}
        clients={clients}
        currentUser={currentUser}
        projects={projects}
        projectPhases={projectPhases}
        projectCategories={projectCategories}
        projectStatuses={projectStatuses}
        projectKpis={projectKpis}
      />

      <ProjectConfigManagerModal
        isOpen={isProjectConfigModalOpen}
        onClose={() => setIsProjectConfigModalOpen(false)}
        categories={projectCategories}
        statuses={projectStatuses}
        kpis={projectKpis}
        onChange={({ categories, statuses, kpis }) => {
          setProjectCategories(categories);
          setProjectStatuses(statuses);
          setProjectKpis(kpis);
        }}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        areas={areas}
        onSaveProfile={handleSaveProfile}
      />

      <SecuritySettingsModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />

      {/* Version Footer */}
      <footer className="fixed bottom-2 right-4 z-40">
        <p className="text-[10px] text-gray-400 font-mono opacity-50 hover:opacity-100 transition-opacity">V2.1.0</p>
      </footer>
    </div>
  );
}

export default App;
