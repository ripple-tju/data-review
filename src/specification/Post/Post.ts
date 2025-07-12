import { z } from 'zod';

export const Schema = z.object({
	id: z.string(),
	root: z.string().optional(),
	parent: z.string().optional(),
	author: z.string(),
	createdAt: z.date(),
});

export type Type = z.infer<typeof Schema>;
