import { z } from 'zod';
import * as Identity from './Identity';
import * as IdentityArchive from './IdentityArchive';

export const Schema = z.object({
	identity: Identity.Schema,
	archive: IdentityArchive.Schema.array(),
});

export type Type = z.infer<typeof Schema>;
