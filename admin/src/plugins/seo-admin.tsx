import React, { useState, useEffect } from 'react';
import { useToast } from "../components/ui/Toast";

export default function SeoSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  const [sitemap, setSitemap] = useState(true);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [ogImage, setOgImage] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    const apiPath = (window as any).__KYRO_API_PATH__ || '/api';
    fetch(`${apiPath}/seo-settings?limit=1`, { credentials: 'include' })
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.docs && resData.docs.length > 0) {
          const doc = resData.docs[0];
          setDocId(doc.id);
          if (doc.sitemap !== undefined) setSitemap(doc.sitemap);
          if (doc.robotsTxt !== undefined) setRobotsTxt(doc.robotsTxt);
          if (doc.canonicalUrl !== undefined) setCanonicalUrl(doc.canonicalUrl);
          if (doc.ogImage !== undefined) setOgImage(doc.ogImage);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load SEO settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const apiPath = (window as any).__KYRO_API_PATH__ || '/api';
    
    try {
      const payload = {
        sitemap,
        robotsTxt,
        canonicalUrl,
        ogImage
      };

      let url = `${apiPath}/seo-settings`;
      let method = 'POST';

      if (docId) {
        url = `${url}/${docId}`;
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await res.json();
      if (data.doc && !docId) {
        setDocId(data.doc.id);
      }
      addToast('success', 'SEO Settings saved successfully!');
    } catch (err) {
      console.error(err);
      addToast('error', 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-t-[var(--kyro-primary)] border-[var(--kyro-primary)]/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">SEO Configuration</h2>
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Sitemap Checkbox */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sitemap"
            checked={sitemap}
            onChange={(e) => setSitemap(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--kyro-border)] text-[var(--kyro-primary)] focus:ring-[var(--kyro-primary)]"
          />
          <label htmlFor="sitemap" className="text-sm font-medium text-[var(--kyro-text)]">
            Enable Sitemap Generation
          </label>
        </div>

        {/* Canonical URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--kyro-text)]">Canonical URL</label>
          <input
            type="url"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            className="w-full px-3 py-1.5 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-lg text-sm focus:border-[var(--kyro-primary)] focus:ring-1 focus:ring-[var(--kyro-primary)] outline-none transition-all"
            placeholder="https://example.com"
          />
        </div>

        {/* Default OG Image */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--kyro-text)]">Default OG Image URL</label>
          <input
            type="text"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="w-full px-3 py-1.5 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-lg text-sm focus:border-[var(--kyro-primary)] focus:ring-1 focus:ring-[var(--kyro-primary)] outline-none transition-all"
            placeholder="/images/og-default.jpg"
          />
        </div>

        {/* robots.txt Content */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--kyro-text)]">robots.txt Content</label>
          <textarea
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
            className="w-full h-24 px-3 py-2 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-lg text-sm focus:border-[var(--kyro-primary)] focus:ring-1 focus:ring-[var(--kyro-primary)] outline-none transition-all font-mono"
            placeholder="User-agent: *&#10;Allow: /"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 mt-2 bg-[var(--kyro-primary)] text-white font-bold rounded-lg shadow-md shadow-[var(--kyro-primary)]/20 hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
