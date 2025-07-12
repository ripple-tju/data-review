import { z } from 'zod';
import * as Post from './Post';
import * as PostArchive from './PostArchive';

export const Schema = z.object({
	// id: z.string(), ?
	id: Post.Schema.shape.id,
	current: PostArchive.Schema.shape.id,
	archive: z.number(),
});

export type Type = z.infer<typeof Schema>;
