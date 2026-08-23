import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../packages/kyro-mcp/src/index.js';
import type { KyroConfig } from '../src/registry/types.js';

describe('Kyro MCP Server', () => {
  const mockConfig: KyroConfig = {
    adapter: {} as any,
    collections: [
      {
        slug: 'posts',
        label: 'Blog Posts',
        folder: 'Editorial',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'author', type: 'relationship', relationTo: 'authors', required: true },
          { name: 'content', type: 'richtext' },
        ],
        versions: { drafts: true },
      },
      {
        slug: 'authors',
        label: 'Authors',
        folder: 'Team',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'bio', type: 'text' },
        ],
      },
    ],
    globals: [
      {
        slug: 'site-settings',
        label: 'Site Settings',
        folder: 'System',
        fields: [
          { name: 'siteTitle', type: 'text', required: true },
          { name: 'tagline', type: 'text' },
        ],
      },
    ],
    projects: [
      {
        id: 'proj_main',
        name: 'Main Website',
        slug: 'main-website',
        environment: 'production',
      },
    ],
    organizations: [
      {
        id: 'org_acme',
        name: 'Acme Corp',
        slug: 'acme-corp',
      },
    ],
  };

  it('should handle JSON-RPC initialize handshake', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client' },
      },
    });

    expect(response).toBeDefined();
    expect(response?.id).toBe(1);
    expect(response?.result).toMatchObject({
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: '@kyro-cms/mcp',
      },
    });
  });

  it('should list all registered MCP tools', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    expect(response?.result?.tools).toBeDefined();
    const toolNames = response?.result?.tools.map((t: any) => t.name);
    expect(toolNames).toContain('kyro_get_schema');
    expect(toolNames).toContain('kyro_list_collections');
    expect(toolNames).toContain('kyro_query');
    expect(toolNames).toContain('kyro_mutate');
    expect(toolNames).toContain('kyro_scaffold_astro_component');
    expect(toolNames).toContain('kyro_scaffold_schema');
    expect(toolNames).toContain('kyro_validate_config');
  });

  it('should execute kyro_get_schema tool to introspect collections with folder groupings', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'kyro_get_schema',
        arguments: {},
      },
    });

    expect(response?.result?.isError).toBeFalsy();
    const parsed = JSON.parse(response?.result?.content[0].text);
    expect(parsed.collectionsCount).toBe(2);
    expect(parsed.globalsCount).toBe(1);
    expect(parsed.collections[0].slug).toBe('posts');
    expect(parsed.collections[0].folder).toBe('Editorial');
    expect(parsed.projects[0].name).toBe('Main Website');
  });

  it('should execute kyro_get_schema for a specific collection', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'kyro_get_schema',
        arguments: { collection: 'posts' },
      },
    });

    const parsed = JSON.parse(response?.result?.content[0].text);
    expect(parsed.slug).toBe('posts');
    expect(parsed.folder).toBe('Editorial');
    expect(parsed.fields).toHaveLength(4);
    expect(parsed.fields[2].name).toBe('author');
    expect(parsed.fields[2].relationTo).toBe('authors');
  });

  it('should execute kyro_scaffold_astro_component tool', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'kyro_scaffold_astro_component',
        arguments: {
          collection: 'posts',
          componentType: 'list',
          clientMethod: 'content-layer',
        },
      },
    });

    expect(response?.result?.isError).toBeFalsy();
    const code = response?.result?.content[0].text;
    expect(code).toContain("getCollection('posts')");
    expect(code).toContain('posts-list-section');
  });

  it('should execute kyro_scaffold_schema tool', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'kyro_scaffold_schema',
        arguments: {
          slug: 'products',
          label: 'Products',
          folder: 'Shop',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'price', type: 'number', required: true },
          ],
        },
      },
    });

    expect(response?.result?.isError).toBeFalsy();
    const code = response?.result?.content[0].text;
    expect(code).toContain("slug: 'products'");
    expect(code).toContain("folder: 'Shop'");
    expect(code).toContain("name: 'price', type: 'number'");
  });

  it('should execute kyro_validate_config tool and report valid state', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'kyro_validate_config',
        arguments: { deep: true },
      },
    });

    const parsed = JSON.parse(response?.result?.content[0].text);
    expect(parsed.valid).toBe(true);
    expect(parsed.issues).toHaveLength(0);
  });

  it('should detect invalid relationship target in kyro_validate_config', async () => {
    const brokenConfig: KyroConfig = {
      adapter: {} as any,
      collections: [
        {
          slug: 'comments',
          fields: [
            { name: 'post', type: 'relationship', relationTo: 'non_existent_collection' },
          ],
        },
      ],
    };

    const server = createMcpServer({ config: brokenConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'kyro_validate_config',
        arguments: { deep: true },
      },
    });

    const parsed = JSON.parse(response?.result?.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.issues[0].message).toContain('points to non-existent collection "non_existent_collection"');
  });

  it('should read MCP resources like kyro://collections and kyro://collections/posts', async () => {
    const server = createMcpServer({ config: mockConfig });
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 9,
      method: 'resources/read',
      params: {
        uri: 'kyro://collections',
      },
    });

    expect(response?.result?.contents).toBeDefined();
    const parsed = JSON.parse(response?.result?.contents[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].slug).toBe('posts');
    expect(parsed[0].folder).toBe('Editorial');
  });

  it('should list and retrieve MCP prompts', async () => {
    const server = createMcpServer({ config: mockConfig });
    const listRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'prompts/list',
    });

    expect(listRes?.result?.prompts).toBeDefined();
    expect(listRes?.result?.prompts[0].name).toBe('scaffold_collection');

    const getRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'prompts/get',
      params: {
        name: 'scaffold_collection',
        arguments: { topic: 'testimonials' },
      },
    });

    expect(getRes?.result?.messages).toBeDefined();
    expect(getRes?.result?.messages[0].content.text).toContain('testimonials');
  });
});
