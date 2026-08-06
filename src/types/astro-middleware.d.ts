declare module "astro:middleware" {
  export function sequence(...handlers: any[]): any;
}
