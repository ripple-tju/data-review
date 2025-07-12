import { z } from 'zod';

export const Schema = z.object({
	value: z.number().max(50).describe('specification.data.CountByPeriod.value'),
	at: z.date(),
});

export type Type = z.infer<typeof Schema>;
