import React from 'react';
import { X, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, content, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#374A67]/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-[#374A67]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0E1116] dark:text-gray-100">Resumo Inteligente da Semana</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Insights gerados por IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-gray-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-[#374A67] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#374A67]" />
                </div>
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                Analisando atividades e compilando insights...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <ReactMarkdown
                components={{
                  // Visão Geral e Conclusão (H2)
                  h2: ({node, ...props}) => (
                    <div className="mt-8 mb-4 pb-2 border-b-2 border-[#374A67] flex items-center gap-2">
                       <h2 className="text-lg font-bold text-[#0E1116] dark:text-gray-100 uppercase tracking-wide" {...props} />
                    </div>
                  ),
                  // Nomes dos Colaboradores (H3)
                  h3: ({node, ...props}) => (
                    <div className="mt-6 mb-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-[#0E1116]">
                      <h3 className="text-base font-bold text-[#0E1116] dark:text-gray-100" {...props} />
                    </div>
                  ),
                  // Listas
                  ul: ({node, ...props}) => (
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="pl-1 marker:text-[#374A67]" {...props} />
                  ),
                  // Parágrafos
                  p: ({node, ...props}) => (
                    <p className="mb-4 text-gray-600 dark:text-gray-300 leading-relaxed" {...props} />
                  ),
                  strong: ({node, ...props}) => (
                    <strong className="font-bold text-[#0E1116] dark:text-gray-100" {...props} />
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 font-bold transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};