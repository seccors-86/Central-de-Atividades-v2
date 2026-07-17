import React, { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Bot, Building2, CalendarRange, Download, FileText, Loader2, RefreshCw, Send, Sparkles, UserRound, UsersRound, X } from 'lucide-react';
import { AIReportTemplate, AISummary, AIStatus, Area, Client, User } from '../types';
import { aiService } from '../services/ai';
import { AIReportContent, exportAIReportToPDF } from './AIReportContent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  areas: Area[];
  clients: Client[];
  users: User[];
  onGenerated: (report: AISummary) => void;
  onConfigure?: () => void;
}

type ScopeType = 'all' | 'area' | 'client' | 'user';

export const AIReportModal: React.FC<Props> = ({ isOpen, onClose, currentUser, areas, clients, users, onGenerated, onConfigure }) => {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [templates, setTemplates] = useState<AIReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState('senior-project-manager');
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [scopeId, setScopeId] = useState('');
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadInitial = async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedStatus, loadedTemplates] = await Promise.all([aiService.getStatus(), aiService.getTemplates()]);
      setStatus(loadedStatus);
      setTemplates(loadedTemplates);
      if (!loadedTemplates.some(template => template.id === templateId)) setTemplateId(loadedTemplates[0]?.id || '');
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar o gerador de relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setReport(null);
    setQuestion('');
    setScopeType('all');
    setScopeId('');
    setPeriodStart(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setPeriodEnd(format(new Date(), 'yyyy-MM-dd'));
    void loadInitial();
  }, [isOpen]);

  const scopeOptions = useMemo(() => {
    if (scopeType === 'area') return areas.map(area => ({ id: area.id, name: area.name }));
    if (scopeType === 'client') return clients.map(client => ({ id: client.id, name: client.name }));
    if (scopeType === 'user') return users.map(user => ({ id: user.id, name: user.name }));
    return [];
  }, [scopeType, areas, clients, users]);
  const selectedTemplate = templates.find(template => template.id === templateId);

  if (!isOpen) return null;

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    if (templates.find(template => template.id === id)?.requiredScope === 'client') {
      setScopeType('client');
      setScopeId('');
    }
  };

  const generate = async () => {
    if (!status?.enabled) {
      setError('A IA ainda não foi configurada pelo superadmin.');
      return;
    }
    if (!templateId || !periodStart || !periodEnd || periodStart > periodEnd) {
      setError('Selecione um modelo e um período válido.');
      return;
    }
    if (scopeType !== 'all' && !scopeId) {
      setError('Selecione a área, o cliente ou o colaborador do relatório.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const generated = await aiService.generateReport({ templateId, periodStart, periodEnd, scopeType, scopeId: scopeId || null, question: question.trim() || undefined });
      setReport(generated);
      onGenerated(generated);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar o relatório.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-5">
      <div className="w-full max-w-7xl h-[94vh] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-5 md:px-7 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6FAFC] dark:bg-[#374A67]/30"><Sparkles className="text-[#374A67] dark:text-[#E6FAFC]" /></div>
            <div><h2 className="text-xl font-black text-[#0E1116] dark:text-white">Relatórios com IA</h2><p className="text-xs text-gray-500">Escolha o escopo, use um roteiro pronto ou faça sua própria pergunta</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fechar"><X /></button>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#374A67]" size={38} /></div>
        ) : (
          <div className="flex-1 min-h-0 grid lg:grid-cols-[390px_1fr]">
            <aside className="overflow-y-auto p-5 border-r border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 space-y-5">
              <div className={`p-3 rounded-xl text-sm ${status?.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                {status?.enabled ? <><strong>IA ativa:</strong> {status.providerLabel} · {status.model}</> : <><strong>IA não configurada.</strong> Solicite ao superadmin.</>}
                {!status?.enabled && currentUser.role === 'admin' && onConfigure && (
                  <button onClick={onConfigure} className="block mt-2 font-bold underline">Configurar agora</button>
                )}
              </div>

              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">1. Formato do relatório</h3>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button key={template.id} onClick={() => chooseTemplate(template.id)}
                      className={`w-full text-left p-3 rounded-xl border transition ${templateId === template.id ? 'border-[#374A67] bg-[#E6FAFC] dark:bg-[#374A67]/25 ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#374A67]/50'}`}>
                      <span className="font-bold text-sm text-[#0E1116] dark:text-white">{template.name}</span>
                      <span className="block text-xs text-gray-500 mt-1 leading-relaxed">{template.description}</span>
                      <span className="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wide text-[#374A67]">
                        {template.featured && <><Sparkles size={12} /> Recomendado · </>}{template.sections.length} seções
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">2. Período</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-500">Início<input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} className="mt-1 w-full p-2.5 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white" /></label>
                  <label className="text-xs text-gray-500">Fim<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} className="mt-1 w-full p-2.5 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white" /></label>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">3. Escopo</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['all', currentUser.role === 'admin' ? 'Toda empresa' : 'Minha estrutura', Building2],
                    ['area', 'Área', UsersRound],
                    ['client', 'Cliente', FileText],
                    ['user', 'Colaborador', UserRound]
                  ] as const).map(([id, label, Icon]) => (
                    <button key={id} disabled={selectedTemplate?.requiredScope === 'client' && id !== 'client'} onClick={() => { setScopeType(id); setScopeId(''); }}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed ${scopeType === id ? 'border-[#374A67] bg-[#E6FAFC] text-[#0E1116]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800'}`}>
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
                {scopeType !== 'all' && (
                  <select value={scopeId} onChange={event => setScopeId(event.target.value)} className="mt-2 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Selecione...</option>
                    {scopeOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                )}
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">4. Pergunta adicional</h3>
                <textarea value={question} onChange={event => setQuestion(event.target.value.slice(0, 2000))} rows={4}
                  placeholder="Ex.: quais entregas estão em risco e o que devemos priorizar nesta semana?"
                  className="w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white resize-y focus:ring-2 focus:ring-[#374A67] outline-none" />
                <div className="text-right text-[11px] text-gray-400">{question.length}/2000</div>
              </section>

              {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
              <button onClick={generate} disabled={generating || !status?.enabled}
                className="w-full py-3.5 rounded-xl bg-[#0E1116] hover:bg-[#374A67] text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
                {generating ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />} {generating ? 'Analisando dados...' : 'Gerar relatório'}
              </button>
            </aside>

            <main className="min-h-0 overflow-y-auto bg-white dark:bg-gray-800">
              {generating ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div className="relative mb-5"><div className="w-20 h-20 rounded-full border-4 border-[#E6FAFC] border-t-[#374A67] animate-spin" /><Bot className="absolute inset-0 m-auto text-[#374A67]" /></div>
                  <h3 className="font-black text-xl dark:text-white">Construindo seu relatório</h3><p className="text-gray-500 mt-2 max-w-md">A IA está analisando apenas os dados autorizados no período e escopo selecionados.</p>
                </div>
              ) : report ? (
                <div className="max-w-5xl mx-auto p-5 md:p-10">
                  <div className="flex flex-wrap justify-between gap-3 mb-6 pb-5 border-b dark:border-gray-700">
                    <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1"><span className="flex items-center gap-1"><CalendarRange size={15} /> {String(report.periodStart)} a {String(report.periodEnd)}</span><span>{report.scopeLabel}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => setReport(null)} className="px-3 py-2 rounded-lg border dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><RefreshCw size={16} /> Novo</button>
                      <button onClick={() => exportAIReportToPDF(report)} className="px-3 py-2 rounded-lg bg-[#374A67] text-white text-sm font-bold flex items-center gap-2"><Download size={16} /> Exportar PDF</button>
                    </div>
                  </div>
                  <AIReportContent content={report.content} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-500">
                  <div className="w-20 h-20 rounded-2xl bg-[#E6FAFC] dark:bg-[#374A67]/20 flex items-center justify-center mb-5"><FileText className="text-[#374A67] dark:text-[#E6FAFC]" size={38} /></div>
                  <h3 className="text-xl font-black text-[#0E1116] dark:text-white">Relatórios claros e prontos para apresentar</h3>
                  <p className="mt-2 max-w-lg">Escolha um formato, período e escopo. Você pode complementar o roteiro pronto com qualquer pergunta de gestão.</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
