import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, Shield, Eye, Edit } from 'lucide-react';
import {
  Project,
  ProjectMember,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
} from '../services/projects';
import { User, Area } from '../types';

interface ProjectShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  users: User[];
  areas: Area[];
  currentUser: User;
  onMembersChanged?: () => void;
}

export const ProjectShareModal: React.FC<ProjectShareModalProps> = ({
  isOpen,
  onClose,
  project,
  users,
  areas,
  currentUser,
  onMembersChanged
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState<string | null>(null);

  const canManageShare = project.creator_id === currentUser.id || project.area_id === currentUser.areaId;

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectMembers(project.id);
      setMembers(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar membros do projeto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setSelectedUserId('');
      setSelectedRole('viewer');
      setError(null);
    }
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAdding(true);
    setError(null);
    try {
      await addProjectMember(project.id, selectedUserId, selectedRole);
      setSelectedUserId('');
      await loadMembers();
      if (onMembersChanged) onMembersChanged();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Erro ao adicionar membro ao projeto.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover o acesso deste membro?')) return;
    setRemovingId(userId);
    setError(null);
    try {
      await removeProjectMember(project.id, userId);
      await loadMembers();
      if (onMembersChanged) onMembersChanged();
    } catch (err) {
      console.error(err);
      setError('Erro ao remover membro do projeto.');
    } finally {
      setRemovingId(null);
    }
  };

  // Filtrar usuários elegíveis para convite:
  // 1. Não seja o criador/dono do projeto (project.creator_id)
  // 2. Não seja da mesma área que o projeto (pois esses já têm acesso por padrão)
  // 3. Não esteja na lista de membros já compartilhados
  const eligibleUsers = users.filter(u => {
    const isCreator = u.id === project.creator_id;
    const isSameArea = u.areaId === project.area_id;
    const isAlreadyMember = members.some(m => m.user_id === u.id);
    return !isCreator && !isSameArea && !isAlreadyMember;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-[28px] shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center text-[#374A67]">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Compartilhar Projeto
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              {error}
            </div>
          )}

          {/* Form para adicionar membro (Apenas gestores da área ou criador) */}
          {canManageShare ? (
            <form onSubmit={handleAddMember} className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                Convidar Equipes/Membros
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
                    Selecionar Usuário
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950 outline-none transition-all"
                  >
                    <option value="">Selecione um usuário...</option>
                    {eligibleUsers.map(u => {
                      const area = areas.find(a => a.id === u.areaId);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} ({area?.name || 'Sem Área'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950 outline-none transition-all"
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={adding || !selectedUserId}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#374A67] hover:bg-[#e67a1d] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-orange-100 dark:shadow-none"
                >
                  <UserPlus size={14} />
                  {adding ? 'Convidando...' : 'Convidar'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-xs text-blue-600 dark:text-blue-400">
              Apenas o criador do projeto ou gestores do departamento demandante podem gerenciar o compartilhamento.
            </div>
          )}

          {/* Lista de Membros Atuais */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">
              Quem tem acesso ({members.length})
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs font-bold text-gray-400">
                Carregando membros do projeto...
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                Nenhum membro convidado ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {members.map(member => {
                  const u = users.find(usr => usr.id === member.user_id);
                  const area = areas.find(a => a.id === u?.areaId);

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-orange-200 dark:hover:border-orange-950 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar_url || u?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                          className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700 shrink-0"
                          alt={member.name}
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">
                            {member.name}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">
                            {member.area_name || area?.name || 'Sem Área'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          member.role === 'editor'
                            ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400'
                        }`}>
                          {member.role === 'editor' ? (
                            <>
                              <Edit size={10} /> Editor
                            </>
                          ) : (
                            <>
                              <Eye size={10} /> Visualizador
                            </>
                          )}
                        </span>

                        {canManageShare && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={removingId === member.user_id}
                            className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                            title="Remover Acesso"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
