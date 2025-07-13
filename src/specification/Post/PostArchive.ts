import { z } from 'zod';
import * as Post from './Post';

export const Schema = z.object({
  id: z.string().describe('specification.data.PostArchive.id'),
  post: Post.Schema.shape.id.describe('specification.data.PostArchive.post'),
  createdAt: z.date().describe('specification.data.PostArchive.createdAt'),
  capturedAt: z.date().describe('specification.data.PostArchive.capturedAt'),
  content: z.string().describe('specification.data.PostArchive.content'),
  like: z.number().describe('specification.data.PostArchive.like'),
  comment: z.number().describe('specification.data.PostArchive.comment'),
  share: z.number().describe('specification.data.PostArchive.share'),
  view: z.number().describe('specification.data.PostArchive.view'),
  favorite: z.number().describe('specification.data.PostArchive.favorite'),
  url: z.string().describe('specification.data.IdentityArchive.url'),
});

export type Type = z.infer<typeof Schema>;

export const Default: () => Type = () => ({
  id: '-',
  post: '-',
  createdAt: new Date(),
  capturedAt: new Date(),
  content: '-',
  like: 0,
  comment: 0,
  share: 0,
  view: 0,
  favorite: 0,
  url: '-',
});
