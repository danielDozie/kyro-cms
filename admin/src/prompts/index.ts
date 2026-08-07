import generatePromptRaw from './generate.md?raw';
import summarizePromptRaw from './summarize.md?raw';
import expandPromptRaw from './expand.md?raw';
import customPromptRaw from './custom.md?raw';

interface PromptContext {
  action: "Generate" | "Summarize" | "Expand" | "Prompt" | string;
  title: string;
  collectionName: string;
  contextContent?: string;
  customPrompt?: string;
}

export function buildAiPrompt({
  action,
  title,
  collectionName,
  contextContent = '',
  customPrompt = '',
}: PromptContext): string {
  const imageSeed = encodeURIComponent(String(title).toLowerCase().replace(/[^a-z0-9]/g, ''));

  if (action === "Generate") {
    return generatePromptRaw
      .replace(/{{collectionName}}/g, collectionName)
      .replace(/{{title}}/g, title)
      .replace(/{{imageSeed}}/g, imageSeed);
  }

  if (action === "Summarize") {
    return summarizePromptRaw
      .replace(/{{collectionName}}/g, collectionName)
      .replace(/{{title}}/g, title)
      .replace(/{{content}}/g, contextContent);
  }

  if (action === "Expand") {
    return expandPromptRaw
      .replace(/{{collectionName}}/g, collectionName)
      .replace(/{{title}}/g, title)
      .replace(/{{content}}/g, contextContent);
  }

  if (action === "Prompt") {
    return customPromptRaw.replace(/{{customPrompt}}/g, customPrompt);
  }

  return customPrompt || `Write a clear, structured section about ${title}.`;
}
