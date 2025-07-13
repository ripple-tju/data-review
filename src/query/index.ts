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
import { sortByCreatedAt, getDateStrList, getRangeValue, sortByCapturedAt } from './utils';
import { parseForQuery } from './transform';

export type DataSet = {
  identityList: Array<Identity.Type>;
  postList: Array<Post.Type>;
  identityArchiveList: Array<IdentityArchive.Type>;
  postArchiveList: Array<PostArchive.Type>;
};

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

export const Query = (
  {
    data: parsed,
    lastCreatedAt,
    firstCreatedAt,
  }: {
    data: DataSet;
    lastCreatedAt: Date | undefined;
    firstCreatedAt: Date | undefined;
  },
  archiveFillDay: number = 5,
) => {
  // const { data: parsed, lastCreatedAt, firstCreatedAt } = parseForQuery(PeriodData);

  // 🔥 [性能优化] 在Query函数调用时一次性构建所有索引，避免重复计算
  console.time('🔥 [性能优化] 构建全部数据索引');

  // 解析数据
  const identityList = Identity.Schema.array().parse(parsed.identityList);
  const identityArchiveList = IdentityArchive.Schema.array().parse(parsed.identityArchiveList);
  const postList = Post.Schema.array().parse(parsed.postList);
  const postArchiveList = PostArchive.Schema.array().parse(parsed.postArchiveList);

  // 构建 identityArchivesByIdentityId 索引
  console.time('🔥 [性能优化] 构建 identityArchivesByIdentityId 索引');
  const identityArchivesByIdentityId = new Map<string, Array<IdentityArchive.Type>>();
  for (const archive of identityArchiveList) {
    if (!identityArchivesByIdentityId.has(archive.identity)) {
      identityArchivesByIdentityId.set(archive.identity, []);
    }
    identityArchivesByIdentityId.get(archive.identity)!.push(archive);
  }
  // 预排序每个身份的存档
  for (const [, archives] of identityArchivesByIdentityId) {
    archives.sort(sortByCapturedAt);
  }
  console.timeEnd('🔥 [性能优化] 构建 identityArchivesByIdentityId 索引');
  console.log(
    `🔥 [性能优化] identityArchivesByIdentityId 索引包含 ${identityArchivesByIdentityId.size} 个身份`,
  );

  // 构建 postArchivesByPostId 索引
  console.time('🔥 [性能优化] 构建 postArchivesByPostId 索引');
  const postArchivesByPostId = new Map<string, Array<PostArchive.Type>>();
  for (const archive of postArchiveList) {
    if (!postArchivesByPostId.has(archive.post)) {
      postArchivesByPostId.set(archive.post, []);
    }
    postArchivesByPostId.get(archive.post)!.push(archive);
  }

  // 🔥 [数据补全] 对每个帖子的存档进行缺失日期补全处理
  console.time('🔥 [数据补全] 补全帖子存档缺失日期');
  const ARCHIVE_DAYS_RANGE = archiveFillDay - 1; // N天范围，可根据需要调整

  for (const [postId, archives] of postArchivesByPostId) {
    // 先按时间排序
    archives.sort(sortByCapturedAt);

    // 找到对应的帖子信息以获取创建时间
    const post = postList.find((p) => p.id === postId);
    if (!post) continue;

    const postCreatedAt = new Date(post.createdAt);
    const endDate = new Date(postCreatedAt.getTime() + ARCHIVE_DAYS_RANGE * DAY);

    // 生成从帖子创建日期起N天的完整日期列表（按天）
    const expectedDates: string[] = [];
    for (let d = new Date(postCreatedAt); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr) {
        expectedDates.push(dateStr); // YYYY-MM-DD格式
      }
    }

    // 创建日期到存档的映射
    const archivesByDate = new Map<string, PostArchive.Type>();
    for (const archive of archives) {
      const archiveDate = new Date(archive.createdAt).toISOString().split('T')[0];
      if (archiveDate && !archivesByDate.has(archiveDate)) {
        archivesByDate.set(archiveDate, archive);
      }
    }

    // 补全缺失的日期
    const supplementedArchives: Array<PostArchive.Type> = [];

    for (const expectedDate of expectedDates) {
      if (archivesByDate.has(expectedDate)) {
        // 该日期有存档，直接使用
        supplementedArchives.push(archivesByDate.get(expectedDate)!);
      } else {
        // 该日期缺失存档，需要寻找最近的存档
        let foundArchive: PostArchive.Type | null = null;

        // 1. 先往前寻找最近的存档
        for (let i = expectedDates.indexOf(expectedDate) - 1; i >= 0; i--) {
          const prevDate = expectedDates[i];
          if (prevDate && archivesByDate.has(prevDate)) {
            foundArchive = archivesByDate.get(prevDate)!;
            break;
          }
        }

        // 2. 如果往前没找到，往后寻找最近的存档
        if (!foundArchive) {
          for (let i = expectedDates.indexOf(expectedDate) + 1; i < expectedDates.length; i++) {
            const nextDate = expectedDates[i];
            if (nextDate && archivesByDate.has(nextDate)) {
              foundArchive = archivesByDate.get(nextDate)!;
              break;
            }
          }
        }

        // 3. 如果在范围内还是没找到，使用最近的任何存档
        if (!foundArchive && archives.length > 0) {
          // 找距离当前日期最近的存档
          const currentDate = new Date(expectedDate);
          foundArchive = archives.reduce((closest, archive) => {
            const archiveDate = new Date(archive.createdAt);
            const closestDate = new Date(closest.createdAt);
            return Math.abs(archiveDate.getTime() - currentDate.getTime()) <
              Math.abs(closestDate.getTime() - currentDate.getTime())
              ? archive
              : closest;
          });
        }

        // 4. 如果找到了存档，创建该日期的补全存档
        if (foundArchive) {
          const supplementedArchive: PostArchive.Type = {
            ...foundArchive,
            id: `${foundArchive.id}_补全_${expectedDate}`, // 生成新的ID以避免冲突
            createdAt: new Date(`${expectedDate}T00:00:00.000Z`), // 设置为目标日期
          };
          supplementedArchives.push(supplementedArchive);
        }
      }
    }

    // 更新该帖子的存档列表
    postArchivesByPostId.set(postId, supplementedArchives);
  }
  console.timeEnd('🔥 [数据补全] 补全帖子存档缺失日期');

  // 预排序每个帖子的存档
  console.time('🔥 [性能优化] 预排序帖子存档');
  for (const [, archives] of postArchivesByPostId) {
    archives.sort(sortByCapturedAt);
  }
  console.timeEnd('🔥 [性能优化] 预排序帖子存档');
  console.timeEnd('🔥 [性能优化] 构建 postArchivesByPostId 索引');
  console.log(`🔥 [性能优化] postArchivesByPostId 索引包含 ${postArchivesByPostId.size} 个帖子`);

  // 构建 postsByAuthorId 索引
  console.time('🔥 [性能优化] 构建 postsByAuthorId 索引');
  const postsByAuthorId = new Map<string, Array<Post.Type>>();
  for (const post of postList) {
    if (!postsByAuthorId.has(post.author)) {
      postsByAuthorId.set(post.author, []);
    }
    postsByAuthorId.get(post.author)!.push(post);
  }
  console.timeEnd('🔥 [性能优化] 构建 postsByAuthorId 索引');
  console.log(`🔥 [性能优化] postsByAuthorId 索引包含 ${postsByAuthorId.size} 个作者`);

  console.timeEnd('🔥 [性能优化] 构建全部数据索引');

  const TARGET_LIST: (TargetData & {
    brand: TargetBrandData;
    stats: TargetStatsData;
    // rawList: Array<z.infer<typeof RawPeriodDataWithUUID>>;
    identityList: Array<Identity.Type>;
    identityArchiveList: Array<IdentityArchive.Type>;
    postList: Array<Post.Type>;
    postArchiveList: Array<PostArchive.Type>;
    // 性能优化：预建立索引（从外部传入，避免重复构建）
    identityArchivesByIdentityId: Map<string, Array<IdentityArchive.Type>>;
    postArchivesByPostId: Map<string, Array<PostArchive.Type>>;
    postsByAuthorId: Map<string, Array<Post.Type>>;
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
      identityList,
      identityArchiveList,
      postList,
      postArchiveList,
      // 🔥 [性能优化] 直接使用预构建的索引，避免重复计算
      identityArchivesByIdentityId,
      postArchivesByPostId,
      postsByAuthorId,
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
      identityArchivesByIdentityId: new Map(),
      postArchivesByPostId: new Map(),
      postsByAuthorId: new Map(),
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
      identityArchivesByIdentityId: new Map(),
      postArchivesByPostId: new Map(),
      postsByAuthorId: new Map(),
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
            console.time('🔥 [性能优化] getHotPostTop');
            const result = target.postList
              .sort(() => Math.random() - 0.5)
              .slice(0, limit)
              .map((p) => {
                return {
                  post: p,
                  archive: target.postArchivesByPostId.get(p.id) || [],
                };
              });
            console.timeEnd('🔥 [性能优化] getHotPostTop');
            return await Promise.resolve(result);
          },
          async getLastPostTop(limit: number = 10): Promise<Array<PostView.Type>> {
            console.time('🔥 [性能优化] getLastPostTop');
            const result = target.postList
              .sort(() => Math.random() - 0.5)
              .slice(0, limit)
              .map((p) => {
                return {
                  post: p,
                  archive: target.postArchivesByPostId.get(p.id) || [],
                };
              });
            console.timeEnd('🔥 [性能优化] getLastPostTop');
            return await Promise.resolve(result);
          },
          async getLastIdentityTop(limit: number = 10): Promise<Array<IdentityView.Type>> {
            console.time('🔥 [性能优化] getLastIdentityTop');
            const result = target.identityList
              .sort(() => Math.random() - 0.5)
              .slice(0, limit)
              .map((p) => {
                return {
                  identity: p,
                  archive: target.identityArchivesByIdentityId.get(p.id) || [],
                };
              });
            console.timeEnd('🔥 [性能优化] getLastIdentityTop');
            return await Promise.resolve(result);
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
            console.time('🔥 [性能优化] getPostViewList');
            const result = target.postList.map((p) => {
              return {
                post: p,
                archive: target.postArchivesByPostId.get(p.id) || [],
              };
            });
            console.timeEnd('🔥 [性能优化] getPostViewList');
            return await Promise.resolve(result);
          },
          async getPostViewById(id: string): Promise<PostView.Type | null> {
            console.time('🔥 [性能优化] getPostViewById');
            const post = target.postList.find((i) => i.id === id);

            if (post === undefined) {
              console.timeEnd('🔥 [性能优化] getPostViewById');
              return null;
            }

            const result: PostView.Type = {
              post,
              archive: target.postArchivesByPostId.get(id) || [],
            };

            console.timeEnd('🔥 [性能优化] getPostViewById');
            return await Promise.resolve(PostView.Schema.parse(result));
          },
          async getIdentityViewList(): Promise<Array<IdentityView.Type>> {
            console.time('🔥 [性能优化] getIdentityViewList');
            const result = target.identityList.map((p) => {
              return {
                identity: p,
                archive: target.identityArchivesByIdentityId.get(p.id) || [],
              };
            });
            console.timeEnd('🔥 [性能优化] getIdentityViewList');
            return await Promise.resolve(result);
          },
          async getIdentityViewById(id: string): Promise<IdentityView.Type | null> {
            console.time('🔥 [性能优化] getIdentityViewById');
            const identity = target.identityList.find((i) => i.id === id);

            if (identity === undefined) {
              console.timeEnd('🔥 [性能优化] getIdentityViewById');
              return null;
            }

            const result: IdentityView.Type = {
              identity,
              archive: target.identityArchivesByIdentityId.get(id) || [],
            };

            console.timeEnd('🔥 [性能优化] getIdentityViewById');
            return await Promise.resolve(IdentityView.Schema.parse(result));
          },
          async getPostViewListByIdentityId(authorId: string): Promise<Array<PostView.Type>> {
            console.time('🔥 [性能优化] getPostViewListByIdentityId');

            // 使用索引直接获取该身份的所有帖子
            const authorPosts = target.postsByAuthorId.get(authorId) || [];

            const pvList = authorPosts.map((post) => ({
              post,
              archive: target.postArchivesByPostId.get(post.id) || [],
            }));

            const result = pvList.sort((a, b) => {
              const apa = a.archive.at(0)?.like ?? 0;
              const apb = b.archive.at(0)?.like ?? 0;
              return apb - apa;
            });

            console.timeEnd('🔥 [性能优化] getPostViewListByIdentityId');
            console.log(
              `🔥 [性能优化] getPostViewListByIdentityId 返回 ${result.length} 个帖子 (作者: ${authorId})`,
            );
            return await Promise.resolve(result);
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

                const sortedByCapturedAt = p.archive.sort(sortByCapturedAt);

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
            console.time('🔥 [性能优化] getIdentityStatisticsViewList - 总耗时');

            console.time('🔥 [性能优化] getIdentityViewList');
            const identityList = await this.getIdentityViewList();
            console.timeEnd('🔥 [性能优化] getIdentityViewList');

            console.time('🔥 [性能优化] 构建用户统计数据');
            const userStatistic = identityList.map((iv) => {
              const identityId = iv.identity.id;
              const identityName = iv.archive[iv.archive.length - 1]!.name;

              // 直接使用索引获取该身份的帖子列表，避免 O(n) 查找
              const authorPosts = target.postsByAuthorId.get(identityId) || [];

              const postViewListWithLatestArchive = authorPosts.map((post) => {
                const postArchives = target.postArchivesByPostId.get(post.id) || [];
                const latestArchive = postArchives[postArchives.length - 1];

                return {
                  post,
                  archive: latestArchive!,
                };
              });

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

            console.timeEnd('🔥 [性能优化] 构建用户统计数据');
            console.timeEnd('🔥 [性能优化] getIdentityStatisticsViewList - 总耗时');
            console.log(
              `🔥 [性能优化] getIdentityStatisticsViewList 返回 ${userStatistic.length} 个用户统计`,
            );

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

export type QueryInterface = ReturnType<typeof Query>;
