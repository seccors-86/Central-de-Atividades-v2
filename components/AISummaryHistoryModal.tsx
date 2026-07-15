import React, { useState } from 'react';
import { AISummary } from '../types';
import { X, Sparkles, Clock, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AISummaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: AISummary[];
}

export const AISummaryHistoryModal: React.FC<AISummaryHistoryModalProps> = ({ isOpen, onClose, history }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">

        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-300">Histórico de Resumos IA</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Acesse análises passadas geradas pela inteligência artificial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 p-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                   <Sparkles className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium">Nenhum resumo gerado ainda.</p>
                <p className="text-sm">Os resumos semanais aparecerão aqui.</p>
            </div>
          ) : (
             history.map((item) => {
                const isExpanded = expandedId === item.id;
                const startDate = item.periodStart ? format(parseISO(item.periodStart), 'dd/MM') : '?';
                const endDate = item.periodEnd ? format(parseISO(item.periodEnd), 'dd/MM') : '?';

                return (
                  <div key={item.id} className={`border rounded-xl transition-all duration-300 ${isExpanded ? 'border-purple-200 shadow-lg ring-1 ring-purple-100' : 'border-gray-200 dark:border-gray-600 shadow-sm hover:border-purple-200'}`}>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className={`w-full flex items-center justify-between p-4 ${isExpanded ? 'bg-purple-50 rounded-t-xl border-b border-purple-100 dark:border-purple-800' : 'bg-white dark:bg-gray-800 rounded-xl'}`}
                      >
                         <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${isExpanded ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                               <Calendar className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                               <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Resumo Gerado em {format(parseISO(item.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400">Período de Análise: {startDate} até {endDate}</p>
                            </div>
                         </div>
                         <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                         </div>
                      </button>

                      {isExpanded && (
                          <div className="p-6 prose prose-sm max-w-none text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-b-xl animate-in fade-in slide-in-from-top-2">
                             <ReactMarkdown
                                components={{
                                  h2: ({node, ...props}) => (
                                    <h2 className="text-lg font-bold text-[#0E1116] dark:text-gray-100 mt-6 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2" {...props} />
                                  ),
                                  h3: ({node, ...props}) => (
                                    <div className="mt-4 mb-2 bg-gray-50 dark:bg-gray-700 p-2 rounded border-l-4 border-[#0E1116]">
                                      <h3 className="text-sm font-bold text-[#0E1116] dark:text-gray-100 m-0" {...props} />
                                    </div>
                                  ),
                                  li: ({node, ...props}) => (
                                    <li className="marker:text-[#374A67]" {...props} />
                                  )
                                }}
                             >
                                {item.content}
                             </ReactMarkdown>
                          </div>
                      )}
                  </div>
                );
             })
          )}
        </div>
      </div>
    </div>
  );
};