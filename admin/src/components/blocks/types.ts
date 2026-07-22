export interface Block {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
  children?: Block[];
}

export interface BlockComponentProps {
  block: Block;
  index: number;
}
