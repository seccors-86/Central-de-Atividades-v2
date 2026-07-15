import React, { useState, useEffect } from 'react';
import { SupportTicket, SupportStats, getTickets, getSupportStats, QUEUES, CATEGORIES, PRIORITIES, createTicket, updateTicket } from '../services/support';
import { getAreaDescendants } from '../utils';
import { SupportTicketModal } from './SupportTicketModal';
import { User, Area } from '../types';
import { LifeBuoy, AlertCircle, CheckCircle2, Clock, Plus, Filter, Edit2, Trash2, PieChart } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SupportModuleProps {
  currentUser: User;
  users: User[];
  areas: Area[];
  isManager: boolean;
  onGamificationUpdate?: (result: any) => void;
}

export const SupportModule: React.FC<SupportModuleProps> = ({ currentUser, users, areas, isManager, onGamificationUpdate }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, statsRes] = await Promise.all([
        getTickets({ limit: '100' }), // Carregando histórico recente
        getSupportStats()
      ]);
      setTickets(ticketsRes);
      setStats(statsRes);
    } catch (error) {
      console.error('Erro ao carregar suporte:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSaveTicket = async (data: Partial<SupportTicket>) => {
    try {
      let res;
      if (editingTicket) {
        res = await updateTicket(editingTicket.id, data);
      } else {
        res = await createTicket(data);
      }
      setIsModalOpen(false);
      setEditingTicket(null);
      loadData();

      // Trigger gamification updates if returned from backend
      if (res && (res as any).gamification && onGamificationUpdate) {
        onGamificationUpdate((res as any).gamification);
      }
    } catch (error) {
      console.error('Erro ao salvar ticket', error);
      alert('Erro ao salvar ticket. Tente novamente.');
    }
  };

  const handleEditClick = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const handleNewTicketClick = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const userAllowedAreas = React.useMemo(() => {
    if (currentUser.role === 'admin') return areas.map(a => a.id);
    return getAreaDescendants([currentUser.areaId], areas);
  }, [currentUser, areas]);

  const filteredTickets = tickets.filter(t => {
    if (currentUser.role !== 'admin') {
      const isAllowedArea = userAllowedAreas.includes(t.area_id);
      const isMine = t.creator_id === currentUser.id || t.responsible_id === currentUser.id;
      if (!isAllowedArea && !isMine) return false;
    }

    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                          t.demand_description.toLowerCase().includes(search.toLowerCase());
    const matchesQueue = queueFilter ? t.queue === queueFilter : true;
    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    return matchesSearch && matchesQueue && matchesStatus;
  });

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'Urgente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Alta': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Média': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">A Fazer</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">{stats.todo_count}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Em Andamento</span>
            </div>
            <p className="text-2xl font-extrabold text-blue-600">{stats.in_progress_count}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Validação</span>
            </div>
            <p className="text-2xl font-extrabold text-[#374A67]">{stats.validation_count}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Concluídos</span>
            </div>
            <p className="text-2xl font-extrabold text-[#0E1116]">{stats.done_count}</p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100 dark:border-red-800 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Urgentes Ativos</span>
            </div>
            <p className="text-2xl font-extrabold text-red-700">{stats.urgent_count}</p>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-1 gap-4 w-full flex-wrap">
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
          />
          <select
            value={queueFilter}
            onChange={(e) => setQueueFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
          >
            <option value="">Todas as Filas</option>
            {QUEUES.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
          >
            <option value="">Todos os Status</option>
            <option value="A fazer">A fazer</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Validação">Validação</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>
        <button
          onClick={handleNewTicketClick}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#374A67] text-white rounded-lg shadow hover:bg-[#2B3C57] transition-all font-bold whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Novo Ticket
        </button>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Título / Categoria</th>
                <th className="px-4 py-3">Fila</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando tickets...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum ticket encontrado.</td></tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500 dark:text-gray-400">{ticket.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0E1116] dark:text-gray-100 mb-0.5">{ticket.title}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{ticket.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-600">
                        {ticket.queue}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold">{ticket.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {ticket.responsible || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button onClick={() => handleEditClick(ticket)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupportTicketModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTicket(null);
        }}
        onSave={handleSaveTicket}
        ticket={editingTicket}
        users={users}
        areas={areas}
        currentUser={currentUser}
      />
    </div>
  );
};
