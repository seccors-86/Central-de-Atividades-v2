import React, { useState } from 'react';
import { StatusConfig } from '../types';
import { X, Plus, Trash2, ListChecks } from 'lucide-react';
import { getDynamicStyle } from '../utils/colorUtils';

interface StatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: StatusConfig[];
  onSaveStatuses: (statuses: StatusConfig[]) => void;
}

export const StatusManagerModal: React.FC<StatusManagerModalProps> = ({ isOpen, onClose, statuses, onSaveStatuses }) => {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newId = newLabel.toLowerCase().replace(/\s+/g, '-');

    // Prevent duplicate IDs
    if (statuses.some(s => s.id === newId)) {
        alert('Já existe um status com nome similar.');
        return;
    }

    const newStatus: StatusConfig = {
      id: newId,
      label: newLabel.trim(),
      color: newColor,
      type: 'neutral'
    };

    onSaveStatuses([...statuses, newStatus]);
    setNewLabel('');
  };

  const handleDelete = (id: string) => {
    if (id === 'done' || id === 'doing' || id === 'backlog') {
        alert('Não é possível remover os status padrão do sistema.');
        return;
    }
    if (confirm('Tem certeza? Registros usando este status poderão ficar inconsistentes visualmente.')) {
      onSaveStatuses(statuses.filter(s => s.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-300 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600" />
            Gerenciar Status
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={handleAdd} className="mb-6 space-y-3">
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome do Status</label>
                <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Em Revisão"
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={20}
                />
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Cor Visual</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor.startsWith('#') ? newColor : '#3b82f6'}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-10 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">
                    {newColor.startsWith('#') ? newColor : 'Personalizada'}
                  </span>
                </div>
            </div>

            <button
              type="submit"
              disabled={!newLabel.trim()}
              className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar Status
            </button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {statuses.map(status => (
              <div key={status.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider" {...getDynamicStyle(status.color)}>
                  {status.label}
                </span>

                {status.id !== 'done' && status.id !== 'doing' && status.id !== 'backlog' && (
                    <button
                    onClick={() => handleDelete(status.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};