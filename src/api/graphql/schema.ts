import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLUnionType,
  GraphQLScalarType,
  type GraphQLFieldConfig,
  type GraphQLType,
  type GraphQLOutputType,
  type GraphQLInputType,
  type GraphQLInputFieldConfig,
  Kind,
} from "graphql";
import type {
  CollectionConfig,
  GlobalConfig,
  BaseAdapter,
} from "../../registry/types.js";
import { Registry } from "../../registry/index.js";
import type { Field, SelectField } from "../../fields/types.js";
import { evaluateAccess, type WhereClause } from "../../access/types.js";
import type { User, Request } from "../../hooks/types.js";
import type { TenantContext } from "../../auth/rls/tenant.js";
import { hasApiKeyPermission } from "../../auth/api-key.js";
import { hasPermission } from "../../auth/rbac/checker.js";

import { RelationLoader } from "./dataloader.js";
export { RelationLoader };

// ============================================================================
// JSON Scalar — for free-form data (tabs, json, richtext, blocks)
// ============================================================================

const GraphQLJSON = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize(value: any): any {
    return value;
  },
  parseValue(value: any): any {
    return value;
  },
  parseLiteral(ast: any): any {
    switch (ast.kind) {
      case Kind.STRING: return ast.value;
      case Kind.INT:
      case Kind.FLOAT: return parseFloat(ast.value);
      case Kind.BOOLEAN: return ast.value;
      case Kind.OBJECT: {
        const obj: any = {};
        for (const field of ast.fields) {
          obj[field.name.value] = GraphQLJSON.parseLiteral(field.value);
        }
        return obj;
      }
      case Kind.LIST: return ast.values.map((v: any) => GraphQLJSON.parseLiteral(v));
      case Kind.NULL: return null;
      default: return null;
    }
  },
});

// ============================================================================
// GraphQL Context — passed through Yoga/execute contextValue per request
// ============================================================================

export interface GraphQLContext {
  db: BaseAdapter;
  registry: Registry;
  user?: User;
  req?: Request;
  tenantId?: string;
  apiKey?: any;
  relationLoader: RelationLoader;
}

// ============================================================================
// Depth Limiting — prevents runaway deeply-nested queries
// ============================================================================

export function depthLimit(maxDepth: number) {
  return (validationContext: any) => {
    let depth = 0;
    return {
      Field() {
        depth++;
        if (depth > maxDepth) {
          validationContext.reportError(
            new Error(`Query exceeds max depth of ${maxDepth}`),
          );
        }
      },
      leaveField() { depth--; },
    };
  };
}

// ============================================================================
// Naming Helpers
// ============================================================================

