import type { ReactNode } from "react";
import type { KyroTheme } from "../theme/tokens.ts";
import type { Block as CoreBlock, Field } from "@kyro-cms/core";

export interface BlockRenderProps {
  data: Record<string, unknown>;
  context: {
    theme: KyroTheme;
    locale: string;
    isPreview: boolean;
  };
}

export interface KyroBlock extends Omit<CoreBlock, "fields" | "slug"> {
  id: string;
  label: string;
  category?: string;
  icon?: ReactNode;
  schema: Field[];
  render: (props: BlockRenderProps) => ReactNode;
  preview?: (props: BlockRenderProps) => ReactNode;
  settings?: Record<string, unknown>;
}
