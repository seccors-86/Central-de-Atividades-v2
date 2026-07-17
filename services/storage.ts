import {
  ActivityLog,
  User,
  Tag,
  StatusConfig,
  AISummary,
  Area,
  Client,
  Task,
} from "../types";
import * as api from "./api";


// --- CLIENTS ---

export const getClients = async (): Promise<Client[]> => {
  return await api.get("/clients");
};

export const saveClients = async (clients: Client[]): Promise<void> => {
  for (const coop of clients) {
    await updateClient(coop);
  }
};

export const updateClient = async (coop: Client): Promise<void> => {
  await api.put(`/clients/${coop.id}`, { name: coop.name });
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.del(`/clients/${id}`);
};

// --- AREAS ---


export const getAreas = async (): Promise<Area[]> => {
  const areas = await api.get("/areas");
  return areas.map((area: any) => ({
    id: area.id,
    name: area.name,
    parentId: area.parentId || area.parent_id || undefined,
  }));
};

export const saveAreas = async (areas: Area[]): Promise<void> => {
  // This is a bulk operation - we'll update each area individually
  for (const area of areas) {
    await updateArea(area);
  }
};

export const updateArea = async (updatedArea: Area): Promise<void> => {
  await api.put(`/areas/${updatedArea.id}`, {
    name: updatedArea.name,
    parentId: updatedArea.parentId,
  });
};

// --- USERS ---

export const getUsers = async (): Promise<User[]> => {
  const users = await api.get("/users");
  return users.map((user: any) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    areaId: user.area_id,
    avatarUrl: user.avatar_url,
    available_hours: user.available_hours ? Number(user.available_hours) : undefined,
    cpf: user.cpf,
    phone: user.phone,
    email: user.email,
    pode_publicar: user.pode_publicar,
    mfaEnabled: user.mfa_enabled === true,
  }));
};

export const saveUsers = async (users: User[]): Promise<void> => {
  // Bulk operation - update each user
  for (const user of users) {
    await updateUser(user);
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.del(`/users/${id}`);
};

export const deleteArea = async (id: string): Promise<void> => {
  await api.del(`/areas/${id}`);
};

export const updateUser = async (updatedUser: User): Promise<void> => {
  await api.put(`/users/${updatedUser.id}`, {
    name: updatedUser.name,
    role: updatedUser.role,
    areaId: updatedUser.areaId,
    available_hours: updatedUser.available_hours,
    avatarUrl: updatedUser.avatarUrl,
    cpf: updatedUser.cpf,
    phone: updatedUser.phone,
    email: updatedUser.email,
    password: updatedUser.password,
    pode_publicar: updatedUser.pode_publicar,
  });
};

// --- TAGS ---

export const getTags = async (): Promise<Tag[]> => {
  return await api.get("/tags");
};

export const saveTags = async (tags: Tag[]): Promise<void> => {
  // Bulk operation - update each tag
  for (const tag of tags) {
    try {
      await api.put(`/tags/${tag.id}`, tag);
    } catch (error) {
      // If tag doesn't exist, create it
      await api.post("/tags", tag);
    }
  }
};

// --- STATUS CONFIGS ---

export const getStatuses = async (): Promise<StatusConfig[]> => {
  const statuses = await api.get("/statuses");
  return statuses.map((status: any) => ({
    id: status.id,
    label: status.label,
    color: status.color,
    type: status.type,
  }));
};

export const saveStatuses = async (statuses: StatusConfig[]): Promise<void> => {
  // Bulk operation - update each status
  for (const status of statuses) {
    try {
      await api.put(`/statuses/${status.id}`, status);
    } catch (error) {
      // If status doesn't exist, create it
      await api.post("/statuses", status);
    }
  }
};

// --- ACTIVITY LOGS ---

export const getLogs = async (): Promise<ActivityLog[]> => {
  return await api.get("/activity-logs");
};

export const saveLog = async (log: ActivityLog): Promise<any> => {
  try {
    // Try to update first
    return await api.put(`/activity-logs/${log.id}`, log);
  } catch (error) {
    // If doesn't exist, create it
    return await api.post("/activity-logs", log);
  }
};

export const deleteLog = async (id: string): Promise<void> => {
  await api.del(`/activity-logs/${id}`);
};

// --- TASKS ---

export const getTasks = async (): Promise<Task[]> => {
  return await api.get("/tasks");
};

export const saveTask = async (task: Task, isNew?: boolean): Promise<any> => {
  if (isNew) {
    return await api.post("/tasks", task);
  } else {
    try {
      // Try to update first
      return await api.put(`/tasks/${task.id}`, task);
    } catch (error) {
      // Only fallback if we are unsure (isNew is undefined)
      if (isNew === undefined) {
        return await api.post("/tasks", task);
      } else {
        throw error;
      }
    }
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.del(`/tasks/${id}`);
};

// --- AI SUMMARIES ---

export const getAISummaries = async (): Promise<AISummary[]> => {
  return await api.get("/ai-summaries");
};
