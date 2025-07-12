// import { generateMock } from '@anatine/zod-mock';
import {
  Identity,
  IdentityArchive,
  Post,
  PostArchive,
  CountByPeriod,
  IdentityView,
  PostView,
  // DemoRawPeriodData,
  type IdentityStatisticsView,
} from 'src/specification';
import { sortByCreatedAt, getDateStrList, getRangeValue } from './utils';
import { parseForQuery } from './transform';

export type ValueWithSampleTime<T> = {
  value: T;
  at: Date;
};

export interface TargetData {
  name: string;
  code: string;
  version: string;
}

export interface TargetBrandData {
  color: string;
}

export interface TargetStatsData {
  identity: ValueWithSampleTime<number>;
  post: ValueWithSampleTime<number>;
  archive: ValueWithSampleTime<number>;
}

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export type ValueWithPeriod<T> = {
  value: T;
  at: Date;
};

const generateMock = (_: any): ValueWithPeriod<number> => {
  return { value: 1, at: new Date() };
};

// const sortByCreatedAt = <T extends { createdAt: string }>(
// 	a: T,
// 	b: T,
// 	getter: (item: T) => number = (item) => new Date(item.createdAt).getTime(),
// ) => {
// 	return getter(b) - getter(a);
// };

export const Query = (PeriodData: unknown) => {
  const { data: parsed, lastCreatedAt, firstCreatedAt } = parseForQuery(PeriodData);

  const TARGET_LIST: (TargetData & {
    brand: TargetBrandData;
    stats: TargetStatsData;
    // rawList: Array<z.infer<typeof RawPeriodDataWithUUID>>;
    identityList: Array<Identity.Type>;
    identityArchiveList: Array<IdentityArchive.Type>;
    postList: Array<Post.Type>;
    postArchiveList: Array<PostArchive.Type>;
  })[] = [
    {
      name: 'Facebook',
      code: 'fb',
      version: '2024.11.11',
      brand: {
        color: '#0866ff',
      },
      stats: {
        identity: {
          value: 12,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        post: {
          value: 500,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        archive: {
          value: 10000000,
          at: new Date('2024-11-11T00:00:00Z'),
        },
      },
      // rawList,
      identityList: Identity.Schema.array().parse(parsed.identityList),
      identityArchiveList: IdentityArchive.Schema.array().parse(parsed.identityArchiveList),
      postList: Post.Schema.array().parse(parsed.postList),
      postArchiveList: PostArchive.Schema.array().parse(parsed.postArchiveList),
    },
    {
      name: 'X',
      code: 'x',
      version: '2024.12.1',
      brand: {
        color: '#000000',
      },
      stats: {
        identity: {
          value: 13,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        post: {
          value: 500,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        archive: {
          value: 10000000,
          at: new Date('2024-11-11T00:00:00Z'),
        },
      },
      // rawList: [],
      identityList: [],
      identityArchiveList: [],
      postList: [],
      postArchiveList: [],
    },
    {
      name: 'Youtube',
      code: 'yt',
      version: '2025.2.1',
      brand: {
        color: '#FF0000',
      },
      stats: {
        identity: {
          value: 14,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        post: {
          value: 500,
          at: new Date('2024-11-11T00:00:00Z'),
        },
        archive: {
          value: 10000000,
          at: new Date('2024-11-11T00:00:00Z'),
        },
      },
      // rawList: [],
      identityList: [],
      identityArchiveList: [],
      postList: [],
      postArchiveList: [],
    },
  ];

  const Data = {
    TARGET_LIST,
  };

  return Object.freeze({
    Tweetolith: Object.freeze({
      async Stats() {},
    }),
    Target: Object.assign(
      (code: string) => {
        const target = Data.TARGET_LIST.find((target) => target.code === code);

        if (target === undefined) {
          throw new Error();
        }

        return {
          async getStatistics(): Promise<TargetStatsData> {
            const identityValue = target.identityList.length;
            const identityAt = target.identityList.sort(sortByCreatedAt)[0]?.createdAt;
            const identity = {
              value: identityValue,
              at: identityAt ? new Date(identityAt) : new Date(),
            };

            const postValue = target.postList.length;
            const postAt = target.postList.sort(sortByCreatedAt)[0]?.createdAt;
            const post = {
              value: postValue,
              at: postAt ? new Date(postAt) : new Date(),
            };

            const archiveValue = target.identityArchiveList.length + target.postArchiveList.length;
            const archiveAt = target.postArchiveList.sort(sortByCreatedAt)[0]?.createdAt;
            const archive = {
              value: archiveValue,
              at: archiveAt ? new Date(archiveAt) : new Date(),
            };

            return await Promise.resolve({ identity, post, archive });
          },
          async getBrand(): Promise<TargetBrandData> {
            // await sleep();

            return await Promise.resolve({ ...target.brand });
          },
          async getHotPostTop(limit: number = 10): Promise<Array<PostView.Type>> {
            return await Promise.resolve(
              target.postList
                .sort(() => Math.random() - 0.5)
                .slice(0, limit)
                .map((p) => {
                  return {
                    post: p,
                    archive: target.postArchiveList.filter((pa) => pa.post === p.id),
                  };
                }),
            );
          },
          async getLastPostTop(limit: number = 10): Promise<Array<PostView.Type>> {
            return await Promise.resolve(
              target.postList
                .sort(() => Math.random() - 0.5)
                .slice(0, limit)
                .map((p) => {
                  return {
                    post: p,
                    archive: target.postArchiveList.filter((ia) => ia.post === p.id),
                  };
                }),
            );
          },
          async getLastIdentityTop(limit: number = 10): Promise<Array<IdentityView.Type>> {
            return await Promise.resolve(
              target.identityList
                .sort(() => Math.random() - 0.5)
                .slice(0, limit)
                .map((p) => {
                  return {
                    identity: p,
                    archive: target.identityArchiveList.filter((ia) => ia.identity === p.id),
                  };
                }),
            );
          },
          async getNewArchiveCountByPeriod(
            limit: number = 10,
          ): Promise<Array<ValueWithPeriod<number>>> {
            return await Promise.resolve(
              new Array(limit).fill(1).map(() => generateMock(CountByPeriod.Schema)),
            );
          },
          async getNewPostCountByPeriod(
            limit: number = 10,
          ): Promise<Array<ValueWithPeriod<number>>> {
            return await Promise.resolve(
              new Array(limit).fill(1).map(() => generateMock(CountByPeriod.Schema)),
            );
          },
          async getNewIdentityCountByPeriod(
            limit: number = 10,
          ): Promise<Array<ValueWithPeriod<number>>> {
            return await Promise.resolve(
              new Array(limit).fill(1).map(() => generateMock(CountByPeriod.Schema)),
            );
          },
          async getDeltaArchiveCountByPeriod(): Promise<Array<ValueWithPeriod<number>>> {
            const postArchive = target.postArchiveList;

            const byRange = getRangeValue(postArchive, {
              from: firstCreatedAt ?? new Date(),
              to: lastCreatedAt ?? new Date(),
            });

            const result = byRange.map((item) => {
              return {
                value: item.length,
                at: new Date(item.date),
              };
            });

            return await Promise.resolve(result);
          },
          async getDeltaPostCountByPeriod(): Promise<Array<ValueWithPeriod<number>>> {
            const postArchive = target.postArchiveList;

            const byRange = getRangeValue(postArchive, {
              from: firstCreatedAt ?? new Date(),
              to: lastCreatedAt ?? new Date(),
            });

            const result = byRange.map((item) => {
              return {
                value: item.length,
                at: new Date(item.date),
              };
            });

            return await Promise.resolve(result);
          },
          async getTotalIdentityCountByPeriod(): Promise<Array<ValueWithPeriod<number>>> {
            const identityArchive = target.identityArchiveList;
            const rangeStr = getDateStrList({
              from: firstCreatedAt ?? new Date(),
              to: lastCreatedAt ?? new Date(),
            });

            const result = rangeStr.map((dateStr) => {
              // const count = identityArchive.filter((i) => i.createdAt.startsWith(dateStr)).length;
              const count = identityArchive.length;
              return {
                value: count,
                at: new Date(dateStr),
              };
            });

            return await Promise.resolve(result);
          },
          async getDeltaIdentityCountByPeriod(
            limit: number = 10,
          ): Promise<Array<ValueWithPeriod<number>>> {
            return await Promise.resolve(
              new Array(limit).fill(1).map(() => generateMock(CountByPeriod.Schema)),
            );
          },
          async getStatisticsByPeriod(limit: number = 10): Promise<Array<ValueWithPeriod<number>>> {
            return await Promise.resolve(
              new Array(limit).fill(1).map(() => generateMock(CountByPeriod.Schema)),
            );
          },
          async getPostById(id: string): Promise<Post.Type | null> {
            const result = target.postList.find((i) => i.id === id);
            return await Promise.resolve(result ? Post.Schema.parse(result) : null);
          },
          async getChildrenPost(id: string): Promise<Array<Post.Type>> {
            const result = target.postList.filter((i) => i.parent === id);
            return await Promise.resolve(Post.Schema.array().parse(result));
          },
          async getChildrenPostView(id: string): Promise<Array<PostView.Type>> {
            const postList = await this.getPostViewList();
            const result = postList.filter((i) => i.post.parent === id);
            return await Promise.resolve(PostView.Schema.array().parse(result));
          },
          async getPostViewList(): Promise<Array<PostView.Type>> {
            return await Promise.resolve(
              target.postList.map((p) => {
                return {
                  post: p,
                  archive: target.postArchiveList
                    .filter((pa) => pa.post === p.id)
                    .sort(sortByCreatedAt),
                };
              }),
            );
          },
          async getPostViewById(id: string): Promise<PostView.Type | null> {
            const post = target.postList.find((i) => i.id === id);

            if (post === undefined) {
              return null;
            }

            const result: PostView.Type = {
              post,
              archive: target.postArchiveList.filter((ia) => ia.post === id).sort(sortByCreatedAt),
            };

            return await Promise.resolve(PostView.Schema.parse(result));
          },
          async getIdentityViewList(): Promise<Array<IdentityView.Type>> {
            return await Promise.resolve(
              target.identityList.map((p) => {
                return {
                  identity: p,
                  archive: target.identityArchiveList
                    .filter((ia) => ia.identity === p.id)
                    .sort(sortByCreatedAt),
                };
              }),
            );
          },
          async getIdentityViewById(id: string): Promise<IdentityView.Type | null> {
            const identity = target.identityList.find((i) => i.id === id);

            if (identity === undefined) {
              return null;
            }

            const result: IdentityView.Type = {
              identity,
              archive: target.identityArchiveList
                .filter((ia) => ia.identity === id)
                .sort(sortByCreatedAt),
            };

            return await Promise.resolve(IdentityView.Schema.parse(result));
          },
          async getPostViewListByIdentityId(authorId: string): Promise<Array<PostView.Type>> {
            const pvList = await this.getPostViewList();
            return pvList
              .filter((p) => p.post.author === authorId)
              .sort((a, b) => {
                const apa = a.archive.at(0)?.like ?? 0;
                const apb = b.archive.at(0)?.like ?? 0;
                return apb - apa;
              });
          },
          async getHotPostList(
            range: number = DAY * 7,
            growthTime: number = DAY * 3,
          ): Promise<Array<PostView.Type>> {
            const pvList = await this.getPostViewList();
            const end = new Date('2025-05-15');
            const start = new Date(end.getTime() - range);
            const growth = new Date(start.getTime() + growthTime);
            const inRange = pvList
              .map((p) => {
                const createdAt = new Date(p.post.createdAt);
                const createdAtInRange = createdAt >= start && createdAt <= end;

                const sortedByCapturedAt = p.archive.sort(sortByCreatedAt);

                const firstCapturedAtAfterGrowth = sortedByCapturedAt.find((i) => {
                  const capturedAt = new Date(i.createdAt);
                  return capturedAt >= growth && capturedAt <= end;
                });

                return createdAtInRange
                  ? firstCapturedAtAfterGrowth === undefined
                    ? null
                    : {
                        post: p.post,
                        archive: [firstCapturedAtAfterGrowth],
                      }
                  : null;
              })
              .filter((i) => i !== null);

            const sortByLike = inRange.sort((a, b) => {
              const aLike = a.archive[0]!.like;
              const bLike = b.archive[0]!.like;

              return bLike - aLike;
            });

            return await Promise.resolve(sortByLike);
          },
          // async getTestRawList1(): Promise<Array<IdentityStatisticsView.Type>> {
          // 	const groupedByUser = groupBy(target.rawList, 'author.id');

          // 	const userStatistic = reduce(
          // 		groupedByUser,
          // 		(acc, item) => {
          // 			const { id, name } = item[0]!.author;
          // 			const { like, comment, share, read, favorite } = item[0]!.index;
          // 			const { capturedAt, createdAt, url, uuid } = item[0]!;

          // 			// Initialize the accumulator item if it doesn't exist
          // 			if (!acc[id]) {
          // 				acc[id] = {
          // 					capturedAt,
          // 					createdAt,
          // 					authorId: id,
          // 					authorName: name,
          // 					post: item.length,
          // 					like: like ?? 0,
          // 					comment: comment ?? 0,
          // 					share: share ?? 0,
          // 					read: read ?? 0,
          // 					favorite: favorite ?? 0,
          // 					postList: item,
          // 				};
          // 			} else {
          // 				// Update the existing entry
          // 				acc[id].like += like ?? 0;
          // 				acc[id].comment += comment ?? 0;
          // 				acc[id].share += share ?? 0;
          // 				acc[id].read += read ?? 0;
          // 				acc[id].favorite += favorite ?? 0;

          // 				// Update other fields
          // 				acc[id].capturedAt = capturedAt;
          // 				acc[id].createdAt = createdAt;
          // 			}
          // 			return acc;
          // 		},
          // 		{} as Record<string, IdentityStatisticsView.Type>,
          // 	);
          // 	return Promise.resolve(Object.values(userStatistic));
          // },
          async getIdentityStatisticsViewList(): Promise<Array<IdentityStatisticsView.Type>> {
            console.time('getIdentityStatisticsViewList');
            console.time('getIdentityViewList');
            const identityList = await this.getIdentityViewList();
            console.timeEnd('getIdentityViewList');

            console.time('getPostViewList');
            const postViewList = await this.getPostViewList();
            console.timeEnd('getPostViewList');
            const postViewListByIdentityId = Object.groupBy(postViewList, (i) => i.post.author);

            const userStatistic = identityList.map((iv) => {
              const identityId = iv.identity.id;
              const identityName = iv.archive[iv.archive.length - 1]!.name;

              console.time('getPostViewListByIdentityId' + identityId);
              const postViewList = postViewListByIdentityId[identityId]!;
              console.timeEnd('getPostViewListByIdentityId' + identityId);

              console.log(postViewListByIdentityId, identityId);

              const postViewListWithLatestArchive = postViewList.map((pv) => {
                const r = {
                  post: pv.post,
                  archive: pv.archive[pv.archive.length - 1]!,
                };
                return r;
              });

              console.log('postViewListWithLatestArchive', postViewListWithLatestArchive);

              const { like, comment, share, view, favorite } = postViewListWithLatestArchive.reduce(
                (acc, pv) => {
                  acc.like += pv.archive.like ?? 0;
                  acc.comment += pv.archive.comment ?? 0;
                  acc.share += pv.archive.share ?? 0;
                  acc.view += pv.archive.view ?? 0;
                  acc.favorite += pv.archive.favorite ?? 0;
                  return acc;
                },
                { like: 0, comment: 0, share: 0, view: 0, favorite: 0 },
              );

              const result: IdentityStatisticsView.Type = {
                capturedAt: iv.archive[iv.archive.length - 1]!.createdAt,
                createdAt: iv.identity.createdAt,
                authorId: identityId,
                authorName: identityName,
                post: postViewListWithLatestArchive.length,
                like: like ?? 0,
                comment: comment ?? 0,
                share: share ?? 0,
                view: view ?? 0,
                favorite: favorite ?? 0,
                postViewList: postViewListWithLatestArchive,
              };

              return result;
            });
            console.timeEnd('getIdentityStatisticsViewList');
            return userStatistic;
          },
        };
      },
      {
        async All() {
          return Promise.resolve(
            Data.TARGET_LIST.map(({ name, version, code }) => ({ name, version, code })),
          );
        },
      },
    ),
  });
};
