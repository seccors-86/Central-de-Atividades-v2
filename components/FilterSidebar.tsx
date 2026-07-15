import React, { useEffect, useRef } from 'react';
import { X, Filter, ListRestart } from 'lucide-react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  title?: string;
  children: React.ReactNode;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  onClearFilters,
  activeFilterCount,
  title = "Filtros Avançados",
  children
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fecha clicando fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Impede scroll do body quando aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Fecha com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl z-[110] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#374A67]/10 text-[#374A67] rounded-xl">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-white leading-tight">{title}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                {activeFilterCount > 0 ? `${activeFilterCount} filtro(s) ativo(s)` : 'Nenhum filtro ativo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Filtros) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Footer (Ações) */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-3">
          <button
            onClick={() => {
              onClearFilters();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ListRestart className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#374A67] hover:bg-[#2B3C57] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shadow-md shadow-orange-500/20"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
};
