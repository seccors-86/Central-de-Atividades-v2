import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { AISummary } from '../types';

const sanitize = (content: string) => DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['article', 'section', 'header', 'footer', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'small', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'br'],
  ALLOWED_ATTR: ['colspan', 'rowspan']
});

const escapeText = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const exportAIReportToPDF = (report: AISummary) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Exportação do relatório em PDF');
  frame.style.position = 'fixed';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('O navegador não permitiu preparar o PDF.');
  }

  const content = sanitize(report.content);
  const title = escapeText(report.title || 'Relatório NUVYO');
  const period = `${escapeText(String(report.periodStart || ''))} a ${escapeText(String(report.periodEnd || ''))}`;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      @page { size: A4; margin: 17mm 15mm 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #0E1116; font: 10.5pt/1.55 Arial, Helvetica, sans-serif; background: white; }
      .brand { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; border-bottom:3px solid #374A67; padding-bottom:10px; margin-bottom:24px; }
      .brand strong { font-size:20px; letter-spacing:.08em; color:#0E1116; }
      .brand span { color:#526277; font-size:9pt; text-align:right; }
      h1 { font-size:23pt; line-height:1.15; margin:0 0 18px; color:#0E1116; }
      h2 { font-size:15pt; color:#374A67; margin:24px 0 10px; padding-bottom:5px; border-bottom:1px solid #cbd8de; break-after:avoid; }
      h3 { font-size:12pt; margin:18px 0 8px; color:#0E1116; break-after:avoid; }
      h4 { font-size:10.5pt; margin:14px 0 6px; }
      p { margin:0 0 10px; }
      ul, ol { margin:7px 0 13px; padding-left:22px; }
      li { margin:0 0 5px; }
      blockquote { margin:15px 0; padding:11px 14px; border-left:4px solid #374A67; background:#E6FAFC; color:#263449; }
      table { width:100%; border-collapse:collapse; margin:14px 0 20px; font-size:9.2pt; break-inside:auto; }
      tr { break-inside:avoid; }
      th { background:#374A67; color:white; text-align:left; }
      th, td { border:1px solid #cbd5df; padding:7px 8px; vertical-align:top; }
      tbody tr:nth-child(even) { background:#f4fafb; }
      hr { border:0; border-top:1px solid #b7c5cc; margin:22px 0; }
      .footer { margin-top:28px; padding-top:9px; border-top:1px solid #dbe4e8; color:#6b7280; font-size:8.5pt; display:flex; justify-content:space-between; }
      @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
    </style></head><body>
    <div class="brand"><strong>NUVYO</strong><span>Gestão Inteligente<br>${title}</span></div>
    <main>${content}</main>
    <div class="footer"><span>Período: ${period}</span><span>Gerado com ${escapeText(report.provider || 'IA')} ${escapeText(report.model || '')}</span></div>
    </body></html>`);
  doc.close();

  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  if (frame.contentWindow) frame.contentWindow.onafterprint = cleanup;
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  }, 250);
};

export const AIReportContent: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const sanitized = useMemo(() => sanitize(content), [content]);
  return (
    <article
      className={`text-[#0E1116] dark:text-gray-200 leading-relaxed
        [&_h1]:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:mb-6 [&_h1]:text-[#0E1116] dark:[&_h1]:text-white
        [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-[#374A67] dark:[&_h2]:text-[#E6FAFC] [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-[#374A67]/25
        [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2
        [&_h4]:font-bold [&_h4]:mt-4 [&_p]:mb-3 [&_p]:text-gray-700 dark:[&_p]:text-gray-300
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_li]:marker:text-[#374A67]
        [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#374A67] [&_blockquote]:bg-[#E6FAFC] dark:[&_blockquote]:bg-[#374A67]/25 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_table]:text-sm [&_table]:overflow-hidden
        [&_th]:bg-[#374A67] [&_th]:text-white [&_th]:text-left [&_th]:p-3 [&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-600 [&_td]:p-3
        [&_tbody_tr:nth-child(even)]:bg-[#E6FAFC]/40 dark:[&_tbody_tr:nth-child(even)]:bg-gray-700/30
        [&_hr]:my-7 [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
