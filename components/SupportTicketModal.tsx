import React, { useState, useEffect } from 'react';
import { SupportTicket, QUEUES, CATEGORIES, PRIORITIES } from '../services/support';
import { User, Area } from '../types';
import { X, AlertCircle, MessageSquare, Play, Square, Pause, Clock } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface SupportTicketModalProps {
  ticket?: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SupportTicket>) => void;
  users: User[];
  areas: Area[];
  currentUser: User;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSave,
  users,
  areas,
  currentUser
}) => {
  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    title: '',
    queue: QUEUES[0],
    category: CATEGORIES[0],
    status: 'A fazer',
    priority: 'Baixa',
    requesting_area: currentUser.areaId || '',
    demand_description: '',
    details: '',
    time_spent: '00:00:00',
  });

  const [isTiming, setIsTiming] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTiming) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTiming]);

  // Sync back to time_spent string on change of elapsedSeconds
  useEffect(() => {
    const h = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    setFormData(prev => ({ ...prev, time_spent: `${h}:${m}:${s}` }));
  }, [elapsedSeconds]);

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
      // Parse existing time
      if (ticket.time_spent) {
        const [h, m, s] = ticket.time_spent.split(':').map(Number);
        setElapsedSeconds((h || 0) * 3600 + (m || 0) * 60 + (s || 0));
      } else {
        setElapsedSeconds(0);
      }
      setIsTiming(false);
    } else {
      setFormData({
        title: '',
        queue: QUEUES[0],
        category: CATEGORIES[0],
        status: 'A fazer',
        priority: 'Baixa',
        requesting_area: currentUser.areaId || '',
        demand_description: '',
        details: '',
        time_spent: '00:00:00',
      });
      setIsTiming(false);
      setElapsedSeconds(0);
    }
  }, [ticket, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-200">
                {ticket ? 'Editar Ticket' : 'Novo Ticket'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Central de Suporte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="ticket-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Título do Chamado *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-bold text-gray-800 dark:text-gray-200"
                  placeholder="Ex: Erro ao gerar relatório..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Fila de Atendimento</label>
                  <select
                    value={formData.queue || QUEUES[0]}
                    onChange={e => setFormData({ ...formData, queue: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {QUEUES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={formData.category || CATEGORIES[0]}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status || 'A fazer'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    <option value="A fazer">A fazer</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Validação">Validação</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Prioridade</label>
                  <select
                    value={formData.priority || 'Baixa'}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Timer UI */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 dark:border-purple-800 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTiming ? 'bg-purple-600 text-white animate-pulse' : 'bg-white dark:bg-gray-800 text-purple-600'}`}>
                     <Clock className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-purple-600/70 mb-1">Tempo de Atendimento</p>
                     <div className="text-2xl font-black text-purple-900 tracking-tighter tabular-nums leading-none">
                       {formData.time_spent || '00:00:00'}
                     </div>
                   </div>
                 </div>

                 <div className="flex gap-2">
                   {!isTiming ? (
                     <button
                       type="button"
                       onClick={() => setIsTiming(true)}
                       className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-sm transition-all"
                       title="Iniciar/Continuar Atendimento"
                     >
                       <Play className="w-5 h-5 fill-current" />
                     </button>
                   ) : (
                     <button
                       type="button"
                       onClick={() => setIsTiming(false)}
                       className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 shadow-sm transition-all"
                       title="Pausar Atendimento"
                     >
                       <Pause className="w-5 h-5 fill-current" />
                     </button>
                   )}
                   <button
                     type="button"
                     onClick={() => { setIsTiming(false); setElapsedSeconds(0); }}
                     className="p-3 bg-white dark:bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all"
                     title="Zerar Temporizador"
                   >
                     <Square className="w-5 h-5" />
                   </button>
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Descrição da Demanda
                </label>
                <div className="z-0 relative">
                  <RichTextEditor
                    value={formData.demand_description || ''}
                    onChange={val => setFormData({ ...formData, demand_description: val })}
                    placeholder="Descreva o problema ou a demanda de forma clara..."
                  />
                </div>
              </div>

              {ticket && (
                 <div className="z-0 relative">
                   <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Desfecho / Parecer (Ao concluir)</label>
                   <RichTextEditor
                     value={formData.outcome || ''}
                     onChange={val => setFormData({ ...formData, outcome: val })}
                     placeholder="Como o chamado foi resolvido?"
                     className="bg-green-50 rounded-xl"
                   />
                 </div>
              )}

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:text-gray-200 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="ticket-form"
            className="px-8 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm hover:shadow shadow-purple-200 rounded-xl transition-all flex items-center gap-2"
          >
            {ticket ? 'Salvar Alterações' : 'Criar Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
};
