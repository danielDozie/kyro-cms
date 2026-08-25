export interface HierarchyNode<T = Record<string, any>> {
  doc: T;
  id: string | number;
  slug?: string;
  depth: number;
  path: string;
  fullPath: string;
  children: HierarchyNode<T>[];
}

export interface BuildTreeOptions {
  idField?: string;
  parentField?: string;
  slugField?: string;
  slugPrefix?: boolean;
  basePath?: string;
  maxDepth?: number;
}

export interface BreadcrumbItem {
  id: string | number;
  label: string;
  slug?: string;
  path?: string;
}

/**
 * Builds a nested hierarchical tree from a flat list of collection documents.
 */
export function buildDocumentTree<T extends Record<string, any>>(
  docs: T[],
  options: BuildTreeOptions = {},
): HierarchyNode<T>[] {
  const {
    idField = "id",
    parentField = "parent",
    slugField = "slug",
    slugPrefix = true,
    basePath = "",
    maxDepth = 10,
  } = options;

  const nodeMap = new Map<string | number, HierarchyNode<T>>();
  const rootNodes: HierarchyNode<T>[] = [];

  // 1. Initialize all nodes
  for (const doc of docs) {
    const id = doc[idField];
    if (id !== undefined && id !== null) {
      nodeMap.set(id, {
        doc,
        id,
        slug: doc[slugField],
        depth: 0,
        path: "",
        fullPath: "",
        children: [],
      });
    }
  }

  // 2. Link parent and children
  for (const doc of docs) {
    const id = doc[idField];
    const node = nodeMap.get(id);
    if (!node) continue;

    let parentId = doc[parentField];
    // Handle relationship objects: { id: "..." } or string ID
    if (parentId && typeof parentId === "object") {
      parentId = parentId[idField] || parentId.id || parentId._id;
    }

    if (parentId && nodeMap.has(parentId)) {
      const parentNode = nodeMap.get(parentId)!;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  // 3. Compute depth and recursive paths
  function assignPaths(nodes: HierarchyNode<T>[], currentDepth: number, parentPath: string) {
    if (currentDepth > maxDepth) return;

    for (const node of nodes) {
      node.depth = currentDepth;
      const currentSlug = node.slug || String(node.id);
      
      let computedPath = "";
      if (slugPrefix) {
        computedPath = parentPath
          ? `${parentPath}/${currentSlug}`
          : (basePath ? `${basePath.replace(/\/$/, "")}/${currentSlug}` : `/${currentSlug}`);
      } else {
        computedPath = basePath
          ? `${basePath.replace(/\/$/, "")}/${currentSlug}`
          : `/${currentSlug}`;
      }

      node.path = computedPath;
      node.fullPath = computedPath;

      if (node.children.length > 0) {
        assignPaths(node.children, currentDepth + 1, node.path);
      }
    }
  }

  assignPaths(rootNodes, 0, "");
  return rootNodes;
}

/**
 * Returns breadcrumb trail for a given document within a collection.
 * Supports both getBreadcrumbs(docs, docId, options) and getBreadcrumbs(docId, docs, options).
 */
export function getBreadcrumbs<T extends Record<string, any>>(
  arg1: T[] | string | number,
  arg2: T[] | string | number,
  options: { idField?: string; parentField?: string; labelField?: string; slugField?: string; basePath?: string } = {},
): BreadcrumbItem[] {
  let docs: T[];
  let docId: string | number;

  if (Array.isArray(arg1)) {
    docs = arg1;
    docId = arg2 as string | number;
  } else {
    docId = arg1;
    docs = arg2 as T[];
  }

  const {
    idField = "id",
    parentField = "parent",
    labelField = "title",
    slugField = "slug",
    basePath = "",
  } = options;

  const docsMap = new Map<string | number, T>();
  for (const doc of docs) {
    const id = doc[idField];
    if (id !== undefined && id !== null) {
      docsMap.set(id, doc);
    }
  }

  const rawCrumbs: Array<{ id: string | number; label: string; slug?: string }> = [];
  let currentId: string | number | undefined = docId;
  const visited = new Set<string | number>();

  while (currentId !== undefined && docsMap.has(currentId)) {
    if (visited.has(currentId)) break; // Prevent circular loops
    visited.add(currentId);

    const currentDoc: T = docsMap.get(currentId)!;
    const label = currentDoc[labelField] || (currentDoc as any).name || (currentDoc as any).label || currentDoc[slugField] || String(currentId);
    
    rawCrumbs.unshift({
      id: currentId,
      label,
      slug: currentDoc[slugField],
    });

    let rawParentId: any = currentDoc[parentField];
    if (rawParentId && typeof rawParentId === "object") {
      rawParentId = rawParentId[idField] || rawParentId.id || rawParentId._id;
    }
    currentId = rawParentId;
  }

  // Compute accumulated path for each breadcrumb step
  let runningPath = basePath ? basePath.replace(/\/$/, "") : "";
  return rawCrumbs.map((crumb) => {
    const slugPart = crumb.slug || String(crumb.id);
    runningPath = `${runningPath}/${slugPart}`;
    return {
      ...crumb,
      path: runningPath,
    };
  });
}

/**
 * Resolves the full URL path for a document in a hierarchical collection.
 */
export function getNestedPath<T extends Record<string, any>>(
  docId: string | number,
  docs: T[],
  options: { idField?: string; parentField?: string; slugField?: string; basePath?: string } = {},
): string {
  const crumbs = getBreadcrumbs(docId, docs, options);
  const last = crumbs[crumbs.length - 1];
  return last?.path || (options.basePath ? options.basePath : "/");
}

/**
 * Flattens a document hierarchy tree with depth indicators (useful for admin select dropdowns and indented lists).
 */
export function flattenDocumentTree<T extends Record<string, any>>(
  nodes: HierarchyNode<T>[],
): Array<{ doc: T; id: string | number; depth: number; path: string; fullPath: string; hasChildren: boolean }> {
  const result: Array<{ doc: T; id: string | number; depth: number; path: string; fullPath: string; hasChildren: boolean }> = [];

  function traverse(list: HierarchyNode<T>[]) {
    for (const node of list) {
      result.push({
        doc: node.doc,
        id: node.id,
        depth: node.depth,
        path: node.path,
        fullPath: node.fullPath,
        hasChildren: node.children.length > 0,
      });
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return result;
}
