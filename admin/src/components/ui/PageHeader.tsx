import React, { type ReactNode } from "react";
import type { ComponentType, SVGAttributes } from "react";

interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ComponentType<SVGAttributes<SVGSVGElement>>;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  title?: string;
  description?: string;
  icon?: ComponentType<SVGAttributes<SVGSVGElement>>;
  breadcrumbs?: Breadcrumb[];
  metadata?: ReactNode[];
  back?: { label?: string; href?: string; onClick?: () => void };
  action?: Action;
  actions?: ReactNode | Action[];
  children?: ReactNode;
}

function BackButton({ back }: { back: NonNullable<PageHeaderProps["back"]> }) {
  if (back.href) {
    return (
      <a
        href={back.href}
        onClick={(e) => {
          if (back.onClick) {
            e.preventDefault();
            back.onClick();
          }
        }}
        className="p-1.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={back.onClick}
      className="p-1.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function DesktopBreadcrumbs({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  return breadcrumbs?.map((crumb: Breadcrumb, i: number) => (
    <React.Fragment key={i}>
      {i > 0 && <span className="opacity-20 text-[10px]">/</span>}
      {crumb.href || crumb.onClick ? (
        <a
          href={crumb.href}
          onClick={(e) => {
            if (crumb.onClick) {
              e.preventDefault();
              crumb.onClick();
            }
          }}
          className="text-[10px] font-bold tracking-widest text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] transition-all"
        >
          {crumb.label}
        </a>
      ) : (
        <span className="text-[10px] font-bold tracking-widest opacity-40">
          {crumb.label}
        </span>
      )}
    </React.Fragment>
  ));
}

function ActionsSlot({ actions }: { actions: NonNullable<PageHeaderProps["actions"]> }) {
  if (Array.isArray(actions)) {
    return (
      <div className="flex items-center gap-3">
        {actions.map((act, i) => {
          const className = `flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${act.variant === "outline"
            ? "border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
            : act.variant === "ghost"
              ? "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] shadow-none"
              : "kyro-btn-primary hover:opacity-90"
            } ${act.disabled ? "opacity-50 cursor-wait pointer-events-none" : ""} ${act.className || ""}`;

          if (act.href && !act.disabled) {
            return (
              <a
                key={i}
                href={act.href}
                className={className}
              >
                {act.icon && <act.icon className="w-4 h-4" />}
                {act.label}
              </a>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              className={className}
            >
              {act.icon && <act.icon className="w-4 h-4" />}
              {act.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <>{actions}</>;
}

function SingleAction({ action }: { action: NonNullable<PageHeaderProps["action"]> }) {
  const className = `kyro-btn kyro-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all w-full lg:w-auto justify-center ${action.disabled ? "opacity-50 cursor-wait pointer-events-none" : ""} ${action.className || ""}`;

  if (action.href && !action.disabled) {
    return (
      <a href={action.href} className={className}>
        {action.icon && <action.icon className="w-4 h-4" />}
        {action.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={className}
    >
      {action.icon && <action.icon className="w-4 h-4" />}
      {action.label}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  metadata,
  back,
  action,
  actions,
  children,
}: PageHeaderProps) {
  const lastBreadcrumb = breadcrumbs?.[breadcrumbs.length - 1];

  return (
    <div className="surface-tile px-3 md:px-6 py-3 md:pt-4 mb-4 md:mb-8 rounded-lg">
      {/* ─── MOBILE ─── */}
      <div className="md:hidden space-y-2">
        {(breadcrumbs || back) && (
          <div className="flex items-center gap-2">
            {back && <BackButton back={back} />}
            <details className="group [&::-webkit-details-marker]:hidden flex-1 min-w-0">
              <summary className="flex items-center gap-2 cursor-pointer list-none">
                <span className="flex-1 text-[10px] font-bold tracking-widest text-[var(--kyro-text-secondary)] truncate">
                  {lastBreadcrumb?.label || ""}
                </span>
                <svg className="w-3 h-3 text-[var(--kyro-text-secondary)] opacity-40 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 pt-2 border-t border-[var(--kyro-border)] space-y-2">
                {breadcrumbs && (
                  <div className="flex items-center gap-2">
                    {breadcrumbs.map((crumb: Breadcrumb, i: number) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="opacity-20 text-[10px]">/</span>}
                        {crumb.href || crumb.onClick ? (
                          <a
                            href={crumb.href}
                            onClick={(e) => {
                              if (crumb.onClick) { e.preventDefault(); crumb.onClick(); }
                            }}
                            className="text-[10px] font-bold tracking-widest text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] transition-all"
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold tracking-widest opacity-40">{crumb.label}</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                {metadata && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {metadata.map((item, i) => (
                      <React.Fragment key={i}>{item}</React.Fragment>
                    ))}
                  </div>
                )}
                {children}
              </div>
            </details>
          </div>
        )}

        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[var(--kyro-primary)] shrink-0" />}
          {title && (
            <h1 className="text-lg font-bold tracking-tighter text-[var(--kyro-text-primary)] truncate">
              {title}
            </h1>
          )}
          {metadata && !description && (
            <span className="h-2 w-2 rounded-full bg-[var(--kyro-primary)] shrink-0" />
          )}
        </div>

        {description && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[var(--kyro-text-secondary)] font-medium opacity-60 line-clamp-1 min-w-0 text-xs">
              {description}
            </p>
            {metadata && (
              <div className="flex items-center gap-2">
                {metadata.map((item: ReactNode, i: number) => (
                  <React.Fragment key={i}>
                    {i === 0 && <span className="opacity-20 ml-1">·</span>}
                    {item}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden md:flex md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          {(breadcrumbs || back) && (
            <div className="flex items-center gap-2 mb-3">
              {back && <BackButton back={back} />}
              {breadcrumbs && <DesktopBreadcrumbs breadcrumbs={breadcrumbs} />}
            </div>
          )}

          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-6 h-6 text-[var(--kyro-primary)]" />}
            {title && (
              <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)] truncate">
                {title}
              </h1>
            )}
          </div>

          {(description || metadata) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              {description && (
                <p className="text-[var(--kyro-text-secondary)] font-medium opacity-60 line-clamp-1 min-w-0">
                  {description}
                </p>
              )}
              {metadata && (
                <div className="flex items-center gap-2">
                  {metadata.map((item: ReactNode, i: number) => (
                    <React.Fragment key={i}>
                      {i === 0 && (description || i > 0) && <span className="opacity-20 ml-1">·</span>}
                      {item}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {children}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {actions && <ActionsSlot actions={actions} />}
          {action && <SingleAction action={action} />}
        </div>
      </div>

      {/* mobile actions */}
      {(actions || action) && (
        <div className="md:hidden flex items-center gap-2 mt-3 pt-3 border-t border-[var(--kyro-border)]">
          {action && <SingleAction action={action} />}
          {actions && <ActionsSlot actions={actions} />}
        </div>
      )}
    </div>
  );
}
