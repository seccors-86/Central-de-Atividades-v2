import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selectedValues, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText = selectedValues.length === 0
    ? `${label}: Todos`
    : selectedValues.length === 1
    ? `${label}: ${options.find(o => o.value === selectedValues[0])?.label}`
    : `${label}: ${selectedValues.length} selecionados`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#374A67]/20 transition-all shadow-sm ${selectedValues.length > 0 ? 'border-[#374A67]/40 bg-orange-50/30 dark:bg-orange-900/10' : 'border-gray-100 dark:border-gray-700'}`}
      >
        <span className="truncate mr-1">{displayText}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-[100] top-full left-0 mt-1 w-full min-w-[200px] max-h-64 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl py-1"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
             <div className="relative">
               <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
               <input
                 type="text"
                 placeholder="Buscar..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-[#374A67]"
               />
             </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <div
              className="px-3 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }}
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${selectedValues.length === 0 ? 'bg-[#374A67] border-[#374A67]' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                {selectedValues.length === 0 && <Check size={10} className="text-white" />}
              </div>
              Todos
            </div>
            {options.filter(o => !search.trim() || o.label.toLowerCase().includes(search.toLowerCase())).map(opt => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className="px-3 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleOption(opt.value);
                  }}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-[#374A67] border-[#374A67]' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className="truncate">{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
