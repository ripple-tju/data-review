import { z } from 'zod';

export const Schema = z.object({
	name: z.string(),
	code: z.string(),
	version: z.string(),
});

export type Type = z.infer<typeof Schema>;
