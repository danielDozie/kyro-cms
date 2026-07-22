import React from 'react';
import { CustomComponentProps, MarkComponentProps } from './types';

export const defaultTypes: Record<string, React.ComponentType<CustomComponentProps>> = {
  doc: ({ children }) => <>{children}</>,
  paragraph: ({ children }) => <p>{children}</p>,
  heading: ({ node, children }) => {
    const level = node.attrs?.level || 1;
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
    return <Tag>{children}</Tag>;
  },
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  bulletList: ({ children }) => <ul>{children}</ul>,
  orderedList: ({ children }) => <ol>{children}</ol>,
  listItem: ({ children }) => <li>{children}</li>,
  codeBlock: ({ node, children }) => {
    const language = node.attrs?.language;
    return (
      <pre className={language ? `language-${language}` : ''}>
        <code>{children}</code>
      </pre>
    );
  },
  horizontalRule: () => <hr />,
  hardBreak: () => <br />,
  image: ({ node }) => {
    return (
      <img
        src={node.attrs?.src}
        alt={node.attrs?.alt || ''}
        title={node.attrs?.title || ''}
      />
    );
  },
};

export const defaultMarks: Record<string, React.ComponentType<MarkComponentProps>> = {
  bold: ({ children }) => <strong>{children}</strong>,
  italic: ({ children }) => <em>{children}</em>,
  strike: ({ children }) => <s>{children}</s>,
  code: ({ children }) => <code>{children}</code>,
  underline: ({ children }) => <u>{children}</u>,
  link: ({ mark, children }) => {
    const { href, target, rel } = mark.attrs || {};
    return (
      <a href={href} target={target} rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}>
        {children}
      </a>
    );
  },
};
