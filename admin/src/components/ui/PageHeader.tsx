import React, { type ReactNode, type ComponentType, type SVGAttributes } from "react";

interface Breadcrumb { label: string; href?: string; onClick?: () => void }
interface Action {
  label: string; href?: string; onClick?: () => void;
  icon?: ComponentType<SVGAttributes<SVGSVGElement>>;
  variant?: "primary" | "outline" | "ghost"; className?: string; disabled?: boolean;
}
interface PageHeaderProps {
  title?: string; description?: string;
  icon?: ComponentType<SVGAttributes<SVGSVGElement>>;
  breadcrumbs?: Breadcrumb[]; metadata?: ReactNode[];
  back?: { label?: string; href?: string; onClick?: () => void };
  action?: Action; actions?: ReactNode | Action[]; children?: ReactNode;
}
function HeaderAction({ action }: { action: Action }) {
  const Icon = action.icon;
  const className = `kyro-btn kyro-btn-md ${action.variant === "outline" ? "kyro-btn-secondary" : action.variant === "ghost" ? "kyro-btn-ghost" : "kyro-btn-primary"} ${action.className || ""}`;
  const content = <>{Icon && <Icon className="w-4 h-4" aria-hidden="true" />}{action.label}</>;
  return action.href && !action.disabled
    ? <a href={action.href} onClick={action.onClick} className={className}>{content}</a>
    : <button type="button" className={className} disabled={action.disabled} onClick={action.onClick}>{content}</button>;
}
export function PageHeader({ title, description, icon: Icon, breadcrumbs, metadata, back, action, actions, children }: PageHeaderProps) {
  return <header className="workspace-page-header">
    {(back || breadcrumbs?.length) && <div className="workspace-location">
      {back && (back.href
        ? <a href={back.href} onClick={e => { if (back.onClick) { e.preventDefault(); back.onClick(); } }} className="workspace-back" aria-label={back.label || "Go back"}>←</a>
        : <button type="button" onClick={back.onClick} className="workspace-back" aria-label={back.label || "Go back"}>←</button>)}
      {breadcrumbs && <nav aria-label="Breadcrumb"><ol className="workspace-breadcrumbs">{breadcrumbs.map((crumb, i) => <li key={i}>
        {crumb.href ? <a href={crumb.href} onClick={e => { if (crumb.onClick) { e.preventDefault(); crumb.onClick(); } }}>{crumb.label}</a> : crumb.onClick ? <button type="button" onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>}
      </li>)}</ol></nav>}
    </div>}
    <div className="workspace-title-row">
      <div className="min-w-0">
        <div className="flex items-center gap-3">{Icon && <Icon className="w-5 h-5 text-[var(--kyro-text-secondary)] shrink-0" aria-hidden="true" />}{title && <h1>{title}</h1>}</div>
        {description && <p className="workspace-description">{description}</p>}
        {metadata?.length ? <div className="workspace-metadata">{metadata.map((item, i) => <React.Fragment key={i}>{item}</React.Fragment>)}</div> : null}
        {children}
      </div>
      {(action || actions) && <div className="workspace-header-actions">{Array.isArray(actions) ? actions.map((a, i) => <HeaderAction key={i} action={a} />) : actions}{action && <HeaderAction action={action} />}</div>}
    </div>
  </header>;
}
