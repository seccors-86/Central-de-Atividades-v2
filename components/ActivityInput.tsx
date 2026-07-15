import React, { useState, useEffect } from 'react';
import { User, ActivityLog, Tag, StatusConfig } from '../types';
import { Save, Calendar, Tag as TagIcon, LayoutList, Check, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { generateUUID } from '../utils';
import { getTagStyle } from "../tagUtils";
import { RichTextEditor } from './RichTextEditor';

interface ActivityInputProps {
  currentUser: User;
  tags: Tag[];
  statuses: StatusConfig[];
  onSave: (log: ActivityLog) => void;
  existingLog?: ActivityLog;
}

export const ActivityInput: React.FC<ActivityInputProps> = ({ currentUser, tags, statuses, onSave, existingLog }) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Sort Status Logic: Backlog -> Doing -> Done -> Others
  const sortedStatuses = [...statuses].sort((a, b) => {
    const order = { 'backlog': 1, 'doing': 2, 'done': 3 };
    const orderA = order[a.id as keyof typeof order] || 99;
    const orderB = order[b.id as keyof typeof order] || 99;
    return orderA - orderB;
  });

  // Sort Tags Logic: Alphabetical
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (existingLog) {
      setDate(existingLog.date);
      setContent(existingLog.content);
      setStatus(existingLog.status);
      setSelectedTagIds(existingLog.tagIds || []);
    } else {
      setContent('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      // Default to 'done' if exists
      setStatus(statuses.find(s => s.id === 'done')?.id || statuses[0]?.id || '');
      setSelectedTagIds([]);
    }
  }, [existingLog, currentUser, statuses]);

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tagId = e.target.value;
    if (tagId && !selectedTagIds.includes(tagId)) {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
    e.target.value = ""; // Reset select
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newLog: ActivityLog = {
      id: existingLog ? existingLog.id : generateUUID(),
      userId: currentUser.id,
      date,
      content,
      status,
      tagIds: selectedTagIds,
      timestamp: Date.now(),
    };

    onSave(newLog);
    if (!existingLog) {
        setContent('');
        setStatus(statuses.find(s => s.id === 'done')?.id || statuses[0]?.id || '');
        setSelectedTagIds([]);
    }
  };

  const currentStatusConfig = statuses.find(s => s.id === status);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-t-4 border-[#374A67] p-6 mb-6">
      <h2 className="text-xl font-bold text-[#0E1116] dark:text-gray-100 mb-6 flex items-center gap-2">
        <LayoutList className="w-6 h-6 text-[#374A67]" />
        Registrar Atividade Diária
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

        {/* Date Row */}
        <div>
          <label htmlFor="date" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Data da Atividade
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] focus:border-[#374A67] outline-none transition-all bg-gray-50 dark:bg-gray-700"
              required
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Status da Entrega</label>
          <div className="relative">
             <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${currentStatusConfig?.color.split(' ')[0] || 'bg-gray-300'}`}></div>
             <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none bg-gray-50 dark:bg-gray-700 appearance-none font-medium text-gray-700 dark:text-gray-300"
             >
                {sortedStatuses.map(s => (
                   <option key={s.id} value={s.id}>
                      {s.label}
                   </option>
                ))}
             </select>
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Descrição das Atividades
          </label>
          <div className="z-0 relative text-gray-700 dark:text-gray-300">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Descreva aqui o que foi feito hoje..."
              className="bg-gray-50 dark:bg-gray-700 rounded-lg"
            />
          </div>
        </div>

        {/* Tags Dropdown & Chips */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-[#374A67]" />
            Classificar Atividade (Tags)
          </label>

          <div className="relative mb-3">
             <select
                onChange={handleTagSelect}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#374A67] outline-none bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm"
                defaultValue=""
             >
                <option value="" disabled>Selecione para adicionar...</option>
                {sortedTags.map(tag => (
                   <option key={tag.id} value={tag.id} disabled={selectedTagIds.includes(tag.id)}>
                      {tag.name}
                   </option>
                ))}
             </select>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[30px]">
            {selectedTagIds.map(tagId => {
               const tag = tags.find(t => t.id === tagId);
               if (!tag) return null;
               return (
                  <div key={tag.id} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border" style={getTagStyle(tag.name)}>
                     <span>{tag.name}</span>
                     <button type="button" onClick={() => removeTag(tag.id)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                     </button>
                  </div>
               );
            })}
            {selectedTagIds.length === 0 && (
               <span className="text-sm text-gray-400 italic">Nenhuma tag selecionada.</span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-[#374A67] text-white rounded-lg hover:bg-[#2B3C57] transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Save className="w-5 h-5" />
            {existingLog ? 'Atualizar Registro' : 'Salvar Atividade'}
          </button>
        </div>
      </form>
    </div>
  );
};