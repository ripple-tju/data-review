import { z } from 'zod';

export const Schema = z.enum(['git', 'artifact']);

export type Type = z.infer<typeof Schema>;
export type Enum = {
	[key in Type]: key;
};
