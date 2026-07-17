import React, { useState } from 'react';
import { AISummary } from '../types';
import { Calendar, ChevronDown, ChevronUp, Clock, Download, FileText, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AIReportContent, exportAIReportToPDF } from './AIReportContent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: AISummary[];
  onDelete?: (id: string) => Promise<void>;
}

const formatDate = (value?: string, pattern = 'dd/MM/yyyy') => {
  try { return value ? format(parseISO(String(value)), pattern, { locale: ptBR }) : '—'; }
  catch { return value || '—'; }
};

export const AISummaryHistoryModal: React.FC<Props> = ({ isOpen, onClose, history, onDelete }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const remove = async (item: AISummary) => {
    if (!onDelete || !window.confirm(`Excluir permanentemente o relatório “${item.title}”?`)) return;
    setDeletingId(item.id);
    try {
      await onDelete(item.id);
      if (expandedId === item.id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 md:p-5 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between p-5 md:px-7 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E6FAFC] dark:bg-[#374A67]/25 rounded-xl"><Clock className="text-[#374A67] dark:text-[#E6FAFC]" /></div>
            <div><h3 className="text-xl font-black text-[#0E1116] dark:text-white">Histórico de relatórios com IA</h3><p className="text-xs text-gray-500">Consulte, apresente e exporte análises anteriores</p></div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" aria-label="Fechar"><X /></button>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50/70 dark:bg-gray-900/30 p-4 md:p-6 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-20 h-20 bg-[#E6FAFC] dark:bg-[#374A67]/20 rounded-2xl flex items-center justify-center mb-4"><Sparkles className="text-[#374A67]" size={34} /></div>
              <p className="font-black text-[#0E1116] dark:text-white">Nenhum relatório gerado ainda</p><p className="text-sm mt-1">As novas análises aparecerão aqui automaticamente.</p>
            </div>
          ) : history.map(item => {
            const expanded = expandedId === item.id;
            return (
              <article key={item.id} className={`rounded-xl border bg-white dark:bg-gray-800 overflow-hidden transition ${expanded ? 'border-[#374A67] shadow-lg' : 'border-gray-200 dark:border-gray-700'}`}>
                <button onClick={() => setExpandedId(expanded ? null : item.id)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${expanded ? 'bg-[#374A67] text-white' : 'bg-[#E6FAFC] text-[#374A67]'}`}><FileText size={19} /></div>
                    <div className="min-w-0">
                      <h4 className="font-black text-[#0E1116] dark:text-white truncate">{item.title || 'Resumo com IA'}</h4>
                      <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(item.periodStart, 'dd/MM')} a {formatDate(item.periodEnd, 'dd/MM/yyyy')}</span>
                        <span>{item.scopeLabel || 'Toda a empresa'}</span>
                        <span>{item.provider}{item.model ? ` · ${item.model}` : ''}</span>
                        {item.createdByName && <span>por {item.createdByName}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="text-gray-400 shrink-0" /> : <ChevronDown className="text-gray-400 shrink-0" />}
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-900/40">
                      <div className="text-xs text-gray-500">Gerado em {formatDate(item.createdAt || item.date, "dd 'de' MMMM 'de' yyyy, HH:mm")}</div>
                      <div className="flex gap-2">
                        {item.format === 'html' && <button onClick={() => exportAIReportToPDF(item)} className="px-3 py-2 rounded-lg bg-[#374A67] text-white text-xs font-bold flex items-center gap-2"><Download size={15} /> Exportar PDF</button>}
                        {onDelete && <button onClick={() => remove(item)} disabled={deletingId === item.id} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                          {deletingId === item.id ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} Excluir
                        </button>}
                      </div>
                    </div>
                    <div className="p-5 md:p-8 max-w-5xl mx-auto">
                      {item.question && <div className="mb-6 p-3 rounded-xl bg-[#E6FAFC] dark:bg-[#374A67]/20 text-sm"><strong>Pergunta adicional:</strong> {item.question}</div>}
                      {item.format === 'html' ? <AIReportContent content={item.content} /> : (
                        <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{item.content}</ReactMarkdown></div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
