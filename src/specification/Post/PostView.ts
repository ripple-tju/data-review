import { z } from 'zod';
import * as Post from './Post';
import * as PostArchive from './PostArchive';

export const Schema = z.object({
	post: Post.Schema,
	archive: PostArchive.Schema.array(),
});

export type Type = z.infer<typeof Schema>;
