import React from "react";
import { HeadingBlock } from "../../blocks/HeadingBlock";
import { ParagraphBlock } from "../../blocks/ParagraphBlock";
import { ImageBlock } from "../../blocks/ImageBlock";
import { VideoBlock } from "../../blocks/VideoBlock";
import { ListBlock } from "../../blocks/ListBlock";
import { CodeBlock } from "../../blocks/CodeBlock";
import { FileBlock } from "../../blocks/FileBlock";
import { AccordionBlock } from "../../blocks/AccordionBlock";
import { RichTextBlock } from "../../blocks/RichTextBlock";
import { HeroBlock } from "../../blocks/HeroBlock";
import { CardBlock } from "../../blocks/CardBlock";
import { ArrayBlock } from "../../blocks/ArrayBlock";
import { RelationshipBlock } from "../../blocks/RelationshipBlock";

import {
  Box,
  Heading1,
  AlignLeft,
  Image,
  Video,
  List,
  Code,
  File,
  ChevronDown,
  Star,
  ListOrdered,
  Link2,
  Columns3,
  Sparkles,
  Users,
  HelpCircle,
  Activity,
  Tag,
  Database,
  Mail,
  Blocks,
  Clock,
} from "../../ui/icons";

// Block component registry
export const BLOCK_COMPONENTS: Record<string, React.ComponentType<{ block: any; index: number }>> = {
  heading: HeadingBlock,
  paragraph: ParagraphBlock,
  image: ImageBlock,
  video: VideoBlock,
  list: ListBlock,
  code: CodeBlock,
  file: FileBlock,
  accordion: AccordionBlock,
  richtext: RichTextBlock,

  hero: HeroBlock,
  card: CardBlock,
  array: ArrayBlock,
  relationship: RelationshipBlock,
};

// Block Theme mapping for consistent coloring across UI
export const blockTheme: Record<string, { text: string; border: string; borderLeft: string }> = {
  featureSplit: { text: "text-indigo-500", border: "border-indigo-500", borderLeft: "border-l-indigo-500" },
  featureGrid: { text: "text-blue-500", border: "border-blue-500", borderLeft: "border-l-blue-500" },
  ctaBanner: { text: "text-amber-500", border: "border-amber-500", borderLeft: "border-l-amber-500" },
  testimonials: { text: "text-emerald-500", border: "border-emerald-500", borderLeft: "border-l-emerald-500" },
  faq: { text: "text-orange-500", border: "border-orange-500", borderLeft: "border-l-orange-500" },
  stats: { text: "text-rose-500", border: "border-rose-500", borderLeft: "border-l-rose-500" },
  logoCloud: { text: "text-cyan-500", border: "border-cyan-500", borderLeft: "border-l-cyan-500" },
  pricing: { text: "text-green-500", border: "border-green-500", borderLeft: "border-l-green-500" },
  team: { text: "text-violet-500", border: "border-violet-500", borderLeft: "border-l-violet-500" },
  recentFeed: { text: "text-sky-500", border: "border-sky-500", borderLeft: "border-l-sky-500" },
  processSteps: { text: "text-fuchsia-500", border: "border-fuchsia-500", borderLeft: "border-l-fuchsia-500" },
  formEmbed: { text: "text-pink-500", border: "border-pink-500", borderLeft: "border-l-pink-500" },
  videoShowcase: { text: "text-red-500", border: "border-red-500", borderLeft: "border-l-red-500" },
  hero: { text: "text-yellow-500", border: "border-yellow-500", borderLeft: "border-l-yellow-500" },
  card: { text: "text-teal-500", border: "border-teal-500", borderLeft: "border-l-teal-500" },
  default: { text: "text-zinc-400", border: "border-zinc-400", borderLeft: "border-l-zinc-400" },
};

