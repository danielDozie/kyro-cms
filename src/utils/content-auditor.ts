import type { CollectionConfig } from '../registry/types.js';

export interface AuditIssue {
  id: string;
  type: 'seo' | 'accessibility' | 'link' | 'validation' | 'orphaned';
  severity: 'critical' | 'warning' | 'info';
  collection: string;
  documentId: string;
  documentTitle?: string;
  field?: string;
  message: string;
  recommendation?: string;
}

export interface CollectionHealthScore {
  slug: string;
  label: string;
  score: number;
  docCount: number;
  issueCount: number;
  hasDocs: boolean;
}

export interface ContentHealthReport {
  score: number;
  totalDocuments: number;
  healthyDocuments: number;
  issuesCount: {
    critical: number;
    warning: number;
    info: number;
  };
  issues: AuditIssue[];
  collectionScores: Record<string, CollectionHealthScore>;
}

function extractLinksFromText(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  const links: string[] = [];

  // Match HTML anchor hrefs
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlLinkRegex.exec(content)) !== null) {
    if (match[1]) links.push(match[1].trim());
  }

  // Match Markdown links [text](url)
  const mdLinkRegex = /\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    if (match[1]) links.push(match[1].trim());
  }

  return links;
}

function extractLinksFromRichText(val: any): string[] {
  if (!val) return [];
  if (typeof val === 'string') {
    if (val.startsWith('{') || val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        return extractLinksFromJsonNode(parsed);
      } catch {
        return extractLinksFromText(val);
      }
    }
    return extractLinksFromText(val);
  }
  if (typeof val === 'object') {
    return extractLinksFromJsonNode(val);
  }
  return [];
}

function extractLinksFromJsonNode(node: any): string[] {
  const links: string[] = [];
  if (!node || typeof node !== 'object') return links;

  if (node.marks && Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark.type === 'link' && mark.attrs?.href) {
        links.push(String(mark.attrs.href).trim());
      }
    }
  }

  if (node.type === 'link' && node.attrs?.href) {
    links.push(String(node.attrs.href).trim());
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      links.push(...extractLinksFromJsonNode(child));
    }
  }

  return links;
}

