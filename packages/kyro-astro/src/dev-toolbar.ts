export interface KyroDevToolbarOptions {
  enabled?: boolean;
}

/**
 * Astro Integration Hook helper to register the Kyro CMS Dev Toolbar widget.
 */
export function kyroDevToolbarIntegration(options: KyroDevToolbarOptions = {}) {
  return {
    name: 'kyro-dev-toolbar-integration',
    hooks: {
      'astro:config:setup': ({ addDevToolbarApp, logger }: any) => {
        if (options.enabled !== false && typeof addDevToolbarApp === 'function') {
          addDevToolbarApp({
            id: 'kyro-cms',
            name: 'Kyro CMS',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
            entrypoint: '@kyro-cms/astro/dev-toolbar-app',
          });

          logger?.info('Registered Kyro CMS Dev Toolbar App');
        }
      },
    },
  };
}
