import {isDevotionalTopic, type DevotionalTopic} from './topics';

// Block grammar for daily devotionals. Keep the set small on purpose — every
// block type needs a native renderer, a validator branch, and a place in the
// authoring workflow. Add a new block only when an actual devotional needs it.

export type ParagraphBlock = {
  type: 'paragraph';
  text: string;
};

export type HeadingBlock = {
  type: 'heading';
  level: 2 | 3;
  text: string;
};

export type VerseBlock = {
  type: 'verse';
  ref: string;
  text: string;
};

export type CalloutBlock = {
  type: 'callout';
  text: string;
  // 'topic' (default) uses the devotional's tone. 'muted' is a softer
  // background-only variant for asides that shouldn't compete with the topic.
  variant?: 'topic' | 'muted';
};

export type QuoteBlock = {
  type: 'quote';
  text: string;
  attribution?: string;
};

export type PrayerBlock = {
  type: 'prayer';
  text: string;
};

export type ListBlock = {
  type: 'list';
  ordered?: boolean;
  items: string[];
};

export type ImageBlock = {
  type: 'image';
  url: string;
  alt: string;
  // Optional aspect ratio. If absent the renderer uses 16:9.
  aspectRatio?: number;
  // Optional caption shown below the image.
  caption?: string;
};

export type DevotionalBlock =
  | ParagraphBlock
  | HeadingBlock
  | VerseBlock
  | CalloutBlock
  | QuoteBlock
  | PrayerBlock
  | ListBlock
  | ImageBlock;

export type Devotional = {
  date: string;            // ISO YYYY-MM-DD
  title: string;
  topic: DevotionalTopic;  // see topics.ts
  verseRef?: string;       // headline scripture reference, optional
  author?: string;
  publishedAt: string;     // ISO timestamp
  blocks: DevotionalBlock[];
};

// ---------- Runtime validators ----------
//
// These guard the JSON we fetch from the OTA channel. Anything that fails
// validation should be discarded so a malformed publish never corrupts the
// reader UI. Each validator returns a type predicate so success narrows the
// type without an explicit cast.

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(item => typeof item === 'string');

export const isDevotionalBlock = (v: unknown): v is DevotionalBlock => {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  switch (b.type) {
    case 'paragraph':
      return isNonEmptyString(b.text);
    case 'heading':
      return (
        (b.level === 2 || b.level === 3) && isNonEmptyString(b.text)
      );
    case 'verse':
      return isNonEmptyString(b.ref) && isNonEmptyString(b.text);
    case 'callout':
      return (
        isNonEmptyString(b.text) &&
        (b.variant === undefined ||
          b.variant === 'topic' ||
          b.variant === 'muted')
      );
    case 'quote':
      return (
        isNonEmptyString(b.text) &&
        (b.attribution === undefined || typeof b.attribution === 'string')
      );
    case 'prayer':
      return isNonEmptyString(b.text);
    case 'list':
      return (
        isStringArray(b.items) &&
        b.items.length > 0 &&
        (b.ordered === undefined || typeof b.ordered === 'boolean')
      );
    case 'image':
      return (
        isNonEmptyString(b.url) &&
        typeof b.alt === 'string' &&
        (b.aspectRatio === undefined ||
          (typeof b.aspectRatio === 'number' && b.aspectRatio > 0)) &&
        (b.caption === undefined || typeof b.caption === 'string')
      );
    default:
      return false;
  }
};

export const isDevotional = (v: unknown): v is Devotional => {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  if (!isNonEmptyString(d.date)) return false;
  if (!isNonEmptyString(d.title)) return false;
  if (!isDevotionalTopic(d.topic)) return false;
  if (!isNonEmptyString(d.publishedAt)) return false;
  if (d.verseRef !== undefined && typeof d.verseRef !== 'string') return false;
  if (d.author !== undefined && typeof d.author !== 'string') return false;
  if (!Array.isArray(d.blocks)) return false;
  if (!d.blocks.every(isDevotionalBlock)) return false;
  return true;
};
