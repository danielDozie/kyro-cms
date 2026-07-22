import React, { useMemo } from 'react';
import { JSONContent, KyroRichTextComponents } from './types';
import { defaultTypes, defaultMarks } from './defaultComponents';

interface KyroRichTextRendererProps {
  content: JSONContent | JSONContent[];
  components?: KyroRichTextComponents;
}

export const KyroRichTextRenderer: React.FC<KyroRichTextRendererProps> = ({ content, components = {} }) => {
  const mergedTypes = useMemo(
    () => ({ ...defaultTypes, ...components.types }),
    [components.types]
  );
  const mergedMarks = useMemo(
    () => ({ ...defaultMarks, ...components.marks }),
    [components.marks]
  );

  const renderNode = (node: JSONContent, index: number): React.ReactNode => {
    // Handle plain text nodes
    if (node.type === 'text') {
      let element: React.ReactNode = <React.Fragment key={index}>{node.text}</React.Fragment>;

      // If text has marks (e.g. bold, italic), wrap it from the inside out
      if (node.marks && node.marks.length > 0) {
        // Reverse so the first mark is the outermost wrapper
        const marks = [...node.marks].reverse();
        marks.forEach((mark, markIndex) => {
          const MarkComponent = mergedMarks[mark.type];
          if (MarkComponent) {
            element = (
              <MarkComponent key={`${index}-${markIndex}`} mark={mark}>
                {element}
              </MarkComponent>
            );
          }
        });
      }
      return element;
    }

    // Handle block / inline nodes
    if (node.type) {
      const NodeComponent = mergedTypes[node.type];
      
      let children: React.ReactNode = null;
      if (node.content && node.content.length > 0) {
        children = node.content.map((child, childIndex) => renderNode(child, childIndex));
      }

      if (NodeComponent) {
        return (
          <NodeComponent key={index} node={node}>
            {children}
          </NodeComponent>
        );
      }

      // Fallback for unknown nodes: just render their children
      return <React.Fragment key={index}>{children}</React.Fragment>;
    }

    return null;
  };

  if (!content) return null;

  // If the content is an array, render each top-level node
  if (Array.isArray(content)) {
    return (
      <>
        {content.map((node, index) => renderNode(node, index))}
      </>
    );
  }

  // If it's a single top-level node (like "doc"), render it
  return <>{renderNode(content, 0)}</>;
};
