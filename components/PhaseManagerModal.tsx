import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, Layout } from 'lucide-react';
import { ProjectPhase } from '../types';
import * as phaseService from '../services/projectPhases';
import { getDynamicStyle } from '../utils/colorUtils';

interface PhaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  phases: ProjectPhase[];
  onPhasesChange: (phases: ProjectPhase[]) => void;
}

export const PhaseManagerModal: React.FC<PhaseManagerModalProps> = ({
  isOpen, onClose, phases, onPhasesChange
}) => {
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [newPosition, setNewPosition] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phases.length > 0 && !editingPhase) {
      setNewPosition(Math.max(...phases.map(b => b.position)) + 1);
    }
  }, [phases, editingPhase]);

  if (!isOpen) return null;

  const handleEditClick = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setNewId(phase.id);
    setNewName(phase.name);
    setNewColor(phase.color);
    setNewPosition(phase.position);
  };

  const handleCancelEdit = () => {
    setEditingPhase(null);
    setNewId('');
    setNewName('');
    setNewColor('#3b82f6');
    setNewPosition(Math.max(...phases.map(b => b.position)) + 1);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      if (editingPhase) {
        const updated = await phaseService.updatePhase(editingPhase.id, {
          name: newName,
          color: newColor,
          position: newPosition
        });
        const newPhases = phases.map(b => b.id === updated.id ? updated : b).sort((a, b) => a.position - b.position);
        onPhasesChange(newPhases);
        handleCancelEdit();
      } else {
        const created = await phaseService.createPhase({
          name: newName,
          color: newColor,
          position: newPosition
        });
        const newPhases = [...phases, created].sort((a, b) => a.position - b.position);
        onPhasesChange(newPhases);
        setNewId('');
        setNewName('');
        setNewPosition(newPhases.length + 1);
      }
    } catch (error) {
      console.error('Failed to save phase:', error);
      alert('Erro ao salvar phase.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso pode esconder tarefas que estão nesse status até que você as mova.')) {
      setLoading(true);
      try {
        await phaseService.deletePhase(id);
        onPhasesChange(phases.filter(b => b.id !== id));
        if (editingPhase?.id === id) handleCancelEdit();
      } catch (error) {
        console.error('Failed to delete phase:', error);
        alert('Erro ao excluir phase.');
      } finally {
        setLoading(false);
      }
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#374A67]" />
            Configuração de Fases (Projetos)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <form onSubmit={handleSave} className={`mb-6 space-y-3 p-4 rounded-xl border ${editingPhase ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 dark:bg-gray-700 border-transparent'}`}>
            <div className="flex items-center justify-between">
               <h4 className={`text-xs font-bold uppercase flex items-center gap-1 ${editingPhase ? 'text-[#374A67]' : 'text-gray-500 dark:text-gray-400'}`}>
                  {editingPhase ? <Edit2 className="w-3 h-3" /> : <Plus className="w-4 h-4" />}
                  {editingPhase ? 'Editando Fase' : 'Nova Fase'}
               </h4>
               {editingPhase && (
                  <button type="button" onClick={handleCancelEdit} className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:text-gray-300">Cancelar</button>
               )}
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                value={newPosition}
                onChange={(e) => setNewPosition(Number(e.target.value))}
                placeholder="Posição (Ordem)"
                className="w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
              />
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da Fase (ex: Levantamento de requisitos)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none text-sm"
              maxLength={50}
            />

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">Cor Visual:</label>
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
              disabled={loading || !newName.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[#374A67] text-white p-2 rounded-lg hover:bg-[#2B3C57] disabled:opacity-50 transition-colors font-bold text-sm"
            >
              {editingPhase ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingPhase ? 'Salvar Alterações' : 'Adicionar Fase'}
            </button>
          </form>

          <div className="space-y-3">
            {phases.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">Nenhuma fase configurada.</p>
            )}
            {phases.map(phase => {
              const isEditing = editingPhase?.id === phase.id;
              return (
                <div key={phase.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all ${isEditing ? 'border-[#374A67] ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 w-4 text-center">{phase.position}</span>
                    <span className="px-2 py-1 rounded-md text-xs font-bold" {...getDynamicStyle(phase.color)}>
                      {phase.name}
                    </span>
                    <span className="text-xs text-gray-400">({phase.id})</span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditClick(phase)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-2"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-2"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
