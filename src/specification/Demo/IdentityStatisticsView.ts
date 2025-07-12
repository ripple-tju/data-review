import { z } from 'zod';
import { PostArchive, PostView } from '..';

export const Schema = z.object({
	authorId: z.string(),
	authorName: z.string().describe('specification.data.Demo.IdentityStatisticsView.authorName'),
	capturedAt: z.date().describe('specification.data.Demo.IdentityStatisticsView.capturedAt'),
	createdAt: z.date().describe('specification.data.Demo.IdentityStatisticsView.createdAt'),

	like: z
		.number()
		// .nullable()
		.default(0)
		.describe('specification.data.Demo.IdentityStatisticsView.like'),
	comment: z
		.number()
		// .nullable()
		.default(0)
		.describe('specification.data.Demo.IdentityStatisticsView.comment'),
	share: z
		.number()
		// .nullable()
		.default(0)
		.describe('specification.data.Demo.IdentityStatisticsView.share'),
	view: z
		.number()
		// .nullable()
		.default(0)
		.describe('specification.data.Demo.IdentityStatisticsView.view'),
	favorite: z
		.number()
		// .nullable()
		.default(0)
		.describe('specification.data.Demo.IdentityStatisticsView.favorite'),

	post: z.number().default(0).describe('specification.data.Demo.IdentityStatisticsView.post'),

	postViewList: PostView.Schema.extend({
		archive: PostArchive.Schema,
	})
		.array()
		.default([]),
});

export type Type = z.infer<typeof Schema>;
