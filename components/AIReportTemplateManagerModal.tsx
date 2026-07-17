import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, Check, Copy, FilePlus2, GripVertical,
  LayoutTemplate, Loader2, Plus, RotateCcw, Save, Sparkles, Trash2, X
} from 'lucide-react';
import { AIReportTemplate, AIReportTemplateSection, AIReportVariable } from '../types';
import { aiService } from '../services/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const blankSection = (): AIReportTemplateSection => ({
  id: crypto.randomUUID(),
  title: 'Nova seção',
  instructions: 'Descreva o que a IA deve analisar e apresentar nesta seção.',
  variables: ['projects']
});

const cloneTemplate = (template: AIReportTemplate): AIReportTemplate => ({
  ...template,
  sections: template.sections.map(section => ({ ...section, variables: [...section.variables] }))
});

export const AIReportTemplateManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [templates, setTemplates] = useState<AIReportTemplate[]>([]);
  const [variables, setVariables] = useState<AIReportVariable[]>([]);
  const [draft, setDraft] = useState<AIReportTemplate | null>(null);
  const [persistedId, setPersistedId] = useState<string | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const choose = (template: AIReportTemplate) => {
    if (dirty && !window.confirm('Descartar as alterações ainda não salvas?')) return;
    setDraft(cloneTemplate(template));
    setPersistedId(template.id);
    setSectionIndex(0);
    setDirty(false);
    setError('');
    setSuccess('');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedTemplates, loadedVariables] = await Promise.all([
        aiService.getTemplates(), aiService.getTemplateVariables()
      ]);
      setTemplates(loadedTemplates);
      setVariables(loadedVariables);
      if (loadedTemplates[0]) {
        setDraft(cloneTemplate(loadedTemplates[0]));
        setPersistedId(loadedTemplates[0].id);
      }
      setSectionIndex(0);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar os templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen]);

  const variableGroups = useMemo(() => {
    const groups = new Map<string, AIReportVariable[]>();
    variables.forEach(variable => groups.set(variable.category, [...(groups.get(variable.category) || []), variable]));
    return [...groups.entries()];
  }, [variables]);

  if (!isOpen) return null;

  const changeDraft = (changes: Partial<AIReportTemplate>) => {
    setDraft(current => current ? { ...current, ...changes } : current);
    setDirty(true);
    setSuccess('');
  };

  const changeSection = (changes: Partial<AIReportTemplateSection>) => {
    if (!draft) return;
    const sections = draft.sections.map((section, index) => index === sectionIndex ? { ...section, ...changes } : section);
    changeDraft({ sections });
  };

  const createNew = () => {
    if (dirty && !window.confirm('Descartar as alterações ainda não salvas?')) return;
    setDraft({
      id: '', name: 'Novo template', description: 'Explique para o usuário quando este relatório deve ser utilizado.',
      sections: [blankSection()], requiredScope: 'any', featured: false, builtIn: false
    });
    setPersistedId(null);
    setSectionIndex(0);
    setDirty(true);
    setError('');
    setSuccess('');
  };

  const duplicate = () => {
    if (!draft) return;
    setDraft({
      ...cloneTemplate(draft), id: '', name: `${draft.name} — cópia`, builtIn: false,
      sections: draft.sections.map(section => ({ ...section, id: crypto.randomUUID(), variables: [...section.variables] }))
    });
    setPersistedId(null);
    setDirty(true);
    setSuccess('Cópia pronta. Revise e salve como um novo template.');
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: draft.name, description: draft.description, sections: draft.sections,
        requiredScope: draft.requiredScope, featured: draft.featured
      };
      const saved = persistedId
        ? await aiService.updateTemplate(persistedId, payload)
        : await aiService.createTemplate(payload);
      setTemplates(current => {
        const next = persistedId ? current.map(item => item.id === persistedId ? saved : item) : [...current, saved];
        return next.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
      });
      setDraft(cloneTemplate(saved));
      setPersistedId(saved.id);
      setDirty(false);
      setSuccess('Template salvo e disponível no gerador de relatórios.');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar o template.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!persistedId || !draft || !window.confirm(`Excluir o template “${draft.name}”? O histórico já gerado será mantido.`)) return;
    setSaving(true);
    setError('');
    try {
      await aiService.deleteTemplate(persistedId);
      const remaining = templates.filter(template => template.id !== persistedId);
      setTemplates(remaining);
      setDraft(remaining[0] ? cloneTemplate(remaining[0]) : null);
      setPersistedId(remaining[0]?.id || null);
      setSectionIndex(0);
      setDirty(false);
      setSuccess('Template excluído. O histórico de relatórios foi preservado.');
    } catch (err: any) {
      setError(err.message || 'Falha ao excluir o template.');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm('Restaurar os templates padrão? Templates personalizados não serão apagados.')) return;
    setSaving(true);
    setError('');
    try {
      const restored = await aiService.resetTemplates();
      setTemplates(restored);
      const selected = restored.find(template => template.id === persistedId) || restored[0];
      setDraft(selected ? cloneTemplate(selected) : null);
      setPersistedId(selected?.id || null);
      setSectionIndex(0);
      setDirty(false);
      setSuccess('Templates padrão restaurados com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Falha ao restaurar os templates padrão.');
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    if (!draft || draft.sections.length >= 12) return;
    const sections = [...draft.sections, blankSection()];
    changeDraft({ sections });
    setSectionIndex(sections.length - 1);
  };

  const removeSection = (index: number) => {
    if (!draft || draft.sections.length <= 1) return;
    const sections = draft.sections.filter((_, itemIndex) => itemIndex !== index);
    changeDraft({ sections });
    setSectionIndex(Math.min(sectionIndex, sections.length - 1));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.sections.length) return;
    const sections = [...draft.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    changeDraft({ sections });
    setSectionIndex(target);
  };

  const toggleVariable = (id: string) => {
    if (!draft?.sections[sectionIndex]) return;
    const current = draft.sections[sectionIndex].variables;
    changeSection({ variables: current.includes(id) ? current.filter(item => item !== id) : [...current, id] });
  };

  const activeSection = draft?.sections[sectionIndex];

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-5">
      <div className="w-full max-w-[1500px] h-[95vh] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-7 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6FAFC] dark:bg-[#374A67]/30"><LayoutTemplate className="text-[#374A67] dark:text-[#E6FAFC]" /></div>
            <div><h2 className="text-xl font-black text-[#0E1116] dark:text-white">Templates de Relatórios IA</h2><p className="text-xs text-gray-500">Defina o roteiro e os dados que cada seção poderá analisar</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetDefaults} disabled={saving} className="px-3 py-2 rounded-lg border dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><RotateCcw size={16} /> Restaurar padrões</button>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fechar"><X /></button>
          </div>
        </header>

        {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#374A67]" size={38} /></div> : (
          <div className="flex-1 min-h-0 grid lg:grid-cols-[280px_minmax(430px,1fr)_340px]">
            <aside className="overflow-y-auto border-r border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4">
              <button onClick={createNew} className="w-full py-3 rounded-xl bg-[#0E1116] hover:bg-[#374A67] text-white font-black flex items-center justify-center gap-2"><FilePlus2 size={18} /> Novo template</button>
              <div className="mt-4 space-y-2">
                {templates.map(template => (
                  <button key={template.id} onClick={() => choose(template)} className={`w-full text-left p-3 rounded-xl border transition ${persistedId === template.id ? 'border-[#374A67] bg-[#E6FAFC] dark:bg-[#374A67]/25' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#374A67]/50'}`}>
                    <span className="flex items-center gap-2 font-bold text-sm text-[#0E1116] dark:text-white">
                      {template.featured && <Sparkles size={14} className="text-amber-500 shrink-0" />} {template.name}
                    </span>
                    <span className="block mt-1 text-[11px] text-gray-500">{template.sections.length} seções {template.builtIn ? '· padrão NUVYO' : '· personalizado'}</span>
                  </button>
                ))}
              </div>
            </aside>

            <main className="overflow-y-auto p-5 md:p-7 space-y-6">
              {!draft ? <div className="h-full flex items-center justify-center text-gray-500">Crie ou selecione um template.</div> : <>
                <section className="grid md:grid-cols-2 gap-4">
                  <label className="md:col-span-2 text-sm font-bold text-gray-700 dark:text-gray-200">Nome
                    <input value={draft.name} maxLength={120} onChange={event => changeDraft({ name: event.target.value })} className="mt-1.5 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white" />
                  </label>
                  <label className="md:col-span-2 text-sm font-bold text-gray-700 dark:text-gray-200">Descrição para o usuário
                    <textarea value={draft.description} maxLength={500} rows={2} onChange={event => changeDraft({ description: event.target.value })} className="mt-1.5 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white resize-y" />
                  </label>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Escopo exigido
                    <select value={draft.requiredScope} onChange={event => changeDraft({ requiredScope: event.target.value as 'any' | 'client' })} className="mt-1.5 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white">
                      <option value="any">Qualquer filtro</option><option value="client">Exigir um cliente</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border dark:border-gray-600 cursor-pointer self-end">
                    <input type="checkbox" checked={draft.featured} onChange={event => changeDraft({ featured: event.target.checked })} className="w-4 h-4 accent-[#374A67]" />
                    <span><strong className="block text-sm dark:text-white">Destacar no gerador</strong><small className="text-gray-500">Ideal para templates estratégicos</small></span>
                  </label>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-3 mb-3"><div><h3 className="font-black text-[#0E1116] dark:text-white">Estrutura do relatório</h3><p className="text-xs text-gray-500">A IA seguirá estas seções na ordem definida.</p></div><button onClick={addSection} disabled={draft.sections.length >= 12} className="px-3 py-2 rounded-lg bg-[#E6FAFC] text-[#374A67] font-bold text-sm flex items-center gap-2 disabled:opacity-50"><Plus size={16} /> Seção</button></div>
                  <div className="space-y-2">
                    {draft.sections.map((section, index) => (
                      <div key={section.id} onClick={() => setSectionIndex(index)} className={`p-3 rounded-xl border cursor-pointer ${sectionIndex === index ? 'border-[#374A67] ring-1 ring-[#374A67] bg-[#E6FAFC]/50 dark:bg-[#374A67]/15' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center gap-2"><GripVertical size={16} className="text-gray-400" /><span className="w-6 h-6 rounded-full bg-[#374A67] text-white text-xs font-black flex items-center justify-center">{index + 1}</span><strong className="flex-1 text-sm dark:text-white">{section.title || 'Sem título'}</strong><span className="text-[11px] text-gray-500">{section.variables.length} variáveis</span>
                          <button onClick={event => { event.stopPropagation(); moveSection(index, -1); }} disabled={index === 0} className="p-1 disabled:opacity-25" aria-label="Mover para cima"><ArrowUp size={15} /></button>
                          <button onClick={event => { event.stopPropagation(); moveSection(index, 1); }} disabled={index === draft.sections.length - 1} className="p-1 disabled:opacity-25" aria-label="Mover para baixo"><ArrowDown size={15} /></button>
                          <button onClick={event => { event.stopPropagation(); removeSection(index); }} disabled={draft.sections.length === 1} className="p-1 text-red-500 disabled:opacity-25" aria-label="Excluir seção"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {activeSection && <section className="p-4 rounded-2xl border-2 border-[#E6FAFC] dark:border-[#374A67] space-y-4">
                  <div className="flex items-center gap-2"><BookOpen size={18} className="text-[#374A67]" /><h3 className="font-black dark:text-white">Editar seção {sectionIndex + 1}</h3></div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Título
                    <input value={activeSection.title} maxLength={120} onChange={event => changeSection({ title: event.target.value })} className="mt-1.5 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white" />
                  </label>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">O que a IA deve entregar
                    <textarea value={activeSection.instructions} maxLength={1000} rows={5} onChange={event => changeSection({ instructions: event.target.value })} placeholder="Ex.: identifique os projetos críticos, apresente as evidências e recomende ações priorizadas..." className="mt-1.5 w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white resize-y" />
                    <span className="block text-right text-[11px] text-gray-400 mt-1">{activeSection.instructions.length}/1000</span>
                  </label>
                </section>}

                {(error || success) && <div className={`p-3 rounded-xl text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{error || success}</div>}
                <div className="sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur py-3 flex flex-wrap justify-between gap-2 border-t dark:border-gray-700">
                  <div className="flex gap-2"><button onClick={duplicate} className="px-3 py-2.5 rounded-xl border dark:border-gray-600 font-bold text-sm flex items-center gap-2"><Copy size={16} /> Duplicar</button>{persistedId && <button onClick={remove} disabled={saving} className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-sm flex items-center gap-2"><Trash2 size={16} /> Excluir</button>}</div>
                  <button onClick={save} disabled={saving || !dirty} className="px-5 py-2.5 rounded-xl bg-[#0E1116] hover:bg-[#374A67] text-white font-black flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar template</button>
                </div>
              </>}
            </main>

            <aside className="overflow-y-auto border-l border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-5">
              <h3 className="font-black text-[#0E1116] dark:text-white">Variáveis da seção</h3>
              <p className="text-xs text-gray-500 mt-1 mb-5">Selecione somente os dados necessários. Isso torna a análise mais focada.</p>
              {!activeSection ? <p className="text-sm text-gray-500">Selecione uma seção.</p> : variableGroups.map(([category, items]) => (
                <section key={category} className="mb-5"><h4 className="text-[11px] uppercase tracking-wider font-black text-gray-500 mb-2">{category}</h4><div className="space-y-2">
                  {items.map(variable => {
                    const selected = activeSection.variables.includes(variable.id);
                    return <button key={variable.id} onClick={() => toggleVariable(variable.id)} className={`w-full text-left p-3 rounded-xl border transition ${selected ? 'border-[#374A67] bg-[#E6FAFC] dark:bg-[#374A67]/25' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                      <span className="flex items-center gap-2"><span className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected ? 'bg-[#374A67] border-[#374A67] text-white' : 'border-gray-300'}`}>{selected && <Check size={14} />}</span><strong className="text-sm dark:text-white">{variable.label}</strong></span>
                      <span className="block text-[11px] leading-relaxed text-gray-500 mt-1 ml-7">{variable.description}</span>
                    </button>;
                  })}
                </div></section>
              ))}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
