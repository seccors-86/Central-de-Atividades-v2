import React, { useState, useEffect, useRef } from 'react';
import { User, Area, Client } from '../types';
import { X, Plus, Trash2, Users, Building2, UserPlus, Briefcase, Edit2, Save, CornerDownRight, Search, ShieldOff } from 'lucide-react';
import { generateUUID } from '../utils';
import * as storage from '../services/storage';
import { API_BASE_URL } from '../services/api';
import { mfaService } from '../services/mfa';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  areas: Area[];
  onSaveUsers: (users: User[]) => void;
  onSaveAreas: (areas: Area[]) => void;
  clients?: Client[];
  onSaveClients?: (coops: Client[]) => void;
  currentUserId: string;
  currentUser: User;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({
  isOpen, onClose, users, areas, onSaveUsers, onSaveAreas, currentUserId, clients = [], onSaveClients, currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'areas'>('users');

  // User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'member' | 'manager' | 'admin'>('member');
  const [newUserAreaId, setNewUserAreaId] = useState<string>('');
  const [newUserCpf, setNewUserCpf] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserHours, setNewUserHours] = useState<number>(160);
  const [newUserAvatarUrl, setNewUserAvatarUrl] = useState<string>('');
  const [newUserPodePublicar, setNewUserPodePublicar] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetMfa = async (user: User) => {
    if (!window.confirm(`Remover o MFA de ${user.name}? Todas as sessões dessa pessoa serão revogadas.`)) return;
    try {
      await mfaService.resetUser(user.id);
      alert('MFA removido. O usuário deverá cadastrá-lo novamente no próximo acesso se a política geral estiver ativa.');
      window.location.reload();
    } catch (error: any) { alert(error.message || 'Falha ao redefinir MFA.'); }
  };

  // Area Form State
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaParentId, setNewAreaParentId] = useState<string>('');

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');

  const userArea = areas.find(a => a.id === currentUser.areaId);
  const getParentId = (area?: Area | null) => (area as any)?.parentId || (area as any)?.parent_id || '';
  const isUserSubarea = userArea ? !!getParentId(userArea) : false;
  const isAdmin = currentUser.role === 'admin';

  const getAllowedAreaIds = (): string[] => {
    if (isAdmin) {
      return areas.map(a => a.id);
    }
    const gestorAreaId = currentUser.areaId;
    if (!gestorAreaId) return [];
    const subAreaIds = areas.filter(a => getParentId(a) === gestorAreaId).map(a => a.id);
    return [gestorAreaId, ...subAreaIds];
  };

  const allowedAreaIds = getAllowedAreaIds();

  // Initialize area default when modal opens or areas change
  useEffect(() => {
    if (allowedAreaIds.length > 0 && (!newUserAreaId || !allowedAreaIds.includes(newUserAreaId))) {
      setNewUserAreaId(allowedAreaIds[0]);
    }
  }, [areas, newUserAreaId, currentUser, allowedAreaIds]);

  useEffect(() => {
    if (isOpen) {
      if (isUserSubarea && !isAdmin) {
        setActiveTab('users');
      }
      if (!isAdmin && !isUserSubarea) {
        setNewAreaParentId(currentUser.areaId);
      } else {
        setNewAreaParentId('');
      }
    }
  }, [isOpen, isUserSubarea, isAdmin, currentUser.areaId]);

  if (!isOpen) return null;

  // --- Helpers to Organize Hierarchy ---
  const parentAreas = areas.filter(a => !getParentId(a));
  const getSubAreas = (parentId: string) => areas.filter(a => getParentId(a) === parentId);

  const allowedParentAreas = parentAreas.filter(p => allowedAreaIds.includes(p.id));
  const getAllowedSubAreas = (parentId: string) => getSubAreas(parentId).filter(s => allowedAreaIds.includes(s.id));

  // --- Users Handlers ---

  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserRole(user.role);
    setNewUserAreaId(user.areaId);
    setNewUserCpf(user.cpf || '');
    setNewUserPhone(user.phone || '');
    setNewUserHours(user.available_hours || 160);
    setNewUserPassword(''); // always clear password input when editing
    setNewUserAvatarUrl(user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com') ? user.avatarUrl : '');
    setNewUserPodePublicar(user.pode_publicar || false);
  };

  const handleCancelEditUser = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserRole('member');
    setNewUserCpf('');
    setNewUserPhone('');
    setNewUserPassword('');
    setNewUserHours(160);
    setNewUserAvatarUrl('');
    setNewUserPodePublicar(false);
    if (allowedAreaIds.length > 0) setNewUserAreaId(allowedAreaIds[0]);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setIsUploading(true);
      // Upload via proxy NGINX (API_BASE_URL)
      const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        // Salvar URL relativa apontando pelo proxy
        setNewUserAvatarUrl(`${API_BASE_URL}${data.url.startsWith('/api') ? data.url.replace('/api', '') : data.url}`);
      } else {
        alert('Falha ao enviar a foto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro no upload da foto.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserAreaId) return;

    if (editingUser) {
      // Update existing
      const updatedUsers = users.map(u =>
        u.id === editingUser.id
          ? { ...u, name: newUserName.trim(), role: newUserRole, areaId: newUserAreaId, cpf: newUserCpf.trim() || undefined, phone: newUserPhone.trim() || undefined, available_hours: newUserHours, password: newUserPassword || undefined, avatarUrl: newUserAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName.trim())}&background=random&color=fff`, pode_publicar: newUserPodePublicar }
          : u
      );
      onSaveUsers(updatedUsers);
      handleCancelEditUser();
    } else {
      // Create new
      const newUser: User = {
        id: generateUUID(),
        name: newUserName.trim(),
        role: newUserRole,
        areaId: newUserAreaId,
        cpf: newUserCpf.trim() || undefined,
        phone: newUserPhone.trim() || undefined,
        available_hours: newUserHours,
        password: newUserPassword || undefined,
        avatarUrl: newUserAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName.trim())}&background=random&color=fff`,
        pode_publicar: newUserPodePublicar
      };
      onSaveUsers([...users, newUser]);
      setNewUserName('');
      setNewUserRole('member');
      setNewUserPodePublicar(false);
      if (allowedAreaIds.length > 0) setNewUserAreaId(allowedAreaIds[0]);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza? Isso impedirá o acesso deste usuário.')) {
      try {
        await storage.deleteUser(id);
        onSaveUsers(users.filter(u => u.id !== id));
        if (editingUser?.id === id) handleCancelEditUser();
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Erro ao excluir usuário. Tente novamente.');
      }
    }
  };

  // --- Areas Handlers ---

  const handleEditAreaClick = (area: Area) => {
    setEditingArea(area);
    setNewAreaName(area.name);
    setNewAreaParentId(getParentId(area));
  };

  const handleCancelEditArea = () => {
    setEditingArea(null);
    setNewAreaName('');
    setNewAreaParentId(!isAdmin && !isUserSubarea ? currentUser.areaId : '');
  };

  const handleSaveArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    if (editingArea) {
      // Update existing
      const updatedAreas = areas.map(a => {
        if (a.id !== editingArea.id) return a;
        const next = { ...a, name: newAreaName.trim(), parentId: newAreaParentId || undefined } as any;
        delete next.parent_id;
        return next;
      });
      onSaveAreas(updatedAreas);
      handleCancelEditArea();
    } else {
      // Create new
      const newArea: Area = {
        id: generateUUID(),
        name: newAreaName.trim(),
        parentId: newAreaParentId || undefined
      };
      onSaveAreas([...areas, newArea]);
      setNewAreaName('');
      setNewAreaParentId(!isAdmin && !isUserSubarea ? currentUser.areaId : '');
    }
  };

  const handleDeleteArea = async (id: string) => {
    const hasUsers = users.some(u => u.areaId === id);
    const hasSubAreas = areas.some(a => getParentId(a) === id);

    if (hasUsers || hasSubAreas) {
      alert('Não é possível excluir uma área que possui usuários vinculados ou subáreas.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta área?')) {
      try {
        await storage.deleteArea(id);
        onSaveAreas(areas.filter(a => a.id !== id));
        if (editingArea?.id === id) handleCancelEditArea();
      } catch (error) {
        console.error('Failed to delete area:', error);
        alert('Erro ao excluir área. Tente novamente.');
      }
    }
  };

  // Filter users based on search and area filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedAreaFilter === 'all' ? allowedAreaIds.includes(user.areaId) : user.areaId === selectedAreaFilter;
    const isUserAllowed = allowedAreaIds.includes(user.areaId);
    return matchesSearch && matchesArea && isUserAllowed;
  });

  // Filter areas based on search
  const filteredParentAreas = allowedParentAreas.filter(area => {
    return area.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#374A67]" />
            Gestão de Equipe e Áreas
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === 'users'
                ? 'border-[#374A67] text-[#374A67]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Colaboradores
          </button>
          {(!isUserSubarea || isAdmin) && (
            <button
              onClick={() => setActiveTab('areas')}
              className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'areas'
                  ? 'border-[#374A67] text-[#374A67]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Áreas / Setores
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">

          {activeTab === 'users' && (
            <>
              {/* Search and Filter Bar */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
                  />
                </div>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="all">Todas as Áreas</option>
                  {allowedParentAreas.map(parent => (
                    <React.Fragment key={parent.id}>
                      <option value={parent.id}>{parent.name}</option>
                      {getAllowedSubAreas(parent.id).map(sub => (
                        <option key={sub.id} value={sub.id}>&nbsp;&nbsp;↓ {sub.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>

              <form onSubmit={handleSaveUser} className={`mb-6 space-y-3 p-4 rounded-xl border ${editingUser ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent'}`}>
                <div className="flex items-center justify-between">
                   <h4 className={`text-xs font-bold uppercase flex items-center gap-1 ${editingUser ? 'text-[#374A67]' : 'text-gray-500'}`}>
                      {editingUser ? <Edit2 className="w-3 h-3" /> : <UserPlus className="w-4 h-4" />}
                      {editingUser ? 'Editando Colaborador' : 'Novo Colaborador'}
                   </h4>
                   {editingUser && (
                      <button type="button" onClick={handleCancelEditUser} className="text-xs text-gray-500 underline hover:text-gray-700">Cancelar</button>
                   )}
                </div>

                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome Completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
                  maxLength={30}
                />

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Foto / Avatar</label>
                    <div className="flex items-center gap-2">
                      {newUserAvatarUrl && (
                        <img src={newUserAvatarUrl} alt="Avatar Preview" className="w-8 h-8 rounded-full border border-gray-200" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:text-gray-300"
                      />
                      {isUploading && <span className="text-xs text-orange-500 font-bold">Enviando...</span>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newUserCpf}
                    onChange={(e) => setNewUserCpf(e.target.value)}
                    placeholder="CPF (Apenas números)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-800"
                    maxLength={11}
                  />
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="Telefone"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-800"
                    maxLength={15}
                  />
                </div>

                <div className="flex gap-3">
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder={editingUser ? "Nova senha (vazio = manter)" : "Defina uma senha forte"}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-800"
                  />
                  <input
                    type="number"
                    value={newUserHours}
                    onChange={(e) => setNewUserHours(Number(e.target.value))}
                    placeholder="Horas Disp."
                    className="w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-800"
                    min={1}
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="member">Colaborador</option>
                      <option value="manager">Gestor</option>
                      {isAdmin && <option value="admin">Administrador</option>}
                    </select>
                  </div>
                  <div className="flex-1">
                    <select
                      value={newUserAreaId}
                      onChange={(e) => setNewUserAreaId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="" disabled>Selecione a Área</option>
                      {allowedParentAreas.map(parent => (
                        <React.Fragment key={parent.id}>
                          <option value={parent.id} className="font-bold">{parent.name}</option>
                          {getAllowedSubAreas(parent.id).map(sub => (
                             <option key={sub.id} value={sub.id}>&nbsp;&nbsp;↳ {sub.name}</option>
                          ))}
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50/50 dark:bg-gray-700 rounded-lg border border-orange-100/50 dark:border-gray-600">
                    <input
                      type="checkbox"
                      id="user-pode-publicar"
                      checked={newUserPodePublicar}
                      onChange={(e) => setNewUserPodePublicar(e.target.checked)}
                      className="w-4 h-4 text-[#374A67] border-gray-300 rounded focus:ring-[#374A67] cursor-pointer"
                    />
                    <label htmlFor="user-pode-publicar" className="text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                      Permitir publicar no Portal de Transparência
                    </label>
                  </div>
                )}

                {!isAdmin && newUserPodePublicar && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-800 rounded-lg border border-gray-100 opacity-60">
                    <input
                      type="checkbox"
                      id="user-pode-publicar-disabled"
                      checked={true}
                      disabled
                      className="w-4 h-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                    />
                    <label htmlFor="user-pode-publicar-disabled" className="text-xs font-bold text-gray-400 cursor-not-allowed select-none">
                      Permitir publicar no Portal de Transparência (Ativo)
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newUserName.trim() || !newUserAreaId}
                  className="w-full flex items-center justify-center gap-2 bg-[#374A67] text-white p-2 rounded-lg hover:bg-[#2B3C57] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                >
                  {editingUser ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingUser ? 'Salvar Alterações' : 'Adicionar Usuário'}
                </button>
              </form>

              <div className="space-y-3">
                {filteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">Nenhum usuário encontrado.</p>
                )}
                {filteredUsers.map(user => {
                  const area = areas.find(a => a.id === user.areaId);
                  const isMe = user.id === currentUserId;
                  const isEditing = editingUser?.id === user.id;

                  return (
                    <div key={user.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all ${isEditing ? 'border-[#374A67] ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="flex items-center gap-3">
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700" />
                        <div>
                          <p className="font-bold text-sm text-[#0E1116]">{user.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <span className="capitalize font-semibold">
                               {user.role === 'admin' ? 'Administrador' : (user.role === 'manager' ? 'Gestor' : 'Colaborador')}
                             </span>
                             <span>•</span>
                             <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{area?.name || 'Sem Área'}</span>
                             {user.pode_publicar && (
                               <>
                                 <span>•</span>
                                 <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">Portal</span>
                               </>
                             )}
                             {user.mfaEnabled && <><span>•</span><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">MFA</span></>}
                             {user.available_hours && (
                               <><span>•</span><span className="font-mono">{user.available_hours}h</span></>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {isAdmin && user.mfaEnabled && (
                          <button onClick={() => handleResetMfa(user)} className="text-gray-400 hover:text-amber-600 transition-colors p-2" title="Redefinir MFA">
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditUserClick(user)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-2"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-2"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'areas' && (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar área por nome..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
                  />
                </div>
              </div>

              <form onSubmit={handleSaveArea} className={`mb-6 p-4 rounded-xl border ${editingArea ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent'}`}>
                   <div className="flex justify-between items-center mb-3">
                      <label className={`text-xs font-bold uppercase flex items-center gap-2 ${editingArea ? 'text-[#374A67]' : 'text-gray-500'}`}>
                        {editingArea ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {editingArea ? 'Editando Área' : 'Nova Área / Subárea'}
                      </label>
                      {editingArea && (
                        <button type="button" onClick={handleCancelEditArea} className="text-xs text-gray-500 underline hover:text-gray-700">Cancelar</button>
                      )}
                   </div>

                   <div className="space-y-3">
                      <div>
                          <input
                            type="text"
                            value={newAreaName}
                            onChange={(e) => setNewAreaName(e.target.value)}
                            placeholder="Nome da Área (Ex: Time Agro)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
                            maxLength={30}
                          />
                      </div>

                      <div className="flex gap-2">
                          <select
                            value={newAreaParentId}
                            onChange={(e) => setNewAreaParentId(e.target.value)}
                            disabled={!isAdmin && !isUserSubarea}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm bg-white dark:bg-gray-700 dark:text-gray-100 disabled:opacity-75"
                          >
                            {!isAdmin && !isUserSubarea ? (
                              <option value={currentUser.areaId}>
                                Subárea de: {areas.find(a => a.id === currentUser.areaId)?.name || ''}
                              </option>
                            ) : (
                              <>
                                <option value="">É uma Gerência (Nível Superior)</option>
	                                {parentAreas
                                    .filter(p => p.id !== editingArea?.id)
                                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                                    .map(parent => (
	                                   <option key={parent.id} value={parent.id}>Subárea de: {parent.name}</option>
	                                ))}
                              </>
                            )}
                          </select>

                          <button
                            type="submit"
                            disabled={!newAreaName.trim()}
                            className="bg-[#0E1116] text-white p-2 rounded-lg hover:bg-[#080A0D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                      </div>
                   </div>
              </form>

              <div className="space-y-4">
                {filteredParentAreas.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">Nenhuma área encontrada.</p>
                )}
                {filteredParentAreas.map(area => {
                   const subAreas = getAllowedSubAreas(area.id);
                   const isEditing = editingArea?.id === area.id;

                   return (
                      <div key={area.id} className="space-y-2">
                          {/* Parent Area Card */}
                          <div className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg transition-all ${isEditing ? 'border-[#374A67] ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                 <Briefcase className="w-4 h-4 text-gray-800 dark:text-gray-300" />
                              </div>
                              <div>
                                 <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{area.name}</p>
                                 <p className="text-[10px] text-gray-500 uppercase font-bold">Gerência</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEditAreaClick(area)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteArea(area.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>

                          {/* Sub Areas */}
                          {subAreas.map(sub => {
                             const isSubEditing = editingArea?.id === sub.id;
                             return (
                                <div key={sub.id} className={`ml-8 flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-all ${isSubEditing ? 'border-[#374A67] ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                       <div className="w-6 h-px bg-gray-300 dark:bg-gray-600 ml-4 mr-2" />
                                       <div>
                                         <p className="font-medium text-sm text-gray-700 dark:text-gray-200">{sub.name}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditAreaClick(sub)} className="text-gray-400 hover:text-blue-600 p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteArea(sub.id)} className="text-gray-400 hover:text-red-600 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                             )
                          })}
                      </div>
                   );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
