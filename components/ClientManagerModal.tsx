import React, { useState } from 'react';
import { Client } from '../types';
import { X, Plus, Trash2, Building2, Edit2, Save, Search } from 'lucide-react';
import { generateUUID } from '../utils';
import * as storage from '../services/storage';

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSaveClients: (coops: Client[]) => void;
}

export const ClientManagerModal: React.FC<ClientManagerModalProps> = ({
  isOpen, onClose, clients, onSaveClients
}) => {
  // Form State
  const [editingCoop, setEditingCoop] = useState<Client | null>(null);
  const [newCoopName, setNewCoopName] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // --- Handlers ---

  const handleEditClick = (coop: Client) => {
    setEditingCoop(coop);
    setNewCoopName(coop.name);
  };

  const handleCancelEdit = () => {
    setEditingCoop(null);
    setNewCoopName('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoopName.trim()) return;

    if (editingCoop) {
      // Update existing
      const updatedCoops = clients.map(c =>
        c.id === editingCoop.id ? { ...c, name: newCoopName.trim() } : c
      );
      await onSaveClients(updatedCoops);
      handleCancelEdit();
    } else {
      // Create new
      const newCoop: Client = {
        id: generateUUID(),
        name: newCoopName.trim()
      };
      await onSaveClients([...clients, newCoop]);
      setNewCoopName('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Projetos atrelados ficarão sem cliente.')) {
      try {
        await storage.deleteClient(id);
        const updatedCoops = clients.filter(c => c.id !== id);
        await onSaveClients(updatedCoops);
        if (editingCoop?.id === id) handleCancelEdit();
      } catch (error) {
        console.error('Failed to delete client:', error);
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    }
  };

  const filteredCoops = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">Clientes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cadastre e edite as singulares do sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-transparent rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
              />
            </div>
          </div>

          <form onSubmit={handleSave} className={`mb-6 p-4 rounded-xl border ${editingCoop ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-800/50 border-transparent'}`}>
               <div className="flex justify-between items-center mb-3">
                  <label className={`text-xs font-bold uppercase flex items-center gap-2 ${editingCoop ? 'text-[#374A67]' : 'text-gray-500 dark:text-gray-400'}`}>
                    {editingCoop ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {editingCoop ? 'Editando Cliente' : 'Novo Cliente'}
                  </label>
                  {editingCoop && (
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300">Cancelar</button>
                  )}
               </div>

               <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCoopName}
                    onChange={(e) => setNewCoopName(e.target.value)}
                    placeholder="Nome do Cliente"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    disabled={!newCoopName.trim()}
                    className="bg-[#0E1116] text-white p-2 px-4 rounded-lg hover:bg-[#080A0D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-bold text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
               </div>
          </form>

          <div className="space-y-3">
            {filteredCoops.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">Nenhum cliente encontrado.</p>
            )}
            {filteredCoops.map(coop => {
               const isEditing = editingCoop?.id === coop.id;

               return (
                  <div key={coop.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg transition-all ${isEditing ? 'border-[#374A67] ring-1 ring-[#374A67]' : 'border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                        {coop.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                         <p className="font-bold text-sm text-[#0E1116] dark:text-gray-200">{coop.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleEditClick(coop)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(coop.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
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
