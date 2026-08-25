import "../lib/i18n";
import React, { useState, useEffect } from "react";
import {
  Search,
  DownloadCloud,
  Star,
  CheckCircle2,
  TrendingUp,
  Zap,
  X,
  ExternalLink,
  ChevronRight
} from "./ui/icons";
import { useUIStore, toast } from "../lib/stores";
import { Badge } from "./ui/Badge";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut } from "../lib/api";

interface Extension {
  id: string;
  name: string;
  description: string;
  developer: string;
  rating: number;
  downloads: string;
  price: string;
  tags: string[];
  installed: boolean;
  featured?: boolean;
}

const defaultExtensions: Extension[] = [
  {
    id: "@kyro-cms/seo",
    name: "SEO Optimizer Pro",
    description: "Meta tags, sitemaps, and rich snippets for better search visibility.",
    developer: "Kyro Team",
    rating: 4.8,
    downloads: "45k+",
    price: "Free",
    tags: ["SEO", "Official"],
    installed: false,
    featured: true,
  },
  {
    id: "@kyro-cms/ai",
    name: "AI Content & Alt-Text Generator",
    description: "Generate content, automated SEO descriptions, and vision alt-text in editor.",
    developer: "Kyro Official",
    rating: 4.9,
    downloads: "28k+",
    price: "Free",
    tags: ["AI", "Official"],
    installed: false,
    featured: true,
  },
  {
    id: "ext-ecommerce",
    name: "Commerce Suite",
    description: "Full e-commerce with cart, checkout, Stripe, and inventory management.",
    developer: "Kyro Official",
    rating: 4.9,
    downloads: "12k+",
    price: "Free",
    tags: ["E-commerce", "Official"],
    installed: false,
  },
  {
    id: "s3-storage",
    name: "S3 Storage Provider",
    description: "Direct cloud asset uploading to Amazon AWS S3 buckets.",
    developer: "Kyro Official",
    rating: 4.9,
    downloads: "35k+",
    price: "Free",
    tags: ["Utility", "Official"],
    installed: false,
  },
  {
    id: "cloudinary-storage",
    name: "Cloudinary Media",
    description: "Cloud image transformation and optimized media delivery.",
    developer: "Cloudinary",
    rating: 4.7,
    downloads: "18k+",
    price: "Free",
    tags: ["Utility"],
    installed: false,
  },
  {
    id: "ext-slack",
    name: "Slack Notifications",
    description: "Get notified in Slack when content changes via webhooks.",
    developer: "Kyro Team",
    rating: 4.5,
    downloads: "8k+",
    price: "Free",
    tags: ["Utility"],
    installed: false,
  },
];

export function MarketplaceManager() {
  const { t } = useTranslation();
  const [extensions, setExtensions] = useState<Extension[]>(defaultExtensions);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { confirm } = useUIStore();

  useEffect(() => {
    let active = true;
    apiGet<any[]>("/api/plugins", { autoToast: false })
      .then((plugins) => {
        if (!active || !Array.isArray(plugins)) return;
        const installedIds = new Set(plugins.filter((p) => p.enabled !== false).map((p) => p.id || p.name));
        setExtensions((prev) =>
          prev.map((ext) => ({
            ...ext,
            installed: installedIds.has(ext.id) || ext.installed,
          }))
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const categories = ["All", "Official", "E-commerce", "SEO", "AI", "Utility"];

  const handleInstallRequest = (ext: Extension) => {
    confirm({
      title: `Integrate ${ext.name}?`,
      message: `Connect ${ext.name} to your dashboard? It will have scoped access to your data.`,
      confirmLabel: "Connect Extension",
      onConfirm: async () => {
        try {
          await apiPut(`/api/plugins/${encodeURIComponent(ext.id)}/toggle`, { enabled: true });
        } catch {
          // If extension is not directly hot-swappable via toggle, update local state
        }
        setExtensions((prev) =>
          prev.map((e) => (e.id === ext.id ? { ...e, installed: true } : e))
        );
        toast.success(`Extension connected: ${ext.name}`);
      },
    });
  };

  const filteredExtensions = extensions.filter((ext) => {
    const matchesSearch =
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      ext.tags.includes(activeCategory) ||
      (activeCategory === "Official" && ext.developer.includes("Kyro"));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700">
      {/* Header Panel */}
      <div className="surface-tile p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
             <h1 className="text-lg font-bold tracking-tight text-[var(--kyro-text-primary)]">
               Extension Marketplace
             </h1>
           </div>
           <p className="text-[10px] font-bold text-[var(--kyro-text-secondary)] opacity-50 tracking-widest uppercase">
             Expand your ecosystem with community extensions
           </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--kyro-text-secondary)] opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input
              type="text"
              placeholder={t("fields.searchMarketplace", { defaultValue: "Search marketplace..." })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl text-xs font-bold w-64 focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${activeCategory === category
              ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] border-[var(--kyro-sidebar-active)] shadow-lg"
              : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border-[var(--kyro-border)] hover:bg-[var(--kyro-surface)]"
              }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Extension Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredExtensions.length > 0 ? (
          filteredExtensions.map((ext) => (
            <div
              key={ext.id}
              className="surface-tile p-5 group hover:shadow-xl transition-all duration-300 relative flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center text-[var(--kyro-text-primary)] group-hover:scale-105 transition-transform">
                   <DownloadCloud className="w-5 h-5 opacity-70" />
                </div>
                {ext.featured && (
                  <Badge variant="warning" className="text-[8px] font-bold tracking-widest uppercase">
                    FEATURED
                  </Badge>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-[var(--kyro-text-primary)] mb-1 group-hover:text-[var(--kyro-primary)] transition-colors">
                  {ext.name}
                </h3>
                <p className="text-[9px] font-bold text-[var(--kyro-text-secondary)] opacity-50 tracking-widest uppercase mb-3">
                  BY {ext.developer}
                </p>
                <p className="text-[11px] text-[var(--kyro-text-secondary)] line-clamp-2 leading-relaxed">
                  {ext.description}
                </p>
              </div>

              <div className="flex items-center gap-4 mb-5">
                 <div className="flex items-center gap-1">
                   <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                   <span className="text-[10px] font-bold text-[var(--kyro-text-primary)]">{ext.rating}</span>
                 </div>
                 <div className="flex items-center gap-1 text-[var(--kyro-text-secondary)] opacity-50">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{ext.downloads}</span>
                 </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--kyro-border)] flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--kyro-text-primary)] uppercase tracking-widest">
                  {ext.price}
                </span>
                {ext.installed ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[9px] font-bold tracking-widest uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInstallRequest(ext)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--kyro-primary)] hover:translate-x-1 transition-transform"
                  >
                    Install <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center surface-tile">
            <Search className="w-10 h-10 mx-auto mb-4 text-[var(--kyro-text-secondary)] opacity-20" />
            <p className="text-xs font-bold text-[var(--kyro-text-secondary)] opacity-50 tracking-widest uppercase">
              No results match your search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
