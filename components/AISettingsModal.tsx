import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Save, X } from 'lucide-react';
import { AIConfiguration, AIModelOption, AIProvider } from '../types';
import { aiService } from '../services/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const emptyConfig: AIConfiguration = {
  enabled: true,
  provider: 'google',
  model: '',
  hasApiKey: false,
  providers: [
    { id: 'google', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic Claude' }
  ]
};

export const AISettingsModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [config, setConfig] = useState<AIConfiguration>(emptyConfig);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<AIModelOption[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setApiKey('');
    setModels([]);
    aiService.getConfiguration()
      .then(setConfig)
      .catch(err => setError(err.message || 'Falha ao carregar a configuração.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const changeProvider = (provider: AIProvider) => {
    setConfig(current => ({ ...current, provider, model: '', hasApiKey: current.provider === provider ? current.hasApiKey : false }));
    setApiKey('');
    setModels([]);
    setError('');
    setSuccess('');
  };

  const loadModels = async () => {
    setLoadingModels(true);
    setError('');
    setSuccess('');
    try {
      const result = await aiService.listModels(config.provider, apiKey || undefined);
      setModels(result.models);
      setConfig(current => ({
        ...current,
        model: result.models.some(model => model.id === current.model) ? current.model : (result.models[0]?.id || '')
      }));
      setSuccess(`${result.models.length} modelo(s) disponível(is) para esta chave.`);
    } catch (err: any) {
      setModels([]);
      setError(err.message || 'Não foi possível carregar os modelos.');
    } finally {
      setLoadingModels(false);
    }
  };

  const save = async () => {
    if (config.enabled && (!config.model || (!apiKey && !config.hasApiKey))) {
      setError('Informe a chave, carregue os modelos e selecione um modelo antes de salvar.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await aiService.saveConfiguration({
        enabled: config.enabled,
        provider: config.provider,
        model: config.model,
        apiKey: apiKey || undefined
      });
      setConfig(current => ({ ...current, ...saved, hasApiKey: Boolean(saved.hasApiKey) }));
      setApiKey('');
      setSuccess('Configuração validada e salva com segurança.');
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6FAFC] dark:bg-[#374A67]/30"><Bot className="text-[#374A67] dark:text-[#E6FAFC]" /></div>
            <div><h2 className="text-lg font-black text-[#0E1116] dark:text-white">Configuração da IA</h2><p className="text-xs text-gray-500">Disponível somente para o superadmin</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fechar"><X /></button>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-[#374A67]" size={32} /></div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-5 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div><h3 className="font-bold text-[#0E1116] dark:text-white">Relatórios com IA ativos</h3><p className="text-sm text-gray-500 mt-1">Quando desativado, nenhum gestor poderá gerar novos relatórios. O histórico permanece disponível.</p></div>
                <button type="button" onClick={() => setConfig(current => ({ ...current, enabled: !current.enabled }))} aria-pressed={config.enabled}
                  className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${config.enabled ? 'bg-[#374A67]' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <label className="block">
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Provedor</span>
                <select value={config.provider} onChange={event => changeProvider(event.target.value as AIProvider)}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#374A67] outline-none">
                  {config.providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                </select>
              </label>

              <div>
                <label htmlFor="ai-api-key" className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Chave da API</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input id="ai-api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={event => setApiKey(event.target.value)}
                    autoComplete="new-password" spellCheck={false}
                    placeholder={config.hasApiKey ? 'Chave armazenada — deixe vazio para manter' : 'Cole a chave diretamente neste campo'}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#374A67] outline-none" />
                  <button type="button" onClick={() => setShowKey(current => !current)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label={showKey ? 'Ocultar chave' : 'Exibir chave'}>
                    {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">A chave é enviada apenas ao backend, validada no provedor e armazenada criptografada. Ela nunca volta para o navegador.</p>
              </div>

              <button type="button" onClick={loadModels} disabled={loadingModels || (!apiKey && !config.hasApiKey)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#374A67] text-[#374A67] dark:text-[#E6FAFC] font-bold hover:bg-[#E6FAFC]/60 dark:hover:bg-[#374A67]/20 disabled:opacity-50">
                {loadingModels ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Carregar modelos disponíveis
              </button>

              <label className="block">
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Modelo utilizado</span>
                {models.length > 0 ? (
                  <select value={config.model} onChange={event => setConfig(current => ({ ...current, model: event.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#374A67] outline-none">
                    {models.map(model => <option key={model.id} value={model.id}>{model.name} ({model.id})</option>)}
                  </select>
                ) : (
                  <input value={config.model} readOnly placeholder="Carregue os modelos da chave"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500" />
                )}
              </label>

              {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
              {success && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2"><CheckCircle2 size={18} />{success}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-gray-600 dark:text-gray-300">Fechar</button>
                <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0E1116] text-white font-bold flex items-center gap-2 hover:bg-[#374A67] disabled:opacity-60">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar configuração
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