function isValidUrlString(url: string): { valid: boolean; reason?: string } {
  if (!url) return { valid: false, reason: 'URL is empty' };
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return { valid: true };
  }
  if (/^(htp:\/\/|https\/\/|http\/\/|htps:\/\/)/i.test(url)) {
    return { valid: false, reason: 'Malformed URL protocol prefix' };
  }
  if (/\s/.test(url)) {
    return { valid: false, reason: 'URL contains unencoded whitespace' };
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }
    if (!parsed.hostname || parsed.hostname.length < 2) {
      return { valid: false, reason: 'Missing or invalid hostname' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Audits documents within collections for content quality, SEO, broken/malformed links, and accessibility gaps.
 */
export function auditContentHealth(
  collections: CollectionConfig[],
  documentsByCollection: Record<string, any[]>
): ContentHealthReport {
  const issues: AuditIssue[] = [];
  let totalDocs = 0;
  const docIssueMap = new Map<string, number>();
  const collectionScores: Record<string, CollectionHealthScore> = {};

  for (const collection of collections) {
    const slug = collection.slug;
    const label = collection.label || slug.charAt(0).toUpperCase() + slug.slice(1);
    const docs = documentsByCollection[slug] || [];
    totalDocs += docs.length;
    let colIssues = 0;

    const titleField = collection.admin?.useAsTitle || 'title';
    const hasSeo = collection.seo || collection.fields.some((f) => f.name === 'seo' || f.name === 'metaTitle');

    for (const doc of docs) {
      const docId = String(doc.id || doc._id || '');
      const docTitle = doc[titleField] || doc.name || doc.slug || docId;
      let docHasIssue = false;

      // 1. Audit SEO metadata
      if (hasSeo) {
        const seoData = doc.seo || {};
        const metaTitle = seoData.title || doc.metaTitle;
        const metaDesc = seoData.description || doc.metaDescription;

        if (!metaTitle) {
          issues.push({
            id: `${slug}-${docId}-missing-title`,
            type: 'seo',
            severity: 'warning',
            collection: slug,
            documentId: docId,
            documentTitle: docTitle,
            field: 'seo.title',
            message: 'Missing SEO meta title',
            recommendation: 'Add a concise 50-60 character title for search engines.',
          });
          docHasIssue = true;
          colIssues++;
        }

        if (!metaDesc) {
          issues.push({
            id: `${slug}-${docId}-missing-desc`,
            type: 'seo',
            severity: 'warning',
            collection: slug,
            documentId: docId,
            documentTitle: docTitle,
            field: 'seo.description',
            message: 'Missing SEO meta description',
            recommendation: 'Add a descriptive 120-160 character summary.',
          });
          docHasIssue = true;
          colIssues++;
        }
      }

      // 2. Audit Accessibility (Alt-texts for images / uploads)
      for (const field of collection.fields) {
        if (!field.name) continue;

        if (field.type === 'image' || field.type === 'upload') {
          let val = doc[field.name];
          if (typeof val === 'string' && val.startsWith('{')) {
            try { val = JSON.parse(val); } catch {}
          }
          const hasImage = val !== undefined && val !== null && val !== '';
          const hasAlt = (typeof val === 'object' && val !== null && Boolean(val.alt)) || Boolean(doc[`${field.name}Alt`]) || Boolean(doc.alt);

          if (hasImage && !hasAlt) {
            issues.push({
              id: `${slug}-${docId}-${field.name}-missing-alt`,
              type: 'accessibility',
              severity: 'warning',
              collection: slug,
              documentId: docId,
              documentTitle: docTitle,
              field: field.name,
              message: `Image in '${field.name}' is missing descriptive alt text`,
              recommendation: 'Add alt text for screen readers and SEO.',
            });
            docHasIssue = true;
            colIssues++;
          }
        }

        // 3. Audit required fields
        if (field.required && (doc[field.name] === undefined || doc[field.name] === null || doc[field.name] === '')) {
          issues.push({
            id: `${slug}-${docId}-${field.name}-empty-required`,
            type: 'validation',
            severity: 'critical',
            collection: slug,
            documentId: docId,
            documentTitle: docTitle,
            field: field.name,
            message: `Required field '${field.name}' is empty`,
            recommendation: 'Populate this required field to avoid render errors.',
          });
          docHasIssue = true;
          colIssues++;
        }

        // 4. Audit Link / URL fields and rich-text embedded links
        if (field.type === 'url') {
          const rawUrl = doc[field.name];
          if (rawUrl && typeof rawUrl === 'string') {
            const check = isValidUrlString(rawUrl.trim());
            if (!check.valid) {
              issues.push({
                id: `${slug}-${docId}-${field.name}-invalid-url`,
                type: 'link',
                severity: 'warning',
                collection: slug,
                documentId: docId,
                documentTitle: docTitle,
                field: field.name,
                message: `Malformed URL in '${field.name}': ${check.reason || 'Invalid address'}`,
                recommendation: 'Check that URL has a valid protocol (e.g. https://) and hostname.',
              });
              docHasIssue = true;
              colIssues++;
            }
          }
        }

        if (field.type === 'richtext' || field.type === 'textarea') {
          const embeddedLinks = extractLinksFromRichText(doc[field.name]);
          for (const link of embeddedLinks) {
            const check = isValidUrlString(link);
            if (!check.valid) {
              issues.push({
                id: `${slug}-${docId}-${field.name}-broken-link-${encodeURIComponent(link.slice(0, 16))}`,
                type: 'link',
                severity: 'warning',
                collection: slug,
                documentId: docId,
                documentTitle: docTitle,
                field: field.name,
                message: `Embedded link '${link.slice(0, 32)}...' is invalid: ${check.reason}`,
                recommendation: 'Update or remove broken hyperlink in rich text content.',
              });
              docHasIssue = true;
              colIssues++;
            }
          }
        }
      }

      if (docHasIssue) {
        docIssueMap.set(`${slug}:${docId}`, 1);
      }
    }

    const colDocCount = docs.length;
    const colScore = colDocCount > 0 ? Math.max(0, Math.round(100 - (colIssues / (colDocCount * 2)) * 100)) : 100;
    collectionScores[slug] = {
      slug,
      label,
      score: colScore,
      docCount: colDocCount,
      issueCount: colIssues,
      hasDocs: colDocCount > 0,
    };
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const healthyDocs = totalDocs - docIssueMap.size;
  const overallScore = totalDocs > 0 ? Math.max(0, Math.round((healthyDocs / totalDocs) * 100)) : 100;

  return {
    score: overallScore,
    totalDocuments: totalDocs,
    healthyDocuments: healthyDocs,
    issuesCount: {
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
    },
    issues,
    collectionScores,
  };
}
