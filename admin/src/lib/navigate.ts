export const navigate = (href: string, options?: any) => {
  if (typeof window === 'undefined') return;
  
  import("astro:transitions/client")
    .then((m) => {
      if (m && m.navigate) {
        m.navigate(href, options);
      } else {
        window.location.href = href;
      }
    })
    .catch(() => {
      window.location.href = href;
    });
};
