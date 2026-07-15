import React from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  content: string;
  className?: string;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({ content, className = '' }) => {
  // Sanitize HTML using DOMPurify
  const sanitizedHtml = DOMPurify.sanitize(content);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 ${className}
        [&>p]:mb-2 [&>p:last-child]:mb-0
        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2
        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2
        [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2
        [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2
        [&_strong]:font-bold [&_em]:italic [&_u]:underline`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
