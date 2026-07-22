import React from "react";

interface SeoPreviewProps {
  title: string;
  description: string;
  slug: string;
}

export const SeoPreview = ({ title, description, slug }: SeoPreviewProps) => (
  <div className="bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg p-6 max-w-2xl shadow-sm transition-colors duration-300">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 bg-[var(--kyro-bg-secondary)] rounded-full flex items-center justify-center text-[10px] text-[var(--kyro-text-primary)] font-medium border border-[var(--kyro-border)]">
        K
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-[var(--kyro-text-primary)] leading-tight">
          kyro-cms.com
        </span>
        <span className="text-[12px] text-[var(--kyro-text-secondary)] leading-tight opacity-80">
          https://kyro-cms.com › posts › {slug}
        </span>
      </div>
    </div>
    <h3 className="text-[20px] text-[#2563eb] dark:text-[#60a5fa] font-medium hover:underline cursor-pointer mb-1 leading-tight transition-colors">
      {title}
    </h3>
    <p className="text-[14px] text-[var(--kyro-text-secondary)] leading-relaxed line-clamp-2">
      {description}
    </p>
  </div>
);
