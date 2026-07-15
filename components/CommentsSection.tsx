import React, { useState, useEffect } from 'react';
import { Comment, User } from '../types';
import { getComments, getProjectAllComments, createComment, deleteComment, updateComment } from '../services/apiOnda4';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Send, Trash2, Hash, Edit2, X, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RichTextEditor } from './RichTextEditor';
import { HtmlRenderer } from './HtmlRenderer';

interface CommentsSectionProps {
  entityType: 'project' | 'task';
  entityId: string;
  currentUser: User;
  isProjectAll?: boolean; // Se for true, puxa comentarios do projeto + tasks
  onTaskClick?: (taskId: string) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ entityType, entityId, currentUser, isProjectAll = false, onTaskClick }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const loadComments = async () => {
    try {
      const data = isProjectAll
        ? await getProjectAllComments(entityId)
        : await getComments(entityType, entityId);
      setComments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadComments();
    }
  }, [entityId, isProjectAll, entityType]);

  const handleCreate = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    if (!newComment.trim() || !currentUser?.id) return;

    try {
      const created = await createComment({
        entity_type: entityType,
        entity_id: entityId,
        user_id: currentUser.id,
        content: newComment
      });
      setComments([created, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar comentário');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateComment(id, editContent);
      setComments(comments.map(c => c.id === id ? { ...c, content: updated.content } : c));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert('Sem permissão para editar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
    try {
      await deleteComment(id);
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
      alert('Sem permissão para excluir');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
        <h3 className="font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#374A67]" />
          {isProjectAll ? 'Mural do Projeto' : 'Comentários'}
        </h3>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-lg">
          {comments.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#374A67]"></div></div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum comentário ainda.</p>
            <p className="text-xs">Seja o primeiro a puxar assunto!</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => {
              const isMine = comment.user_id === currentUser?.id;
              const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
              const canEditOrDelete = isMine || isAdminOrManager;
              const isFromTask = isProjectAll && comment.entity_type === 'task';
              const isEditing = editingId === comment.id;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={comment.id}
                  className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0 mt-4">
                    {comment.user_avatar ? (
                      <img src={comment.user_avatar} alt={comment.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-gray-500">{(comment.user_name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className={`flex flex-col max-w-[85%] ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{comment.user_name}</span>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <div className={`p-3 rounded-2xl relative group ${
                      isMine
                        ? 'bg-[#374A67] text-white rounded-tr-sm'
                        : isFromTask
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-tl-sm border border-purple-100 dark:border-purple-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                    }`}>
                      {isFromTask && (
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-purple-200/30 dark:border-purple-800/30">
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider opacity-70">
                            <Hash className="w-3 h-3" /> Tarefa: {comment.task_title || 'Desconhecida'}
                          </div>
                          {onTaskClick && (
                            <button
                              onClick={() => onTaskClick(comment.entity_id)}
                              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                            >
                              Ver Tarefa <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl p-2">
                          <div className="z-0 relative text-gray-900 dark:text-gray-100">
                            <RichTextEditor
                              value={editContent}
                              onChange={setEditContent}
                              className="bg-transparent"
                            />
                          </div>
                          <div className="flex justify-end gap-1 mt-1">
                            <button onClick={() => setEditingId(null)} className="p-1 hover:bg-black/10 rounded text-gray-600 dark:text-gray-300"><X className="w-4 h-4" /></button>
                            <button onClick={() => handleUpdate(comment.id)} className="p-1 hover:bg-black/10 rounded text-green-600 dark:text-green-400"><Check className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <HtmlRenderer content={comment.content} />
                        </div>
                      )}

                      {!isEditing && canEditOrDelete && (
                        <div className={`absolute -top-3 ${isMine ? '-left-3' : '-right-3'} opacity-0 group-hover:opacity-100 flex gap-1 transition-all`}>
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 shadow-sm"
                            title="Editar comentário"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm"
                            title="Excluir comentário"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-3">
        <div className="z-0 relative">
          <RichTextEditor
            value={newComment}
            onChange={setNewComment}
            placeholder="Escreva um comentário..."
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newComment.trim() || !currentUser?.id}
            className="px-6 py-2.5 bg-[#374A67] hover:bg-[#2B3C57] text-white rounded-xl disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20 font-bold text-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar Comentário
          </button>
        </div>
      </div>
    </div>
  );
};
