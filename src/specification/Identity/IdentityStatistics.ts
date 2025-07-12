import { z } from 'zod';
import * as Identity from './Identity';
import * as IdentityArchive from './IdentityArchive';

export const Schema = z.object({
	// id: z.string(), ?
	id: Identity.Schema.shape.id,
	current: IdentityArchive.Schema.shape.id,
	archive: z.number(),
	post: z.number(),
});
