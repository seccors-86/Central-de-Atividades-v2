import React, { useState, useRef, useEffect } from 'react';
import { User, Area } from '../types';
import { X, Camera, Eye, EyeOff, Lock, Phone, CreditCard, User as UserIcon, Loader2, Save } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  areas: Area[];
  onSaveProfile: (updatedData: Partial<User>) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  areas,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [cpf, setCpf] = useState(currentUser.cpf || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setCpf(currentUser.cpf || '');
      setPhone(currentUser.phone || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const currentArea = areas.find((a) => a.id === currentUser.areaId);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setIsUploading(true);
      setErrorMsg('');
      const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(`${API_BASE_URL}${data.url.startsWith('/api') ? data.url.replace('/api', '') : data.url}`);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Falha ao enviar a foto de perfil.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de rede ao enviar a foto de perfil.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) {
      setErrorMsg('O nome completo não pode ficar em branco.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    if (cpf.trim() && cpf.replace(/\D/g, '').length !== 11) {
      setErrorMsg('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    try {
      setIsSaving(true);

      const updatedData: Partial<User> = {
        name: name.trim(),
        role: currentUser.role,
        areaId: currentUser.areaId,
        available_hours: currentUser.available_hours,
        avatarUrl,
        cpf: cpf.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      if (password) {
        updatedData.password = password;
      }

      await onSaveProfile(updatedData);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar as alterações do perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 text-[#374A67] rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                Editar Meu Perfil
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerencie seus dados de acesso e informações de contato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full shrink-0"></span>
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Left side: Photo upload & static info */}
            <div className="flex flex-col items-center space-y-4 border-r border-gray-100 dark:border-gray-700/50 pr-0 md:pr-6">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                {/* Overlay upload camera */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  title="Alterar foto de perfil"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </button>

                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-bold text-[#374A67] hover:text-[#2B3C57] transition-colors flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 rounded-full"
              >
                <Camera size={12} /> Alterar Foto
              </button>

              {/* Static attributes */}
              <div className="w-full space-y-3 pt-2 text-center md:text-left">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Cargo / Perfil</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">
                    {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'manager' ? 'Gestor' : 'Colaborador'}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Gerência / Área</span>
                  <span className="text-xs font-bold text-[#0E1116] dark:text-green-400">
                    {currentArea ? currentArea.name : 'Não informada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Editable fields */}
            <div className="md:col-span-2 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-150 focus:border-[#374A67] dark:focus:border-[#374A67] outline-none transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CPF */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    CPF
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-gray-400">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="Somente números (11 dígitos)"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-gray-150 focus:border-[#374A67] dark:focus:border-[#374A67] outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Telefone
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-gray-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="DDD + Telefone"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-gray-150 focus:border-[#374A67] dark:focus:border-[#374A67] outline-none transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Password change group */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Alterar Senha (Opcional)</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nova Senha */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Deixe em branco para manter"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-800 dark:text-gray-150 focus:border-[#374A67] dark:focus:border-[#374A67] outline-none transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmação de Senha */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-800 dark:text-gray-150 focus:border-[#374A67] dark:focus:border-[#374A67] outline-none transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/20 dark:bg-transparent -mx-6 -mb-6 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-extrabold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-extrabold text-white bg-[#0E1116] hover:bg-[#080A0D] disabled:bg-gray-400 rounded-xl transition-all shadow-md active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