function toPascal(slug: string): string {
  return slug.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function toCamel(slug: string): string {
  const p = toPascal(slug);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function toSingular(slug: string): string {
  return slug.endsWith('s') && slug.length > 1 ? slug.slice(0, -1) : slug;
}

// ============================================================================
// GraphQL Error Helpers
// ============================================================================

function gqlError(message: string, code: string): Error {
  const err = new Error(message);
  (err as any).extensions = { code };
  return err;
}

// ============================================================================
// Access Control Helper
// ============================================================================

async function checkGraphQLAccess(
  collection: { access?: any; slug: string },
  operation: "read" | "create" | "update" | "delete",
  context: { user?: User; req?: Request; tenantId?: string; apiKey?: any },
): Promise<{ allowed: boolean; extraWhere?: WhereClause }> {
  const accessRule = collection.access?.[operation];

  // API key authentication — the key's own permissions govern access
  if (context.apiKey) {
    if (context.apiKey.permissions?.length > 0) {
      const resource = collection.slug;
      const action = operation === "read" ? "read" : operation === "create" ? "create" : "update";
      const permission = `${resource}:${action}`;
      if (
        !hasApiKeyPermission(context.apiKey.permissions, permission) &&
        !hasApiKeyPermission(context.apiKey.permissions, `${resource}:admin`)
      ) {
        return { allowed: false };
      }
      return { allowed: true };
    }
    // Unrestricted key (no explicit permissions) — check accessRule if present, otherwise allow
    if (accessRule) {
      const result = await evaluateAccess(accessRule, {
        req: context.req!,
        user: context.user,
        tenantId: context.tenantId,
      });
      if (typeof result === "boolean") {
        return { allowed: result };
      }
      return { allowed: true, extraWhere: result };
    }
    return { allowed: true };
  }

  // RBAC check for authenticated users (no API key)
  if (context.user) {
    const resource = collection.slug;
    const action = operation === "read" ? "read" : operation === "create" ? "create" : operation === "update" ? "update" : "delete";
    const permission = `${resource}:${action}`;
    const userHasPermission = hasPermission(
      { id: context.user.id, email: context.user.email, role: context.user.role } as any,
      permission,
    );
    if (!userHasPermission && !hasPermission(
      { id: context.user.id, email: context.user.email, role: context.user.role } as any,
      `${resource}:admin`,
    )) {
      if (!accessRule) {
        return { allowed: false };
      }
    }
  }

  if (!accessRule) {
    if (!context.user) {
      return { allowed: false };
    }
    return { allowed: true };
  }

  const result = await evaluateAccess(accessRule, {
    req: context.req!,
    user: context.user,
    tenantId: context.tenantId,
  });

  if (typeof result === "boolean") {
    return { allowed: result };
  }

  return { allowed: true, extraWhere: result };
}

async function checkGlobalAccess(
  global: { access?: any; slug?: string },
  operation: "read" | "update",
  context: { user?: User; req?: Request; tenantId?: string; apiKey?: any },
): Promise<{ allowed: boolean }> {
  const accessRule = global.access?.[operation];

  // API key authentication — the key's own permissions govern access
  if (context.apiKey) {
    if (context.apiKey.permissions?.length > 0) {
      const resource = global.slug;
      const permission = `${resource}:${operation}`;
      if (
        !hasApiKeyPermission(context.apiKey.permissions, permission) &&
        !hasApiKeyPermission(context.apiKey.permissions, `${resource}:admin`) &&
        !hasApiKeyPermission(context.apiKey.permissions, `${resource}:*`)
      ) {
        return { allowed: false };
      }
      return { allowed: true };
    }
    if (accessRule) {
      const result = await evaluateAccess(accessRule, {
        req: context.req!,
        user: context.user,
        tenantId: context.tenantId,
      });
      return { allowed: typeof result === "boolean" ? result : true };
    }
    return { allowed: true };
  }

  if (!accessRule) {
    if (!context.user) {
      return { allowed: false };
    }
    const userRole = context.user.role;
    if (userRole === "super_admin" || userRole === "admin") {
      return { allowed: true };
    }
    return { allowed: false };
  }

  const result = await evaluateAccess(accessRule, {
    req: context.req!,
    user: context.user,
    tenantId: context.tenantId,
  });

  if (typeof result === "boolean") {
    return { allowed: result };
  }

  return { allowed: true };
}

// ============================================================================
// Media URL Helpers
// ============================================================================

function resolveMediaUrl(url: string | null | undefined, origin?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const base = (process.env.KYRO_BASE_URL || origin || "http://localhost:4321").replace(/\/+$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function processMediaDoc(doc: any, origin?: string): any {
  if (!doc) return doc;
  if (doc.url) doc.url = resolveMediaUrl(doc.url, origin);
  if (doc.thumbnailUrl) doc.thumbnailUrl = resolveMediaUrl(doc.thumbnailUrl, origin);
  return doc;
}

// ============================================================================
// Field → GraphQL Type Mapping
// ============================================================================

function fieldToGraphQLType(
  field: Field,
  registry: Registry,
  collectionTypes?: Record<string, GraphQLObjectType>,
  isInputType = false,
  parentName = "Root",
  schemaCache = new Map<string, GraphQLType>()
): GraphQLType {
  switch (field.type) {
    case "text":
    case "email":
    case "password":
    case "textarea":
    case "color":
    case "code":
    case "markdown":
    case "date":
    case "select":
    case "radio":
      return (field as any).hasMany ? new GraphQLList(GraphQLString) : GraphQLString;
    case "list":
      return new GraphQLList(GraphQLString);
    case "upload": {
      const uploadField = field as any;
      if (isInputType) {
        return uploadField.hasMany ? new GraphQLList(GraphQLString) : GraphQLString;
      }
      if (uploadField.relationTo && collectionTypes?.[uploadField.relationTo]) {
        const refType = collectionTypes[uploadField.relationTo];
        return uploadField.hasMany ? new GraphQLList(refType) : refType;
      }
      return GraphQLJSON;
    }
    case "image": {
      if (isInputType) return GraphQLString;
      const imageField = field as any;
      if (imageField.relationTo && collectionTypes?.[imageField.relationTo]) {
        return collectionTypes[imageField.relationTo];
      }
      return GraphQLJSON;
    }
    case "number": {
      const numType = field.integer ? GraphQLInt : GraphQLFloat;
      return (field as any).hasMany ? new GraphQLList(numType) : numType;
    }
    case "checkbox":
      return GraphQLBoolean;
    case "json":
    case "richtext":
      return isInputType ? GraphQLJSON : GraphQLJSON;
    case "blocks": {
      if (isInputType) return GraphQLJSON;
      const blocksField = field as any;
      const blockTypes = (blocksField.blocks || []).map((block: any) => {
        const typeName = `Block_${toPascal(block.slug)}`;
        let blockType = schemaCache.get(typeName) as GraphQLObjectType;
        if (!blockType) {
          blockType = new GraphQLObjectType({
            name: typeName,
            fields: () => {
              const fields = buildFieldsFromFieldList(block.fields || [], registry, collectionTypes, typeName, schemaCache);
              fields.blockType = { type: GraphQLString };
              fields.name = { type: GraphQLString };
              return fields;
            }
          });
          schemaCache.set(typeName, blockType);
        }
        return blockType;
      });
      if (blockTypes.length === 0) return GraphQLJSON;
      const unionName = `${parentName}_${toPascal(blocksField.name)}_Blocks`;
      let unionType = schemaCache.get(unionName);
      if (!unionType) {
        unionType = new GraphQLUnionType({
          name: unionName,
          types: blockTypes,
          resolveType: (value) => {
            return `Block_${toPascal(value.blockType || value.type)}`;
          }
        });
        schemaCache.set(unionName, unionType);
      }
      return new GraphQLList(unionType);
    }
    case "tabs": {
      if (isInputType) return GraphQLJSON;
      const tabsField = field as any;
      const typeName = `${parentName}_${toPascal(tabsField.name)}_Tabs`;
      let tabType = schemaCache.get(typeName);
      if (!tabType) {
        tabType = new GraphQLObjectType({
          name: typeName,
          fields: () => buildFieldsFromFieldList(tabsField.tabs?.flatMap((t: any) => t.fields || []) || [], registry, collectionTypes, typeName, schemaCache)
        });
        schemaCache.set(typeName, tabType);
      }
      return tabType;
    }
    case "relationship": {
      let relTo = field.relationTo;
      if (relTo === "*" || (Array.isArray(relTo) && relTo.includes("*"))) {
        relTo = registry.getCollections().map(c => c.slug);
      }

      if (typeof relTo === "string") {
        if (isInputType) {
          return field.hasMany ? new GraphQLList(GraphQLString) : GraphQLString;
        }
        if (collectionTypes?.[relTo]) {
          return field.hasMany ? new GraphQLList(collectionTypes[relTo]) : collectionTypes[relTo];
        }
        const relatedCollection = registry.getCollection(relTo);
        if (relatedCollection) {
          return new GraphQLObjectType({
            name: `${toPascal(relTo)}Ref`,
            fields: () => ({
              id: { type: GraphQLString },
              ...buildFieldsFromCollection(relatedCollection, registry, collectionTypes, schemaCache),
            }),
          });
        }
      } else if (Array.isArray(relTo)) {
        if (isInputType) {
          return field.hasMany ? new GraphQLList(GraphQLJSON) : GraphQLJSON;
        }

        const possibleTypes = relTo.map((slug: string) => {
          if (collectionTypes?.[slug]) return collectionTypes[slug];
          const relatedCollection = registry.getCollection(slug);
          if (relatedCollection) {
            let refType = schemaCache.get(`${toPascal(slug)}Ref`);
            if (!refType) {
              refType = new GraphQLObjectType({
                name: `${toPascal(slug)}Ref`,
                fields: () => ({
                  id: { type: GraphQLString },
                  ...buildFieldsFromCollection(relatedCollection, registry, collectionTypes, schemaCache),
                }),
              });
              schemaCache.set(`${toPascal(slug)}Ref`, refType);
            }
            return refType as GraphQLObjectType;
          }
          return null;
        }).filter(Boolean) as GraphQLObjectType[];

        if (possibleTypes.length === 0) return GraphQLJSON;

        const unionName = `${parentName}_${toPascal(field.name || "Ref")}_PolyUnion`;
        let unionType = schemaCache.get(unionName) as GraphQLUnionType;
        if (!unionType) {
          unionType = new GraphQLUnionType({
            name: unionName,
            types: possibleTypes,
            resolveType: (value) => {
              if (value.__collection && value.__collection !== "*") {
                if (collectionTypes?.[value.__collection]) {
                  return collectionTypes[value.__collection].name;
                }
                return `${toPascal(value.__collection)}Ref`;
              }
              return undefined;
            }
          });
          schemaCache.set(unionName, unionType);
        }

        const wrapperName = `${parentName}_${toPascal(field.name || "Ref")}_PolyWrapper`;
        let wrapperType = schemaCache.get(wrapperName);
        if (!wrapperType) {
          wrapperType = new GraphQLObjectType({
             name: wrapperName,
             fields: {
                relationTo: { type: GraphQLString },
                value: { type: unionType }
             }
          });
          schemaCache.set(wrapperName, wrapperType);
        }

        return field.hasMany ? new GraphQLList(wrapperType) : wrapperType;
      }
      return GraphQLJSON;
    }
    case "array": {
      if (isInputType) return new GraphQLList(GraphQLJSON);
      const arrayField = field as any;
      const typeName = `${parentName}_${toPascal(arrayField.name)}_ArrayItem`;
      let itemType = schemaCache.get(typeName);
      if (!itemType) {
        itemType = new GraphQLObjectType({
          name: typeName,
          fields: () => {
             const f = buildFieldsFromFieldList(arrayField.fields || [], registry, collectionTypes, typeName, schemaCache);
             f.id = { type: GraphQLString };
             return f;
          }
        });
        schemaCache.set(typeName, itemType);
      }
      return new GraphQLList(itemType);
    }
    case "group": {
      if (isInputType) return GraphQLJSON;
      const groupField = field as any;
      const typeName = `${parentName}_${toPascal(groupField.name)}_Group`;
      let groupType = schemaCache.get(typeName);
      if (!groupType) {
        groupType = new GraphQLObjectType({
          name: typeName,
          fields: () => buildFieldsFromFieldList(groupField.fields || [], registry, collectionTypes, typeName, schemaCache)
        });
        schemaCache.set(typeName, groupType);
      }
      return groupType;
    }
    default:
      return GraphQLString;
  }
}

function buildFieldsFromFieldList(
  fieldsList: Field[],
  registry: Registry,
  collectionTypes?: Record<string, GraphQLObjectType>,
  parentName?: string,
  schemaCache = new Map<string, GraphQLType>()
): Record<string, GraphQLFieldConfig<any, any>> {
  const fields: Record<string, GraphQLFieldConfig<any, any>> = {};

  for (const field of fieldsList) {
    if (field.type === "tabs" && !(field as any).name) {
       for (const tab of (field as any).tabs || []) {
          const tabFields = buildFieldsFromFieldList(tab.fields || [], registry, collectionTypes, parentName, schemaCache);
          Object.assign(fields, tabFields);
       }
       continue;
    }
    if (field.type === "row" || field.type === "collapsible") {
       const groupFields = buildFieldsFromFieldList((field as any).fields || [], registry, collectionTypes, parentName, schemaCache);
       Object.assign(fields, groupFields);
       continue;
    }
    if (field.name && field.admin?.hidden !== true) {
      const fieldConfig = buildFieldConfig(field, registry, collectionTypes, parentName, schemaCache);
      if (fieldConfig) {
        fields[field.name] = fieldConfig;
      }
    }
  }

  return fields;
}

function buildFieldsFromCollection(
  config: CollectionConfig,
  registry: Registry,
  collectionTypes?: Record<string, GraphQLObjectType>,
  schemaCache = new Map<string, GraphQLType>()
): Record<string, GraphQLFieldConfig<any, any>> {
  return buildFieldsFromFieldList(config.fields, registry, collectionTypes, toPascal(toSingular(config.slug)), schemaCache);
}

// ============================================================================
// Field Config Builder — builds GraphQL field configs with custom resolvers
// ============================================================================

function buildFieldConfig(
  field: Field,
  registry: Registry,
  collectionTypes?: Record<string, any>,
  parentName?: string,
  schemaCache = new Map<string, GraphQLType>()
): GraphQLFieldConfig<any, any> | null {
  if (!field.name) return null;
  const deprecationReason = (field as any).deprecated || undefined;
  if (field.type === "upload") {
    const gqlType = fieldToGraphQLType(field, registry, collectionTypes, false, parentName, schemaCache) as GraphQLOutputType;
    const uploadField = field as any;
    return {
      type: gqlType,
      description: field.admin?.description || field.label,
      deprecationReason,
      resolve: async (source: any, args: any, ctx: any) => {
        const loader: RelationLoader | undefined = ctx?.relationLoader;
        const value = source?.[uploadField.name];
        const origin = ctx?.req?.url ? new URL(ctx.req.url).origin : undefined;
        if (!value) return null;
        if (uploadField.hasMany) {
          const items: any[] = Array.isArray(value) ? value : [];
          return Promise.all(items.map(async (item: any) => {
            const id = typeof item === "string" ? item : item?.id;
            if (!id) return processMediaDoc(item, origin);
            if (typeof item === "object" && item?.url) return processMediaDoc(item, origin);
            if (loader) {
              const cached = loader.resolveOne(uploadField.relationTo, id);
              if (cached) return processMediaDoc(cached, origin);
              const loaded = await loader.load(uploadField.relationTo, id);
              if (loaded) return processMediaDoc(loaded, origin);
              return null;
            }
            return { id };
          }));
        }
        const id = typeof value === "string" ? value : value?.id;
        if (!id) return processMediaDoc(value, origin);
        if (typeof value === "object" && value?.url) return processMediaDoc(value, origin);
        if (loader) {
          const cached = loader.resolveOne(uploadField.relationTo, id);
          if (cached) return processMediaDoc(cached, origin);
          const loaded = await loader.load(uploadField.relationTo, id);
          if (loaded) return processMediaDoc(loaded, origin);
          return null;
        }
        return { id };
      },
    };
  }
  if (field.type === "relationship" && !(field as any).hasMany) {
    const gqlType = fieldToGraphQLType(field, registry, collectionTypes, false, parentName, schemaCache) as GraphQLOutputType;
    return {
      type: gqlType,
      description: field.admin?.description || field.label,
      deprecationReason,
      resolve: async (source: any, args: any, ctx: any) => {
        const loader: RelationLoader | undefined = ctx?.relationLoader;
        const relField = field as any;
        const data = source?.[relField.name];
        if (!data) return null;
        
        const isPoly = Array.isArray(relField.relationTo) || relField.relationTo === "*";
        let collection = isPoly ? data?.relationTo : relField.relationTo;
        let docId = isPoly ? data?.value : data;

        if (isPoly && typeof data === "string") {
          collection = relField.relationTo[0];
          docId = data;
        }

        if (isPoly && collection === "*") return null;

        if (loader && typeof docId === "string" && typeof collection === "string" && collection !== "*") {
          const cached = loader.resolveOne(collection, docId);
          if (cached) return isPoly ? { relationTo: collection, value: { ...cached, __collection: collection } } : cached;
          const loaded = await loader.load(collection, docId);
          if (loaded) return isPoly ? { relationTo: collection, value: { ...loaded, __collection: collection } } : loaded;
          return null; // Document was deleted or not found
        }
        const docObj = typeof docId === "object" && docId !== null ? docId : { id: docId };
        return isPoly ? { relationTo: collection, value: { ...docObj, __collection: collection } } : docObj;
      },
    };
  }
  if (field.type === "relationship" && (field as any).hasMany) {
    const gqlType = fieldToGraphQLType(field, registry, collectionTypes, false, parentName, schemaCache) as GraphQLOutputType;
    return {
      type: gqlType,
      description: field.admin?.description || field.label,
      deprecationReason,
      resolve: async (source: any, args: any, ctx: any) => {
        const loader: RelationLoader | undefined = ctx?.relationLoader;
        const relField = field as any;
        let items: any[] = source?.[relField.name] || [];
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch {}
        }
        if (!Array.isArray(items)) items = [];
        if (!items.length) return [];
        
        const isPoly = Array.isArray(relField.relationTo) || relField.relationTo === "*";

        if (loader) {
          const results: any[] = [];
          for (const item of items) {
            let collection = isPoly ? item?.relationTo : relField.relationTo;
            let docId = isPoly ? item?.value : item;
            
            if (isPoly && typeof item === "string") {
              collection = relField.relationTo[0];
              docId = item;
            }

            if (isPoly && collection === "*") continue;

            if (typeof docId === "string" && typeof collection === "string" && collection !== "*") {
              const cached = loader.resolveOne(collection, docId);
              if (cached) {
                results.push(isPoly ? { relationTo: collection, value: { ...cached, __collection: collection } } : cached);
                continue;
              }
              const loaded = await loader.load(collection, docId);
              if (loaded) {
                results.push(isPoly ? { relationTo: collection, value: { ...loaded, __collection: collection } } : loaded);
                continue;
              }
              continue; // Document was deleted or not found, omit from array
            }
            const docObj = typeof docId === "object" && docId !== null ? docId : { id: docId };
            results.push(isPoly ? { relationTo: collection, value: { ...docObj, __collection: collection } } : docObj);
          }
          return results;
        }
        return items.map((item: any) => {
           let collection = isPoly ? item?.relationTo : relField.relationTo;
           let docId = isPoly ? item?.value : item;

           if (isPoly && typeof item === "string") {
             collection = relField.relationTo[0];
             docId = item;
           }

           const docObj = typeof docId === "object" && docId !== null ? docId : { id: docId };
           return isPoly ? { relationTo: collection, value: { ...docObj, __collection: collection } } : docObj;
        });
      },
    };
  }
  if (field.type === "blocks") {
    const gqlType = fieldToGraphQLType(field, registry, collectionTypes, false, parentName, schemaCache) as GraphQLOutputType;
    return {
      type: gqlType,
      description: field.admin?.description || field.label,
      deprecationReason,
      resolve: (source: any) => {
        let items = source?.[field.name as string];
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch {}
        }
        if (!Array.isArray(items)) return items;
        return items.map((item: any) => {
          if (item && item.data && item.type) {
            return {
              ...item.data,
              id: item.id,
              type: item.type,
              blockType: item.type,
              name: item.name
            };
          }
          return item;
        });
      }
    };
  }
  // Default: build a simple field config without custom resolver
  const gqlType = fieldToGraphQLType(field, registry, collectionTypes, false, parentName, schemaCache) as GraphQLOutputType;
  return {
    type: gqlType,
    description: field.admin?.description || field.label,
    deprecationReason,
    resolve: (source: any) => {
      let val = source?.[field.name as string];
      if (typeof val === "string" && ["array", "group", "tabs", "blocks", "json", "richtext", "list"].includes(field.type)) {
        try { val = JSON.parse(val); } catch {}
      }
      return val;
    }
  };
}

// ============================================================================
// GraphQL Schema Builder
// ============================================================================

export interface GraphQLSchemaOptions {
  registry: Registry;
  db: BaseAdapter;
  user?: User;
  req?: Request;
  tenantId?: string;
  apiKey?: any;
  settings?: Record<string, any>;
}

export function buildGraphQLSchema(
  options: GraphQLSchemaOptions,
): GraphQLSchema {
  const { registry, db, user, req, tenantId, apiKey, settings } = options;

  // Check if GraphQL is disabled in settings
  const apiAccess = settings?.access?.apiAccess;
  if (apiAccess?.graphqlEnabled === false) {
    throw new Error("GraphQL API is disabled");
  }

  const collections = registry.getCollections();
  const globals = registry.getGlobals();

  // Build collection types
  const collectionTypes: Record<string, GraphQLObjectType> = {};
  const collectionInputTypes: Record<string, GraphQLInputObjectType> = {};
  const schemaCache = new Map<string, GraphQLType>();

  for (const collection of collections) {
    // Output type
    collectionTypes[collection.slug] = new GraphQLObjectType({
      name: toPascal(toSingular(collection.slug)),
      fields: () => ({
        id: { type: GraphQLString },
        ...buildFieldsFromCollection(collection, registry, collectionTypes, schemaCache),
        ...(collection.timestamps
          ? {
              createdAt: { type: GraphQLString },
              updatedAt: { type: GraphQLString },
            }
          : {}),
        ...(collection.tenantScoped
          ? {
              tenantId: { type: GraphQLString },
            }
          : {}),
      }),
    });

    // Input type for create/update
    const inputFields: Record<string, { type: GraphQLType }> = {};
    for (const field of collection.fields) {
      if (field.name && field.name !== "id") {
        inputFields[field.name] = {
          type: fieldToGraphQLType(field, registry, collectionTypes, true) as any,
        };
      }
    }

    collectionInputTypes[collection.slug] = new GraphQLInputObjectType({
      name: `${toPascal(toSingular(collection.slug))}Input`,
      fields: () => inputFields as any,
    });
  }

  // Build global types and input types
  const globalTypes: Record<string, GraphQLObjectType> = {};
  const globalInputTypes: Record<string, GraphQLInputObjectType> = {};

  for (const global of globals) {
    globalTypes[global.slug] = new GraphQLObjectType({
      name: `${toPascal(global.slug)}Global`,
      fields: () => ({
        id: { type: GraphQLString },
        ...buildFieldsFromCollection(
          { slug: global.slug, fields: global.fields } as CollectionConfig,
          registry,
          collectionTypes,
        ),
      }),
    });

    globalInputTypes[global.slug] = new GraphQLInputObjectType({
      name: `${toPascal(global.slug)}GlobalInput`,
      fields: () => {
        const inputFields: Record<string, { type: GraphQLType }> = {};
        for (const field of global.fields) {
          if (field.name && field.name !== "id") {
            inputFields[field.name] = {
              type: fieldToGraphQLType(field, registry, collectionTypes, true) as any,
            };
          }
        }
        return inputFields as any;
      },
    });
  }

  // Build query type
  const queryFields: Record<string, GraphQLFieldConfig<any, any>> = {};

  // List queries for each collection
  for (const collection of collections) {
    const type = collectionTypes[collection.slug];
    if (!type) continue;

    // FindMany query
    queryFields[toCamel(collection.slug)] = {
      type: new GraphQLObjectType({
        name: `${toPascal(toSingular(collection.slug))}FindResult`,
        fields: {
          docs: { type: new GraphQLList(type) },
          totalDocs: { type: GraphQLInt },
          page: { type: GraphQLInt },
          totalPages: { type: GraphQLInt },
          hasNextPage: { type: GraphQLBoolean },
          hasPrevPage: { type: GraphQLBoolean },
        },
      }),
      args: {
        where: { type: GraphQLString },
        sort: { type: GraphQLString },
        limit: { type: GraphQLInt },
        page: { type: GraphQLInt },
        draft: { type: GraphQLBoolean },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGraphQLAccess(collection, "read", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied");
        }

        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }

        let where = {};
        if (args.where) {
          try {
            where = JSON.parse(args.where);
          } catch {}
        }

        if (access.extraWhere) {
          where = { ...where, ...access.extraWhere };
        }

        const isDraft = args.draft ?? !!context.user;

        return db.find({
          collection: collection.slug,
          where,
          sort: args.sort,
          limit: args.limit || 10,
          page: args.page || 1,
          tenantId: context.tenantId,
          draft: isDraft,
        });
      },
    };

    // FindByID query
    queryFields[toCamel(toSingular(collection.slug))] = {
      type,
      args: {
        id: { type: GraphQLString },
        slug: { type: GraphQLString },
        draft: { type: GraphQLBoolean },
      },
      resolve: async (_: any, args: any, context: any) => {
        if (!args.id && !args.slug) {
          throw new Error("Either id or slug is required");
        }

        const access = await checkGraphQLAccess(collection, "read", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied");
        }

        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }

        const isDraft = args.draft ?? !!context.user;

        if (args.id) {
          return db.findByID({
            collection: collection.slug,
            id: args.id,
            tenantId: context.tenantId,
            draft: isDraft,
          });
        }

        const result = await db.find({
          collection: collection.slug,
          where: { slug: { equals: args.slug } },
          limit: 1,
          page: 1,
          tenantId: context.tenantId,
          draft: isDraft,
        });
        return result.docs?.[0] || null;
      },
    };

    // Count query
    queryFields[`count${toPascal(collection.slug)}`] = {
      type: new GraphQLObjectType({
        name: `${toPascal(toSingular(collection.slug))}Count`,
        fields: {
          totalDocs: { type: GraphQLInt },
        },
      }),
      args: {
        where: { type: GraphQLString },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGraphQLAccess(collection, "read", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          return { totalDocs: 0 };
        }
        let where = {};
        if (args.where) {
          try {
            where = JSON.parse(args.where);
          } catch {}
        }
        const count = await db.count({
          collection: collection.slug,
          where,
          tenantId: context.tenantId,
        });
        return { totalDocs: count };
      },
    };
  }

  // Global queries
  for (const global of globals) {
    const type = globalTypes[global.slug];
    if (!type) continue;

    queryFields[toCamel(toSingular(global.slug))] = {
      type,
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGlobalAccess(global, "read", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied: cannot read global");
        }
        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }
        return db.findOne({
          collection: `_globals_${global.slug}`,
          where: {},
          tenantId: context.tenantId,
        });
      },
    };
  }

  const Query = new GraphQLObjectType({
    name: "Query",
    fields: queryFields,
  });

  // Build mutation type
  const mutationFields: Record<string, GraphQLFieldConfig<any, any>> = {};

  for (const collection of collections) {
    const type = collectionTypes[collection.slug];
    const inputType = collectionInputTypes[collection.slug];
    if (!type || !inputType) continue;

    // Create mutation
    mutationFields[`create${toPascal(toSingular(collection.slug))}`] = {
      type: new GraphQLObjectType({
        name: `${toPascal(toSingular(collection.slug))}CreateResult`,
        fields: {
          doc: { type },
          message: { type: GraphQLString },
        },
      }),
      args: {
        data: { type: new GraphQLNonNull(inputType) },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGraphQLAccess(collection, "create", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied: cannot create");
        }
        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }
        const schema = registry.getCreateZodSchema(collection.slug);

        const validated = schema.parse(args.data);

        const doc = await db.create({
          collection: collection.slug,
          data: validated,
          tenantId: context.tenantId,
        });

        return { doc, message: "Created successfully" };
      },
    };

    // Update mutation
    mutationFields[`update${toPascal(toSingular(collection.slug))}`] = {
      type: new GraphQLObjectType({
        name: `${toPascal(toSingular(collection.slug))}UpdateResult`,
        fields: {
          doc: { type },
          message: { type: GraphQLString },
        },
      }),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        data: { type: new GraphQLNonNull(inputType) },
        baseUpdatedAt: { type: GraphQLString },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGraphQLAccess(collection, "update", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied: cannot update");
        }
        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }

        // Revision conflict detection
        if (args.baseUpdatedAt) {
          const originalDoc = await db.findByID<Record<string, any>>({
            collection: collection.slug,
            id: args.id,
            tenantId: context.tenantId,
            draft: true,
          });
          if (originalDoc && originalDoc.updatedAt && args.baseUpdatedAt !== originalDoc.updatedAt) {
            throw new Error(`Revision conflict: document has changed since ${args.baseUpdatedAt}. Current updatedAt: ${originalDoc.updatedAt}`);
          }
        }

        const schema = registry.getUpdateZodSchema(collection.slug);

        const validated = schema.parse(args.data);

        const doc = await db.update({
          collection: collection.slug,
          id: args.id,
          data: validated,
          tenantId: context.tenantId,
        });

        return { doc, message: "Updated successfully" };
      },
    };

    // Delete mutation
    mutationFields[`delete${toPascal(toSingular(collection.slug))}`] = {
      type: new GraphQLObjectType({
        name: `${toPascal(toSingular(collection.slug))}DeleteResult`,
        fields: {
          doc: { type },
          message: { type: GraphQLString },
        },
      }),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGraphQLAccess(collection, "delete", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied: cannot delete");
        }
        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }
        const doc = await db.delete({
          collection: collection.slug,
          id: args.id,
          tenantId: context.tenantId,
        });

        return { doc, message: "Deleted successfully" };
      },
    };
  }

  // Global mutations
  for (const global of globals) {
    const inputType = globalInputTypes[global.slug];
    if (!inputType) continue;

    mutationFields[`update${toPascal(global.slug)}`] = {
      type: new GraphQLObjectType({
        name: `${toPascal(global.slug)}UpdateResult`,
        fields: {
          doc: { type: globalTypes[global.slug] || GraphQLString },
          message: { type: GraphQLString },
        },
      }),
      args: {
        data: { type: new GraphQLNonNull(inputType) },
      },
      resolve: async (_: any, args: any, context: any) => {
        const access = await checkGlobalAccess(global, "update", {
          user: context.user,
          req: context.req,
          tenantId: context.tenantId,
          apiKey: context.apiKey,
        });
        if (!access.allowed) {
          throw new Error("Access denied: cannot update global");
        }
        if (context.tenantId) {
          db.setTenantContext({ tenantId: context.tenantId, userId: context.user?.id ?? '', role: context.user?.role, isSuperAdmin: context.user?.role === 'super_admin' });
        }

        const doc = await db.findOne({
          collection: `_globals_${global.slug}`,
          where: {},
          tenantId: context.tenantId,
        });

        let result;
        if (doc) {
          result = await db.update({
            collection: `_globals_${global.slug}`,
            id: doc.id,
            data: args.data,
            tenantId: context.tenantId,
          });
        } else {
          result = await db.create({
            collection: `_globals_${global.slug}`,
            data: args.data,
            tenantId: context.tenantId,
          });
        }

        return { doc: result, message: "Updated successfully" };
      },
    };
  }

  const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: mutationFields,
  });

  return new GraphQLSchema({
    query: Query,
    mutation: Mutation,
  });
}

// ============================================================================
// Factory
// ============================================================================

export function createGraphQLSchema(
  registry: Registry,
  db: BaseAdapter,
  options?: {
    user?: User;
    req?: Request;
    tenantId?: string;
    apiKey?: any;
  },
): GraphQLSchema {
  return buildGraphQLSchema({
    registry,
    db,
    user: options?.user,
    req: options?.req,
    tenantId: options?.tenantId,
    apiKey: options?.apiKey,
  });
}