// Icon mapping for drawer (actual Lucide components)
export const blockIcons: Record<string, React.ReactNode> = {
  heading: <Heading1 className={`w-4 h-4 ${blockTheme.default.text}`} />,
  paragraph: <AlignLeft className={`w-4 h-4 ${blockTheme.default.text}`} />,
  image: <Image className={`w-4 h-4 ${blockTheme.default.text}`} />,
  video: <Video className={`w-4 h-4 ${blockTheme.default.text}`} />,
  list: <List className={`w-4 h-4 ${blockTheme.default.text}`} />,
  code: <Code className={`w-4 h-4 ${blockTheme.default.text}`} />,
  file: <File className={`w-4 h-4 ${blockTheme.default.text}`} />,
  accordion: <ChevronDown className={`w-4 h-4 ${blockTheme.default.text}`} />,
  richtext: <AlignLeft className={`w-4 h-4 ${blockTheme.default.text}`} />,

  hero: <Star className={`w-4 h-4 ${blockTheme.hero.text}`} />,
  card: <Box className={`w-4 h-4 ${blockTheme.card.text}`} />,
  array: <ListOrdered className={`w-4 h-4 ${blockTheme.default.text}`} />,
  relationship: <Link2 className={`w-4 h-4 ${blockTheme.default.text}`} />,

  // New Block Icons
  featureSplit: <Columns3 className={`w-4 h-4 ${blockTheme.featureSplit.text}`} />,
  featureGrid: <Blocks className={`w-4 h-4 ${blockTheme.featureGrid.text}`} />,
  ctaBanner: <Sparkles className={`w-4 h-4 ${blockTheme.ctaBanner.text}`} />,
  testimonials: <Users className={`w-4 h-4 ${blockTheme.testimonials.text}`} />,
  faq: <HelpCircle className={`w-4 h-4 ${blockTheme.faq.text}`} />,
  stats: <Activity className={`w-4 h-4 ${blockTheme.stats.text}`} />,
  logoCloud: <Image className={`w-4 h-4 ${blockTheme.logoCloud.text}`} />,
  pricing: <Tag className={`w-4 h-4 ${blockTheme.pricing.text}`} />,
  team: <Users className={`w-4 h-4 ${blockTheme.team.text}`} />,
  recentFeed: <Database className={`w-4 h-4 ${blockTheme.recentFeed.text}`} />,
  processSteps: <Clock className={`w-4 h-4 ${blockTheme.processSteps.text}`} />,
  formEmbed: <Mail className={`w-4 h-4 ${blockTheme.formEmbed.text}`} />,
  videoShowcase: <Video className={`w-4 h-4 ${blockTheme.videoShowcase.text}`} />,
};

// Internal utility to check if block has a specific custom react component
export function getBlockComponent(type: string) {
  return BLOCK_COMPONENTS[type] || null;
}

// Determines if block is a native layout requiring generic rendering
export function isGenericSemanticBlock(type: string) {
  return [
    "featureSplit", "featureGrid", "ctaBanner",
    "testimonials", "faq", "stats", "logoCloud",
    "pricing", "team", "recentFeed", "processSteps", "formEmbed", "videoShowcase"
  ].includes(type);
}

// Get human-readable label for block type
export function getBlockLabel(type: string): string {
  const labelMap: Record<string, string> = {
    // Primitives
    paragraph: "Paragraph",
    heading: "Heading",
    image: "Image",
    video: "Video",
    list: "List",
    code: "Code",
    file: "File",
    accordion: "Accordion",
    array: "Repeater",
    relationship: "Relationship",
    richtext: "Rich Text",

    // Core Semantic Blocks
    hero: "Hero Section",
    card: "Card Block",
    featureSplit: "Feature Split",
    featureGrid: "Feature Grid",
    ctaBanner: "CTA Banner",
    testimonials: "Testimonials Stack",
    faq: "FAQ Section",
    stats: "Stats & Metrics",
    logoCloud: "Logo Cloud",

    // Brand New Blocks
    pricing: "Pricing Grid / Plan",
    team: "Team Profiles Showcase",
    recentFeed: "Dynamic Content Feed",
    processSteps: "Process Timeline / Steps",
    formEmbed: "Lead Intake Form",
    videoShowcase: "Cinematic Video Showcase",

    // Inline Content Elements
    headingElement: "Heading",
    textElement: "Text",
    imageElement: "Image",
    richtextElement: "Rich Text",
    buttonElement: "Button",
    videoElement: "Video",
    listElement: "List",
  };
  return labelMap[type] || type;
}

export function getBlockDisplayLabel(block: Record<string, unknown>): string {
  const name = block.name as string | undefined;
  if (name && name.trim()) return name.trim();
  return getBlockLabel(block.type as string);
}
