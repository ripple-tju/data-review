import { z } from 'zod';
import * as Identity from './Identity';

export const Schema = z.object({
	id: z.string().describe('specification.data.IdentityArchive.id'),
	identity: Identity.Schema.shape.id.describe('specification.data.IdentityArchive.identity'),
	name: z.string().describe('specification.data.IdentityArchive.name'),
	avatar: z.string().describe('specification.data.IdentityArchive.avatar'),
	createdAt: z.date().describe('specification.data.IdentityArchive.createdAt'),
	follower: z.number().describe('specification.data.IdentityArchive.follower'),
	following: z.number().describe('specification.data.IdentityArchive.following'),
	post: z.number().describe('specification.data.IdentityArchive.post'),
});

export type Type = z.infer<typeof Schema>;

export const Default: () => Type = () => ({
	id: '-',
	identity: '-',
	name: '-',
	avatar: '-',
	createdAt: new Date(),
	follower: 0,
	following: 0,
	post: 0,
});
