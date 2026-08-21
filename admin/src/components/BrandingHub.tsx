import "../lib/i18n";
import React, { useState, useEffect } from "react";
import { apiGet, apiPatch } from "../lib/api";
import { toast } from "../lib/stores";
import {
  Palette,
  Tag,
  Layout,
  Type,
  Image as ImageIcon,
  Save,
  Check,
  RefreshCcw,
  Sparkles,
} from "./ui/icons";
import { useTranslation } from "react-i18next";

export function BrandingHub() {
    const { t } = useTranslation();
  const [siteName, setSiteName] = useState("Kyro CMS");
  const [adminTitle, setAdminTitle] = useState("Command Center");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [dashboardGreeting, setDashboardGreeting] = useState(
    "Welcome back to your Command Center.",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const result = await apiGet("/api/globals/site-settings");
        const data = result.data || result;
        if (data && Object.keys(data).length > 0) {
          if (data.siteName) setSiteName(data.siteName);
          if (data.adminTitle) setAdminTitle(data.adminTitle);
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.dashboardGreeting)
            setDashboardGreeting(data.dashboardGreeting);
        }
      } catch (err) {
        console.error("Failed to load branding:", err);
      }
    };
    fetchBranding();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/globals/site-settings", {
        siteName,
        adminTitle,
        primaryColor,
        dashboardGreeting,
      });
      setSaved(true);
      toast.success("Branding updated");
      document.documentElement.style.setProperty(
        "--kyro-primary",
        primaryColor,
      );
      setTimeout(() => window.dispatchEvent(new Event('kyro:soft-reload')), 800);
    } catch (e) {
      toast.error("Failed to save branding");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const colors = [
    { name: "Indigo", hex: "#6366f1" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Sky", hex: "#0ea5e9" },
    { name: "Violet", hex: "#8b5cf6" },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-4">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
            Branding <span className="text-[var(--kyro-primary)]">Hub</span>
          </h1>
          <p className="text-[var(--kyro-text-secondary)] mt-1 font-medium opacity-60">
            Customize the identity and aesthetic of your administrative
            ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 ${saved
              ? "bg-green-500 text-white"
              : "kyro-btn-primary hover:shadow-[var(--kyro-primary)]"
              }`}
          >
            {saving ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving
              ? "Saving..."
              : saved
                ? "Identity Updated"
                : "Publish Branding"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identity Settings */}
        <section className="surface-tile p-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-5 h-5 text-[var(--kyro-primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Core Identity</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                Site Public Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] transition-all"
                placeholder="e.g. Acme Corp CMS"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                Admin Dashboard Title
              </label>
              <input
                type="text"
                value={adminTitle}
                onChange={(e) => setAdminTitle(e.target.value)}
                className="w-full bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] transition-all"
                placeholder="e.g. Command Center"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                System Greeting
              </label>
              <textarea
                value={dashboardGreeting}
                onChange={(e) => setDashboardGreeting(e.target.value)}
                rows={3}
                className="w-full bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] transition-all resize-none"
                placeholder={t("fields.greetingTextForThe", { defaultValue: "Greeting text for the dashboard..." })}
              />
            </div>
          </div>
        </section>

        {/* Visual Aesthetic */}
        <section className="surface-tile p-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="w-5 h-5 text-[var(--kyro-primary)]" />
            <h2 className="text-xl font-bold tracking-tight">
              Visual Aesthetic
            </h2>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                Primary Brand Color
              </label>
              <div className="grid grid-cols-6 gap-3">
                {colors.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`aspect-square rounded-xl transition-all border-4 ${primaryColor === c.hex ? "border-white ring-2 ring-[var(--kyro-primary)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--kyro-border)]">
              <label className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                Project Logo (SVG/PNG)
              </label>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-[var(--kyro-bg-secondary)] border-2 border-dashed border-[var(--kyro-border)] flex flex-col items-center justify-center text-[var(--kyro-text-secondary)] hover:border-[var(--kyro-primary)] hover:text-[var(--kyro-primary)] cursor-pointer transition-all">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[8px] font-bold ">
                    Upload
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1">
                    Upload global CMS logo
                  </p>
                  <p className="text-[10px] opacity-40 leading-relaxed">
                    This will replace the Kyro brand in the sidebar and login
                    screens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Preview of Dashboard Card */}
        <section className="lg:col-span-2 surface-tile p-8 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 flex items-center gap-2 text-[var(--kyro-primary)]">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold  tracking-widest">
              Live Preview
            </span>
          </div>

          <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-[var(--kyro-bg-secondary)] rounded-full border border-[var(--kyro-border)]">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold  tracking-widest opacity-60">
                {adminTitle} Online
              </span>
            </div>
            <h2 className="text-5xl font-bold tracking-tighter leading-none italic">
              Welcome to {siteName}.
            </h2>
            <p className="text-xl font-medium text-[var(--kyro-text-secondary)] opacity-60">
              {dashboardGreeting}
            </p>
          </div>

          {/* Simulated Palette Update */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              :root {
                --kyro-primary-temp: ${primaryColor};
              }
              .preview-btn {
                background-color: var(--kyro-primary-temp);
              }
            `,
            }}
          />
        </section>
      </div>
    </div>
  );
}
