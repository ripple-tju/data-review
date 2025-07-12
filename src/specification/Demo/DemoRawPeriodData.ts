import { z } from 'zod';

export const Schema = z.object({
	id: z.string(),
	uuid: z.string(),
	capturedAt: z.string(),
	createdAt: z.string(),
	content: z.string().optional(),
	url: z.string(),
	index: z.object({
		like: z.number().nullable(),
		comment: z.number().nullable(),
		share: z.number().nullable(),
		read: z.number().nullable(),
		favorite: z.number().nullable(),
	}),
	author: z.object({
		id: z.string(),
		name: z.string(),
	}),
});

export type Type = z.infer<typeof Schema>;
