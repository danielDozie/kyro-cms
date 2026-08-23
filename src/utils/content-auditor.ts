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
  collectionScores: Record<string, { score: number; docCount: number; issueCount: number }>;
}

/**
 * Audits documents within collections for content quality, SEO, broken links, and accessibility gaps.
 */
export function auditContentHealth(
  collections: CollectionConfig[],
  documentsByCollection: Record<string, any[]>
): ContentHealthReport {
  const issues: AuditIssue[] = [];
  let totalDocs = 0;
  const docIssueMap = new Map<string, number>();
  const collectionScores: Record<string, { score: number; docCount: number; issueCount: number }> = {};

  for (const collection of collections) {
    const slug = collection.slug;
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
          const val = doc[field.name];
          if (val && typeof val === 'object' && !val.alt && !doc[`${field.name}Alt`]) {
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
      }

      if (docHasIssue) {
        docIssueMap.set(`${slug}:${docId}`, 1);
      }
    }

    const colDocCount = docs.length;
    const colScore = colDocCount > 0 ? Math.max(0, Math.round(100 - (colIssues / (colDocCount * 2)) * 100)) : 100;
    collectionScores[slug] = {
      score: colScore,
      docCount: colDocCount,
      issueCount: colIssues,
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
