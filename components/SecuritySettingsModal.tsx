import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { mfaService } from '../services/mfa';
import { authService } from '../services/auth';

interface Props { isOpen: boolean; onClose: () => void; }

export const SecuritySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true); setError('');
    mfaService.getConfig().then(data => setRequired(Boolean(data.required))).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;
  const toggle = async () => {
    const next = !required;
    if (!window.confirm(next
      ? 'Ativar MFA obrigatório para todos? Todas as sessões serão encerradas e cada usuário deverá cadastrar um autenticador no próximo acesso.'
      : 'Desativar a exigência geral de MFA? Todas as sessões serão encerradas. Os cadastros MFA existentes serão preservados.')) return;
    setLoading(true); setError('');
    try {
      await mfaService.setRequired(next);
      alert(`MFA geral ${next ? 'ativado' : 'desativado'}. Entre novamente para continuar.`);
      authService.logout();
    } catch (err: any) { setError(err.message || 'Falha ao alterar MFA.'); setLoading(false); }
  };

  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
        <div className="flex items-center gap-3"><ShieldCheck className="text-[#374A67]" /><div><h2 className="font-bold">Segurança e MFA</h2><p className="text-xs text-gray-500">Política global de autenticação</p></div></div>
        <button onClick={onClose}><X /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 border rounded-xl dark:border-gray-700">
          <div><h3 className="font-bold">MFA obrigatório para todos</h3><p className="text-sm text-gray-500 mt-1">Exige código TOTP após a senha. Compatível com Microsoft Authenticator, Google Authenticator, Duo, Authy e 1Password.</p></div>
          <button onClick={toggle} disabled={loading} aria-pressed={required}
            className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${required ? 'bg-[#374A67]' : 'bg-gray-300'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${required ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className={`p-3 rounded-xl text-sm ${required ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          Estado atual: <strong>{required ? 'MFA obrigatório' : 'MFA não exigido'}</strong>
        </div>
        {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={16}/> Processando...</div>}
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      </div>
    </div>
  </div>;
};
