import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, Users, FolderTree, User as UserIcon } from 'lucide-react';
import { Area, User } from '../types';

interface GlobalHierarchicalSelectProps {
  areas: Area[];
  users: User[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export const GlobalHierarchicalSelect: React.FC<GlobalHierarchicalSelectProps> = ({ areas, users, selectedValue, onChange }) => {
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

  const tree = useMemo(() => {
    const map = new Map<string, Area & { children: any[], depth: number }>();
    areas.forEach(a => map.set(a.id, { ...a, children: [], depth: 0 }));
    const roots: any[] = [];

    const getParentId = (area: any) => area.parentId || area.parent_id || null;

    map.forEach(node => {
      const parentId = getParentId(node);
      if (parentId && map.has(parentId)) {
        const parent = map.get(parentId)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const flattened: any[] = [];
    const traverse = (node: any, depth: number) => {
       node.depth = depth;
       flattened.push(node);
       node.children
         .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'))
         .forEach((child: any) => traverse(child, depth + 1));
    };
    roots
      .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'))
      .forEach(r => traverse(r, 0));
    return flattened;
  }, [areas]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    return tree.filter(n => n.name.toLowerCase().includes(search.toLowerCase()));
  }, [tree, search]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  const getDisplayText = () => {
    if (selectedValue === 'all') return 'Toda a Gerência';
    if (selectedValue.startsWith('area:')) {
      const id = selectedValue.split(':')[1];
      const area = areas.find(a => a.id === id);
      return area ? area.name : 'Área';
    }
    if (selectedValue.startsWith('user:')) {
      const id = selectedValue.split(':')[1];
      const user = users.find(u => u.id === id);
      return user ? user.name : 'Colaborador';
    }
    return 'Selecionar...';
  };

  return (
    <div className="relative min-w-[250px] w-full lg:w-auto" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#374A67] outline-none text-sm font-medium text-gray-700 dark:text-gray-200 transition-all shadow-sm"
      >
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] top-full left-0 mt-1 w-full min-w-[250px] max-h-80 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl py-1">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
             <div className="relative">
               <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
               <input
                 type="text"
                 placeholder="Buscar área ou colaborador..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-[#374A67]"
               />
             </div>
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {/* Todos */}
            {(!search || 'toda a gerência'.includes(search.toLowerCase())) && (
              <div
                className={`px-3 py-2.5 hover:bg-orange-50 dark:bg-gray-700 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors rounded-lg ${selectedValue === 'all' ? 'bg-orange-50 dark:bg-gray-700 text-[#374A67]' : ''}`}
                onClick={() => { onChange('all'); setIsOpen(false); }}
              >
                <Users size={14} className={selectedValue === 'all' ? 'text-[#374A67]' : 'text-gray-400'} />
                Toda a Gerência
                {selectedValue === 'all' && <Check size={14} className="ml-auto text-[#374A67]" />}
              </div>
            )}

            {/* Areas */}
            {filteredTree.length > 0 && (
              <div className="mt-2 mb-1 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Áreas
              </div>
            )}
            {filteredTree.map(node => {
              const val = `area:${node.id}`;
              const isSelected = selectedValue === val;
              return (
                <div
                  key={val}
                  className={`px-3 py-2 hover:bg-orange-50 dark:bg-gray-700 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center transition-colors rounded-lg ${isSelected ? 'bg-orange-50 dark:bg-gray-700 text-[#374A67]' : ''}`}
                  style={{ paddingLeft: search.trim() ? '0.75rem' : `${0.75 + node.depth * 1.5}rem` }}
                  onClick={() => { onChange(val); setIsOpen(false); }}
                >
                  <FolderTree size={12} className={`mr-2 shrink-0 ${isSelected ? 'text-[#374A67]' : 'text-gray-400'}`} />
                  {!search.trim() && node.depth > 0 && <span className="mr-1 text-gray-300">-</span>}
                  <span className="truncate">{node.name}</span>
                  {isSelected && <Check size={14} className="ml-auto shrink-0 text-[#374A67]" />}
                </div>
              );
            })}

            {/* Users */}
            {filteredUsers.length > 0 && (
              <div className="mt-2 mb-1 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                Colaboradores Individuais
              </div>
            )}
            {filteredUsers.map(u => {
              const val = `user:${u.id}`;
              const isSelected = selectedValue === val;
              return (
                <div
                  key={val}
                  className={`px-3 py-2 hover:bg-orange-50 dark:bg-gray-700 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center transition-colors rounded-lg ${isSelected ? 'bg-orange-50 dark:bg-gray-700 text-[#374A67]' : ''}`}
                  onClick={() => { onChange(val); setIsOpen(false); }}
                >
                  <UserIcon size={12} className={`mr-2 shrink-0 ${isSelected ? 'text-[#374A67]' : 'text-gray-400'}`} />
                  <span className="truncate">{u.name}</span>
                  {isSelected && <Check size={14} className="ml-auto shrink-0 text-[#374A67]" />}
                </div>
              );
            })}

            {filteredTree.length === 0 && filteredUsers.length === 0 && search && (
              <div className="p-3 text-center text-xs text-gray-400">Nenhum resultado encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
