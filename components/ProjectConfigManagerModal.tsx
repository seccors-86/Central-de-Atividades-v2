import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Briefcase } from 'lucide-react';
import {
  ProjectCategoryConfig,
  ProjectKpiConfig,
  ProjectStatusConfig,
  createProjectCategory,
  createProjectKpi,
  createProjectStatus,
  deleteProjectCategory,
  deleteProjectKpi,
  deleteProjectStatus,
  sortProjectConfig,
  updateProjectCategory,
  updateProjectKpi,
  updateProjectStatus
} from '../services/projectConfig';

interface ProjectConfigManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProjectCategoryConfig[];
  statuses: ProjectStatusConfig[];
  kpis: ProjectKpiConfig[];
  onChange: (data: { categories: ProjectCategoryConfig[]; statuses: ProjectStatusConfig[]; kpis: ProjectKpiConfig[] }) => void;
}

export const ProjectConfigManagerModal: React.FC<ProjectConfigManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  statuses,
  kpis,
  onChange
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [statusName, setStatusName] = useState('');
  const [kpiName, setKpiName] = useState('');
  const [statusColor, setStatusColor] = useState('#0E1116');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sortedConfig = sortProjectConfig({ categories, statuses, kpis });
  const sortedCategories = sortedConfig.categories;
  const sortedStatuses = sortedConfig.statuses;
  const sortedKpis = sortedConfig.kpis;

  const emitChange = (data: { categories: ProjectCategoryConfig[]; statuses: ProjectStatusConfig[]; kpis: ProjectKpiConfig[] }) => {
    onChange(sortProjectConfig(data));
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setLoading(true);
    try {
      const created = await createProjectCategory({ name: categoryName.trim(), position: categories.length + 1 });
      emitChange({ categories: [...categories, created], statuses, kpis });
      setCategoryName('');
    } finally {
      setLoading(false);
    }
  };

  const addStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) return;
    setLoading(true);
    try {
      const created = await createProjectStatus({ name: statusName.trim(), color: statusColor, position: statuses.length + 1 });
      emitChange({ categories, statuses: [...statuses, created], kpis });
      setStatusName('');
    } finally {
      setLoading(false);
    }
  };

  const addKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) return;
    setLoading(true);
    try {
      const created = await createProjectKpi({ name: kpiName.trim(), position: kpis.length + 1 });
      emitChange({ categories, statuses, kpis: [...kpis, created] });
      setKpiName('');
    } finally {
      setLoading(false);
    }
  };

  const renameCategory = async (category: ProjectCategoryConfig, name: string) => {
    const updated = await updateProjectCategory(category.id, { ...category, name });
    emitChange({ categories: categories.map(c => c.id === updated.id ? updated : c), statuses, kpis });
  };

  const renameStatus = async (status: ProjectStatusConfig, patch: Partial<ProjectStatusConfig>) => {
    const updated = await updateProjectStatus(status.id, { ...status, ...patch });
    emitChange({ categories, statuses: statuses.map(s => s.id === updated.id ? updated : s), kpis });
  };

  const renameKpi = async (kpi: ProjectKpiConfig, name: string) => {
    const updated = await updateProjectKpi(kpi.id, { ...kpi, name });
    emitChange({ categories, statuses, kpis: kpis.map(item => item.id === updated.id ? updated : item) });
  };

  const removeCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria de projeto? Projetos existentes manterão o texto atual.')) return;
    await deleteProjectCategory(id);
    emitChange({ categories: categories.filter(c => c.id !== id), statuses, kpis });
  };

  const removeStatus = async (id: string) => {
    if (!confirm('Excluir este status de projeto? Projetos existentes manterão o texto atual.')) return;
    await deleteProjectStatus(id);
    emitChange({ categories, statuses: statuses.filter(s => s.id !== id), kpis });
  };

  const removeKpi = async (id: string) => {
    if (!confirm('Excluir este KPI? Projetos existentes manterão o texto atual.')) return;
    await deleteProjectKpi(id);
    emitChange({ categories, statuses, kpis: kpis.filter(kpi => kpi.id !== id) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#374A67]" />
            Categorias, Status e KPIs de Projetos
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <form onSubmit={addCategory} className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">Nova Categoria</label>
              <input value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
              <button disabled={loading || !categoryName.trim()} className="w-full flex items-center justify-center gap-2 bg-[#374A67] text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>
            <div className="space-y-2">
              {sortedCategories.map(category => (
                <div key={category.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800">
                  <input
                    defaultValue={category.name}
                    onBlur={e => e.target.value.trim() && e.target.value !== category.name && renameCategory(category, e.target.value.trim())}
                    className="flex-1 bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                  />
                  <button onClick={() => removeCategory(category.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <form onSubmit={addKpi} className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">Novo KPI</label>
              <input value={kpiName} onChange={e => setKpiName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
              <button disabled={loading || !kpiName.trim()} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>
            <div className="space-y-2">
              {sortedKpis.map(kpi => (
                <div key={kpi.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800">
                  <input
                    defaultValue={kpi.name}
                    onBlur={e => e.target.value.trim() && e.target.value !== kpi.name && renameKpi(kpi, e.target.value.trim())}
                    className="flex-1 bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                  />
                  <button onClick={() => removeKpi(kpi.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <form onSubmit={addStatus} className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">Novo Status</label>
              <div className="flex gap-2">
                <input value={statusName} onChange={e => setStatusName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
                <input type="color" value={statusColor} onChange={e => setStatusColor(e.target.value)} className="w-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" />
              </div>
              <button disabled={loading || !statusName.trim()} className="w-full flex items-center justify-center gap-2 bg-[#0E1116] text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
                <Save className="w-4 h-4" /> Adicionar
              </button>
            </form>
            <div className="space-y-2">
              {sortedStatuses.map(status => (
                <div key={status.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800">
                  <input type="color" value={status.color || '#6b7280'} onChange={e => renameStatus(status, { color: e.target.value })} className="w-9 h-9 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" />
                  <input
                    defaultValue={status.name}
                    onBlur={e => e.target.value.trim() && e.target.value !== status.name && renameStatus(status, { name: e.target.value.trim() })}
                    className="flex-1 bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                  />
                  <button onClick={() => removeStatus(status.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
