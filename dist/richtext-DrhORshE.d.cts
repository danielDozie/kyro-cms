declare const richTextStyles: string;
declare function normalizeRichTextValue<T>(value: T): T;
declare function renderRichText(value: unknown): string;

export { richTextStyles as a, normalizeRichTextValue as n, renderRichText as r };
