import { z } from 'zod';

export const Schema = z.object({
	id: z.string().describe('specification.data.Identity.id'),
	createdAt: z.date().describe('data.Identity.createdAt'),
});

export type Type = z.infer<typeof Schema>;
