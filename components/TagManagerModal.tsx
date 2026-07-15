import React, { useState } from 'react';
import { Tag } from '../types';
import { X, Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import { generateUUID } from '../utils';
import { getTagStyle } from "../tagUtils";

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onSaveTags: (tags: Tag[]) => void;
}

const COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-800',
  'bg-indigo-100 text-indigo-800',
  'bg-pink-100 text-pink-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
];

export const TagManagerModal: React.FC<TagManagerModalProps> = ({ isOpen, onClose, tags, onSaveTags }) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Default Blue

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const newTag: Tag = {
      id: generateUUID(),
      name: newTagName.trim(),
      color: newTagColor,
    };

    onSaveTags([...tags, newTag]);
    setNewTagName('');
    setNewTagColor('#3b82f6');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza? Isso removerá a tag da lista de seleção, mas manterá nos registros antigos.')) {
      onSaveTags(tags.filter(t => t.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-300 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-blue-600" />
            Gerenciar Tags
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-[42px] w-[42px] p-1 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800"
              title="Cor da Tag"
            />
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nova tag (ex: Reunião)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              maxLength={20}
            />
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {tags.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center text-sm">Nenhuma tag criada.</p>}
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tag.color?.startsWith('#') ? tag.color : '#3b82f6'}
                    onChange={(e) => {
                      const updatedTags = tags.map(t => t.id === tag.id ? { ...t, color: e.target.value } : t);
                      onSaveTags(updatedTags);
                    }}
                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                    title="Mudar Cor"
                  />
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border" style={getTagStyle(tag.name, tag.color)}>
                    {tag.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};