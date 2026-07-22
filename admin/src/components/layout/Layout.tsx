import { type CollectionConfig } from '@kyro-cms/core/client';

interface LayoutProps {
  children: React.ReactNode;
  collections?: CollectionConfig[];
  currentSlug?: string;
}

export default function Layout({ children, collections = [], currentSlug }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar placeholder - will be populated by Sidebar component */}
        <div id="sidebar-root" className="hidden lg:block">
          {/* Sidebar rendered here */}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* {children} */}
        </main>
      </div>
    </div>
  );
}
