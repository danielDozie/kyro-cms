import { describe, it, expect } from 'vitest';
import {
  buildDocumentTree,
  getBreadcrumbs,
  flattenDocumentTree,
} from '../src/utils/hierarchy.js';

describe('Document Hierarchy & Breadcrumb Utilities', () => {
  const samplePages = [
    { id: '1', slug: 'docs', title: 'Documentation', parent: null },
    { id: '2', slug: 'getting-started', title: 'Getting Started', parent: '1' },
    { id: '3', slug: 'installation', title: 'Installation', parent: '2' },
    { id: '4', slug: 'configuration', title: 'Configuration', parent: '2' },
    { id: '5', slug: 'about', title: 'About Us', parent: null },
  ];

  it('should build a nested tree structure from flat parent references', () => {
    const tree = buildDocumentTree(samplePages, { basePath: '/content' });

    expect(tree).toHaveLength(2); // docs, about
    const docsNode = tree[0];
    expect(docsNode.slug).toBe('docs');
    expect(docsNode.fullPath).toBe('/content/docs');
    expect(docsNode.depth).toBe(0);
    expect(docsNode.children).toHaveLength(1); // getting-started

    const gsNode = docsNode.children[0];
    expect(gsNode.slug).toBe('getting-started');
    expect(gsNode.fullPath).toBe('/content/docs/getting-started');
    expect(gsNode.depth).toBe(1);
    expect(gsNode.children).toHaveLength(2); // installation, configuration

    const installNode = gsNode.children[0];
    expect(installNode.slug).toBe('installation');
    expect(installNode.fullPath).toBe('/content/docs/getting-started/installation');
    expect(installNode.depth).toBe(2);
  });

  it('should compute breadcrumb path from target document up to root', () => {
    const breadcrumbs = getBreadcrumbs(samplePages, '3', { basePath: '/help' });

    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toEqual({
      id: '1',
      slug: 'docs',
      label: 'Documentation',
      path: '/help/docs',
    });
    expect(breadcrumbs[1]).toEqual({
      id: '2',
      slug: 'getting-started',
      label: 'Getting Started',
      path: '/help/docs/getting-started',
    });
    expect(breadcrumbs[2]).toEqual({
      id: '3',
      slug: 'installation',
      label: 'Installation',
      path: '/help/docs/getting-started/installation',
    });
  });

  it('should flatten document tree back to a linear list with depth preservation', () => {
    const tree = buildDocumentTree(samplePages);
    const flattened = flattenDocumentTree(tree);

    expect(flattened).toHaveLength(5);
    expect(flattened.map((n) => n.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(flattened.map((n) => n.depth)).toEqual([0, 1, 2, 2, 0]);
  });
});
