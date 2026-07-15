import React, { useState } from 'react';
import { Bell, Send, X, CheckCheck, ExternalLink, Trash2 } from 'lucide-react';
import { User } from '../types';
import { AppNotification, clearNotifications, deleteNotification, markAllNotificationsRead, markNotificationRead, sendBroadcastNotification } from '../services/notifications';

interface NotificationBellProps {
  currentUser: User;
  notifications: AppNotification[];
  onRefresh: () => void;
  onNavigate?: (link: string) => void;
}

const formatNotificationDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser, notifications, onRefresh, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const unread = notifications.filter(n => !n.read_at).length;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await sendBroadcastNotification({ title, message });
      setTitle('');
      setMessage('');
      onRefresh();
    } finally {
      setSending(false);
    }
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    onRefresh();
  };

  const clearAll = async () => {
    if (!notifications.length) return;
    if (!confirm('Apagar todo o histórico de notificações?')) return;
    await clearNotifications();
    onRefresh();
  };

  const remove = async (id: string) => {
    await deleteNotification(id);
    onRefresh();
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.link) return;
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    onRefresh();
    onNavigate?.(notification.link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">Notificações</span>
            <div className="flex gap-1">
              <button onClick={markAll} className="p-1.5 text-gray-400 hover:text-[#0E1116]" title="Marcar todas como lidas"><CheckCheck className="w-4 h-4" /></button>
              <button onClick={clearAll} className="p-1.5 text-gray-400 hover:text-red-600" title="Apagar histórico"><Trash2 className="w-4 h-4" /></button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {currentUser.role === 'admin' && (
            <form onSubmit={send} className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-2 bg-gray-50 dark:bg-gray-700/40">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do push" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Mensagem para todos" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 min-h-20 resize-y" />
              <button disabled={sending || !title.trim() || !message.trim()} className="w-full flex items-center justify-center gap-2 bg-[#0E1116] text-white rounded-lg py-2 text-xs font-black uppercase disabled:opacity-50">
                <Send className="w-4 h-4" /> Enviar Push
              </button>
            </form>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400">Nenhuma notificação.</div>
            ) : notifications.map(notification => (
              <div key={notification.id} className={`p-4 border-b border-gray-50 dark:border-gray-700 ${notification.read_at ? 'opacity-60' : 'bg-orange-50/40 dark:bg-orange-900/10'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-800 dark:text-gray-100">{notification.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => remove(notification.id)}
                    className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Apagar notificação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">{formatNotificationDate(notification.created_at)}</p>
                {notification.link && (
                  <button
                    onClick={() => openNotification(notification)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1116] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#080A0D] transition-colors"
                  >
                    Ver Tarefa/Projeto <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
