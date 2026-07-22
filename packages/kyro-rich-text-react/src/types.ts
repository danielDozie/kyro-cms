export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: {
    type: string;
    attrs?: Record<string, any>;
    [key: string]: any;
  }[];
  text?: string;
  [key: string]: any;
}

export type CustomComponentProps = {
  node: JSONContent;
  children?: React.ReactNode;
};

export type MarkComponentProps = {
  mark: { type: string; attrs?: Record<string, any> };
  children?: React.ReactNode;
};

export interface KyroRichTextComponents {
  types?: Record<string, React.ComponentType<CustomComponentProps>>;
  marks?: Record<string, React.ComponentType<MarkComponentProps>>;
}
