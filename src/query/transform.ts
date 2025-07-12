import { z } from 'zod';

import { v4 } from 'uuid';
import { Identity, IdentityArchive, Post, PostArchive } from 'src/specification';
// import { generateMock } from '@anatine/zod-mock';
import { sortByCreatedAt, getRangeValue } from './utils';
// export const avatarImgModules = import.meta.glob('assets/avatars/*.{jpg,png}', {
// 	eager: true,
// 	as: 'url',
// });
// console.log(avatarImgModules);
// import { avatarImgModules } from 'src/backend/transform';

const IdentityWithUUID = Identity.Schema.extend({
  uuid: z.string(),
  createdAt: z.date(),
});

const PostWithUUID = Post.Schema.extend({
  uuid: z.string(),
  createdAt: z.date(),
});

export const RawPeriodData = z.object({
  id: z.string(),
  capturedAt: z.string(),
  createdAt: z.string(),
  content: z.string().optional(),
  url: z.string(),
  index: z.object({
    like: z.number().nullable(),
    comment: z.number().nullable(),
    share: z.number().nullable(),
    read: z.number().nullable(),
    favorite: z.number().nullable(),
  }),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const RawPeriodDataWithUUID = RawPeriodData.extend({
  uuid: z.string(),
  capturedAt: z.date(),
  createdAt: z.date(),
  index: z.object({
    like: z.number().default(0).nullable(),
    comment: z.number().default(0).nullable(),
    share: z.number().default(0).nullable(),
    read: z.number().default(0).nullable(),
    favorite: z.number().default(0).nullable(),
  }),
});

type EntityData = {
  identity: z.infer<typeof IdentityWithUUID>;
  identityArchive: IdentityArchive.Type;
  postList: Array<z.infer<typeof PostWithUUID>>;
  postArchiveList: Array<PostArchive.Type>;
};

function parseRawData(PeriodData: unknown) {
  const array = z.array(z.any()).parse(PeriodData);

  const rawList = array
    .map((i) => {
      try {
        return RawPeriodData.parse(i);
      } catch (e) {
        console.error('Invalid data', e, i);
        return null;
      }
    })
    .filter((item) => item !== null);

  return rawList;
}

function transformData(data: Array<z.infer<typeof RawPeriodData>>): Array<EntityData> {
  const rawList = data.filter((item) => item !== null);

  const withUUID = rawList.map((r) => {
    return RawPeriodDataWithUUID.parse({
      ...r,
      capturedAt: new Date(r.capturedAt),
      createdAt: new Date(r.createdAt),
      uuid: v4(),
    });
  });

  const createdAt = new Date();
  const groupByUser = Object.groupBy(withUUID, (i) => i.author.id);
  const entityList = Object.keys(groupByUser).map((userId) => {
    const group = groupByUser[userId]!;
    const user = group[0]!.author;

    const identityWithUUID: z.infer<typeof IdentityWithUUID> = {
      id: user.id,
      uuid: v4(),
      // createdAt: group[0]!.createdAt,
      createdAt: createdAt,
    };

    const identityArchive: IdentityArchive.Type = {
      id: v4(),
      // createdAt: group[0]!.createdAt,
      createdAt: createdAt,
      // identity: identityWithUUID.uuid,
      identity: identityWithUUID.id,
      name: user.name,
      // avatar: generateMock(
      //   z.object({
      //     avatar: z.string(),
      //   }),
      // ).avatar,
      avatar: `https://api.dicebear.com/5.x/initials/svg?seed=${user.name}`,
      // follower: 0,
      // following: 0,
      follower: Math.floor(Math.random() * 1000),
      following: Math.floor(Math.random() * 1000),
      post: group.length,
    };

    const { postList, postArchiveList } = group.reduce<{
      postList: Array<z.infer<typeof PostWithUUID>>;
      postArchiveList: Array<PostArchive.Type>;
    }>(
      (acc, item) => {
        const postUUID = v4();
        const postWithUUID: z.infer<typeof PostWithUUID> = {
          id: item.id,
          uuid: postUUID,
          createdAt: item.createdAt,
          author: identityWithUUID.id,
          // root: postUUID,
          // parent: postUUID,
          root: item.id,
          parent: item.id,
        };

        const postArchive: PostArchive.Type = {
          id: v4(),
          // createdAt: item.capturedAt,
          createdAt: item.capturedAt,
          content: item.content ?? '',
          like: item.index.like ?? 0,
          comment: item.index.comment ?? 0,
          share: item.index.share ?? 0,
          favorite: item.index.favorite ?? 0,
          post: postWithUUID.id,
          view: item.index.read ?? 0,
        };

        const existPost = acc.postList.find((i) => i.id === postWithUUID.id);
        if (!existPost) {
          acc.postList.push(PostWithUUID.parse(postWithUUID));

          // push pa with new post id
        } else {
          // push pa with exist post id
        }

        acc.postArchiveList.push(PostArchive.Schema.parse(postArchive));

        return acc;
      },
      {
        postList: [],
        postArchiveList: [],
      },
    );

    return {
      identity: IdentityWithUUID.parse(identityWithUUID),
      identityArchive: IdentityArchive.Schema.parse(identityArchive),
      postList,
      postArchiveList,
    };
  });

  return entityList;
}

function parseData(entityList: Array<EntityData>): {
  identityList: Array<z.infer<typeof IdentityWithUUID>>;
  postList: Array<z.infer<typeof PostWithUUID>>;
  identityArchiveList: Array<IdentityArchive.Type>;
  postArchiveList: Array<PostArchive.Type>;
} {
  const { identityList, postList, identityArchiveList, postArchiveList } = entityList.reduce<{
    identityList: Array<z.infer<typeof IdentityWithUUID>>;
    postList: Array<z.infer<typeof PostWithUUID>>;
    identityArchiveList: Array<IdentityArchive.Type>;
    postArchiveList: Array<PostArchive.Type>;
  }>(
    (acc, item) => {
      acc.identityList.push(item.identity);
      acc.postList.push(...item.postList);
      acc.identityArchiveList.push(item.identityArchive);
      acc.postArchiveList.push(...item.postArchiveList);

      return acc;
    },
    {
      identityList: [],
      postList: [],
      identityArchiveList: [],
      postArchiveList: [],
    },
  );

  return {
    identityList: identityList.map((i) => {
      return {
        ...i,
        // id: i.uuid,
      };
    }),
    postList: postList.map((i) => {
      return {
        ...i,
        // id: i.uuid,
      };
    }),
    identityArchiveList,
    postArchiveList,
  };
}

// const parsedData1 = parseRawData(PeriodData1);
// const parsedData2 = parseRawData(PeriodData2);
// const parsedData3 = parseRawData(PeriodData3);
// const parsedData4 = parseRawData(PeriodData4);
// const parsedData5 = parseRawData(PeriodData5);
// const parsedData6 = parseRawData(PeriodData6);
// const parsedData = [
//   ...parsedData1,
//   ...parsedData2,
//   ...parsedData3,
//   ...parsedData4,
//   ...parsedData5,
//   ...parsedData6,
// ];

export function parseForQuery(PeriodData: unknown) {
  const parsedData = parseRawData(PeriodData);

  console.time('divideByDay');
  const transformedData = transformData(parsedData);
  const sorted = parsedData
    .map((i) => ({ ...i, createdAt: new Date(i.capturedAt) }))
    .sort(sortByCreatedAt);

  const firstCreatedAt = sorted.at(-1)?.createdAt;
  const lastCreatedAt = sorted.at(0)?.createdAt;

  const data = parseData(transformedData);
  console.log(
    'Data parsed successfully',
    data,
    firstCreatedAt,
    getRangeValue(
      parsedData.map((i) => ({ ...i, createdAt: new Date(i.capturedAt) })),
      {
        from: firstCreatedAt ?? new Date(),
        to: new Date(),
      },
    ),
  );
  console.timeEnd('divideByDay');

  return { data, firstCreatedAt, lastCreatedAt };
}
