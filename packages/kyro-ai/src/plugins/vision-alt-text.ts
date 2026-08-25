import { generateText } from 'ai';

export interface VisionAltTextOptions {
  model?: any;
  defaultPrompt?: string;
}

export interface AltTextResult {
  altText: string;
  caption?: string;
  tags?: string[];
}

/**
 * Generates descriptive alt text and accessibility captions for images using Vision AI.
 */
export async function generateImageAltText(
  imageUrl: string,
  options: VisionAltTextOptions = {}
): Promise<AltTextResult> {
  const { model, defaultPrompt } = options;

  const prompt =
    defaultPrompt ||
    `Analyze this image and provide:
1. A concise, descriptive alt-text for screen readers and SEO (maximum 125 characters, no fluff).
2. A natural 1-sentence caption.
3. 3-5 relevant lowercase keyword tags.

Respond in pure JSON format:
{
  "altText": "...",
  "caption": "...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  if (!model) {
    // Fallback if no LLM provider initialized: generate intelligent heuristic metadata from filename/url
    const filename = imageUrl.split('/').pop()?.split('?')[0]?.replace(/[-_]/g, ' ')?.replace(/\.[^/.]+$/, '') || 'Uploaded image';
    const capitalized = filename.charAt(0).toUpperCase() + filename.slice(1);
    return {
      altText: capitalized,
      caption: `Photograph of ${filename.toLowerCase()}`,
      tags: filename.toLowerCase().split(' ').filter(Boolean).slice(0, 4),
    };
  }

  try {
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: new URL(imageUrl) },
          ],
        },
      ],
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      altText: parsed.altText || 'Image',
      caption: parsed.caption,
      tags: parsed.tags || [],
    };
  } catch (error) {
    // Fallback on parsing error
    const filename = imageUrl.split('/').pop()?.split('?')[0]?.replace(/[-_]/g, ' ')?.replace(/\.[^/.]+$/, '') || 'Uploaded image';
    return {
      altText: filename.charAt(0).toUpperCase() + filename.slice(1),
      caption: `Image asset: ${filename}`,
      tags: [],
    };
  }
}
