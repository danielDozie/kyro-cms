import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KyroRichTextRenderer } from '../KyroRichTextRenderer';
import { JSONContent } from '../types';

describe('KyroRichTextRenderer', () => {
  it('renders a simple paragraph', () => {
    const data: JSONContent[] = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello world' }]
      }
    ];

    render(<KyroRichTextRenderer content={data} />);
    expect(screen.getByText('Hello world')).toBeDefined();
    expect(screen.getByText('Hello world').tagName).toBe('P');
  });

  it('renders a heading with correct level', () => {
    const data: JSONContent[] = [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Section Title' }]
      }
    ];

    render(<KyroRichTextRenderer content={data} />);
    const heading = screen.getByText('Section Title');
    expect(heading).toBeDefined();
    expect(heading.tagName).toBe('H2');
  });

  it('renders nested marks (bold and italic)', () => {
    const data: JSONContent[] = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Bold and italic',
            marks: [{ type: 'bold' }, { type: 'italic' }]
          }
        ]
      }
    ];

    const { container } = render(<KyroRichTextRenderer content={data} />);
    
    // Should render: <p><strong><em>Bold and italic</em></strong></p>
    const strong = container.querySelector('strong');
    const em = container.querySelector('em');
    
    expect(strong).toBeDefined();
    expect(em).toBeDefined();
    expect(strong?.contains(em)).toBe(true);
    expect(em?.textContent).toBe('Bold and italic');
  });

  it('allows overriding default components', () => {
    const data: JSONContent[] = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Custom paragraph' }]
      }
    ];

    const customComponents = {
      types: {
        paragraph: ({ children }: any) => <div className="custom-p">{children}</div>
      }
    };

    const { container } = render(
      <KyroRichTextRenderer content={data} components={customComponents} />
    );
    
    const div = container.querySelector('div.custom-p');
    expect(div).toBeDefined();
    expect(div?.textContent).toBe('Custom paragraph');
  });
});
