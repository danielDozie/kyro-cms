declare module "*.css" {
  const content: string;
  export default content;
}

declare module "graphiql/graphiql.css" {
  const content: string;
  export default content;
}

declare module "react-image-crop/dist/ReactCrop.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "virtual:kyro-plugins" {
  import type { LazyExoticComponent, ComponentType } from "react";
  export const pluginViews: Record<
    string,
    LazyExoticComponent<ComponentType<any>>
  >;
  export const projectConfig: any;
}
