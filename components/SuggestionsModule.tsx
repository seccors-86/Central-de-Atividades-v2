import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ThumbsUp, Plus, Clock, CheckCircle2, PlayCircle, XCircle, Trash2, Edit2, Users, MoreVertical } from 'lucide-react';
import { Suggestion, User, SuggestionVoter } from '../types';
import { getSuggestions, createSuggestion, toggleVote, deleteSuggestion, updateSuggestion, updateSuggestionStatus, getSuggestionVoters } from '../services/apiOnda4';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichTextEditor } from './RichTextEditor';
import { HtmlRenderer } from './HtmlRenderer';

interface SuggestionsModuleProps {
  currentUser: User;
}

export const SuggestionsModule: React.FC<SuggestionsModuleProps> = ({ currentUser }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Modal de Votantes
  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [currentVoters, setCurrentVoters] = useState<SuggestionVoter[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [selectedSuggestionTitle, setSelectedSuggestionTitle] = useState('');

  const loadSuggestions = async () => {
    try {
      const data = await getSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    try {
      const newSugg = await createSuggestion({
        user_id: currentUser.id,
        title: newTitle,
        description: newDescription
      });
      setSuggestions([newSugg, ...suggestions]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    try {
      const updated = await updateSuggestion(id, { title: editTitle, description: editDescription });
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, title: updated.title, description: updated.description, updated_at: updated.updated_at } : s));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar. Você tem permissão?');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sugestão?')) return;
    try {
      await deleteSuggestion(id);
      setSuggestions(suggestions.filter(s => s.id !== id));
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir. Você tem permissão?');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updated = await updateSuggestionStatus(id, newStatus);
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: updated.status } : s));
    } catch (error) {
      console.error(error);
    }
  };

  const handleVote = async (id: string) => {
    try {
      const result = await toggleVote(id, currentUser.id);
      setSuggestions(suggestions.map(s => {
        if (s.id === id) {
          const isRemoving = result.action === 'removed';
          return {
            ...s,
            votes: isRemoving ? s.votes - 1 : s.votes + 1,
            voted_by: isRemoving
              ? s.voted_by.filter(uid => uid !== currentUser.id)
              : [...s.voted_by, currentUser.id]
          };
        }
        return s;
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const openVotersModal = async (suggId: string, title: string) => {
    setVotersModalOpen(true);
    setVotersLoading(true);
    setSelectedSuggestionTitle(title);
    setCurrentVoters([]);
    try {
      const voters = await getSuggestionVoters(suggId);
      setCurrentVoters(voters);
    } catch (error) {
      console.error(error);
    } finally {
      setVotersLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Em Avaliação': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'Em Desenvolvimento': return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'Lançado':
      case 'Implementado': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Recusado':
      case 'Reprovado': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Em Avaliação': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'Em Desenvolvimento': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Lançado':
      case 'Implementado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'Recusado':
      case 'Reprovado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#374A67]"></div></div>;
  }

  // Agrupamento para as 3 colunas
  const cols = {
    avaliacao: suggestions.filter(s => s.status === 'Em Avaliação'),
    desenvolvimento: suggestions.filter(s => s.status === 'Em Desenvolvimento'),
    tratados: suggestions.filter(s => ['Lançado', 'Recusado', 'Implementado', 'Reprovado'].includes(s.status))
  };

  const renderCard = (sugg: Suggestion) => {
    const hasVoted = sugg.voted_by.includes(currentUser.id);
    const isOwner = sugg.user_id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    const canEdit = isOwner || isAdmin;

    const isEditing = editingId === sugg.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={sugg.id}
        className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3 group relative"
      >
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none dark:text-white"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
            <div className="z-0 relative mb-2">
              <RichTextEditor
                value={editDescription}
                onChange={setEditDescription}
                className="bg-gray-50 dark:bg-gray-900 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 font-bold px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
              <button onClick={() => handleUpdate(sugg.id)} className="text-xs text-white bg-blue-500 hover:bg-blue-600 font-bold px-3 py-1 rounded-lg">Salvar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{sugg.title}</h3>
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(sugg.id); setEditTitle(sugg.title); setEditDescription(sugg.description); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(sugg.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-gray-500 dark:text-gray-400 text-xs line-clamp-4">
              <HtmlRenderer content={sugg.description} />
            </div>

            {/* Status & Admin Dropdown */}
            <div className="flex justify-between items-center mt-2">
              {isAdmin ? (
                <select
                  value={sugg.status}
                  onChange={(e) => handleStatusChange(sugg.id, e.target.value)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border outline-none cursor-pointer appearance-none ${getStatusBg(sugg.status)}`}
                >
                  <option value="Em Avaliação">Em Avaliação</option>
                  <option value="Em Desenvolvimento">Em Desenvolvimento</option>
                  <option value="Implementado">Implementado</option>
                  <option value="Reprovado">Reprovado</option>
                </select>
              ) : (
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border ${getStatusBg(sugg.status)}`}>
                  {getStatusIcon(sugg.status)}
                  {sugg.status}
                </div>
              )}

              {/* Vote Button */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openVotersModal(sugg.id, sugg.title)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center"
                  title="Ver quem votou"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleVote(sugg.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    hasVoted
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                  <span className="text-[10px] font-black">{sugg.votes}</span>
                </button>
              </div>
            </div>

            {/* Author info */}
            <div className="flex items-center gap-2 mt-1 pt-3 border-t border-gray-50 dark:border-gray-700/50">
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                {sugg.user_avatar ? (
                  <img src={sugg.user_avatar} alt={sugg.user_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-black text-gray-500">{(sugg.user_name || '?').charAt(0)}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 flex-1 truncate">{sugg.user_name}</span>
              <span className="text-[9px] text-gray-300 dark:text-gray-600">
                {format(new Date(sugg.created_at), "dd MMM", { locale: ptBR })}
              </span>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-[#374A67]" />
            Portal de Ideias
          </h1>
          <p className="text-gray-500 mt-2">Sugira melhorias para o sistema, gerencie as ideias e vote nas que você apoia!</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#374A67] hover:bg-[#2B3C57] text-white px-5 py-3 rounded-2xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-5 h-5" />
          Nova Ideia
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        {/* Coluna 1: Em Avaliação */}
        <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Em Avaliação
            </h2>
            <span className="bg-white dark:bg-gray-700 text-xs font-bold px-2 py-0.5 rounded-full text-gray-500">{cols.avaliacao.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-thin">
            {cols.avaliacao.length === 0 ? <p className="text-center text-xs text-gray-400 mt-4">Nenhuma ideia nesta fase.</p> : cols.avaliacao.map(renderCard)}
          </div>
        </div>

        {/* Coluna 2: Em Desenvolvimento */}
        <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-3xl p-4 border border-blue-100/50 dark:border-blue-800/30 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-blue-500" /> Em Desenvolvimento
            </h2>
            <span className="bg-white dark:bg-gray-700 text-xs font-bold px-2 py-0.5 rounded-full text-blue-600">{cols.desenvolvimento.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-thin">
            {cols.desenvolvimento.length === 0 ? <p className="text-center text-xs text-blue-300 mt-4">Nenhuma ideia sendo desenvolvida.</p> : cols.desenvolvimento.map(renderCard)}
          </div>
        </div>

        {/* Coluna 3: Tratados */}
        <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-400" /> Tratados
            </h2>
            <span className="bg-white dark:bg-gray-700 text-xs font-bold px-2 py-0.5 rounded-full text-gray-500">{cols.tratados.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-thin">
            {cols.tratados.length === 0 ? <p className="text-center text-xs text-gray-400 mt-4">Nenhuma ideia tratada.</p> : cols.tratados.map(renderCard)}
          </div>
        </div>
      </div>

      {/* Modal Nova Sugestão */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
            >
              <h2 className="text-xl font-black text-gray-800 dark:text-white mb-6">Nova Ideia de Melhoria</h2>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título resumido da sua ideia</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex: Modo Escuro Automático"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#374A67] focus:border-transparent outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Como funcionaria? Por que é importante?</label>
                    <div className="z-0 relative">
                      <RichTextEditor
                        value={newDescription}
                        onChange={setNewDescription}
                        placeholder="Descreva detalhadamente a sua sugestão..."
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-bold text-white bg-[#374A67] hover:bg-[#2B3C57] rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                  >
                    Enviar Sugestão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Votantes */}
      <AnimatePresence>
        {votersModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setVotersModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-800 dark:text-white">Apoiadores da Ideia</h3>
                <button onClick={() => setVotersModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XCircle className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">"{selectedSuggestionTitle}"</p>

              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                {votersLoading ? (
                  <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#374A67]"></div></div>
                ) : currentVoters.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">Nenhum voto registrado ainda.</p>
                ) : (
                  currentVoters.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {v.photo ? (
                          <img src={v.photo} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-gray-500">{(v.name || '?').charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">{v.name}</span>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{v.area_name || 'Sem Área'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
