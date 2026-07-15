import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Bold, Italic, List, ListOrdered, Maximize2, Minimize2, Smile, Underline } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'Digite aqui...', className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor && editor.innerHTML !== value) {
      editor.innerHTML = DOMPurify.sanitize(value || '');
    }
  }, [value, isExpanded]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const command = (name: string) => {
    editorRef.current?.focus();
    document.execCommand(name);
    if (editorRef.current) onChange(DOMPurify.sanitize(editorRef.current.innerHTML));
  };

  const onEmojiClick = (emoji: EmojiClickData) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji.emoji);
    if (editorRef.current) onChange(DOMPurify.sanitize(editorRef.current.innerHTML));
    setShowEmojiPicker(false);
  };

  const editor = (
    <div className={`relative ${isExpanded ? 'h-[70vh]' : 'h-48'} flex flex-col border border-gray-200 dark:border-gray-600 rounded-lg overflow-visible bg-white dark:bg-gray-700`}>
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-gray-600">
        {[
          ['bold', Bold, 'Negrito'], ['italic', Italic, 'Itálico'], ['underline', Underline, 'Sublinhado'],
          ['insertUnorderedList', List, 'Lista'], ['insertOrderedList', ListOrdered, 'Lista numerada']
        ].map(([name, Icon, title]: any) => (
          <button key={name} type="button" onMouseDown={e => e.preventDefault()} onClick={() => command(name)} title={title}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
            <Icon size={16} />
          </button>
        ))}
        <div className="relative ml-auto">
          <button type="button" onClick={() => setShowEmojiPicker(v => !v)} className="p-1.5 text-gray-600 dark:text-gray-300" title="Inserir emoji"><Smile size={16} /></button>
          {showEmojiPicker && <div ref={emojiPickerRef} className="absolute right-0 top-8 z-50"><EmojiPicker onEmojiClick={onEmojiClick} /></div>}
        </div>
        <button type="button" onClick={() => setIsExpanded(v => !v)} className="p-1.5 text-gray-600 dark:text-gray-300" title={isExpanded ? 'Restaurar' : 'Expandir'}>
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder}
        onInput={event => onChange(DOMPurify.sanitize(event.currentTarget.innerHTML))}
        className="flex-1 overflow-y-auto p-3 text-sm text-gray-800 dark:text-gray-100 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400" />
    </div>
  );

  if (isExpanded) return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-xl shadow-2xl p-6">{editor}</div>
    </div>, document.body
  );

  return <div className={`rich-text-wrapper ${className}`}>{editor}</div>;
};
