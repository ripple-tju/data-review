import { z } from 'zod';
import { v4 } from 'uuid';
import { Identity, IdentityArchive, Post, PostArchive } from 'src/specification';
// import { generateMock } from '@anatine/zod-mock';
import { sortByCreatedAt, getRangeValue } from './utils';
import { IDENTITY_LIST } from 'src/specification/IdentityData';
// export const avatarImgModules = import.meta.glob('assets/avatars/*.{jpg,png}', {
// 	eager: true,
// 	as: 'url',
// });
// console.log(avatarImgModules);
// import { avatarImgModules } from 'src/backend/transform';

export const RippleFormat = z.object({
  capturedAt: z.string(),
  createdAt: z.string(),
  // capturedAt: z.date(),
  // createdAt: z.date(),
  comment: z.number().nullable(),
  content: z.string().optional(),
  id: z.string(),
  identityId: z.string(),
  plainId: z.string(),
  play: z.number().nullable(),
  react: z.number().nullable(),
  share: z.number().nullable(),
  title: z.string().nullable(),
  url: z.string(),
  view: z.number().nullable(),
});

export type EntityData = {
  identity: Identity.Type;
  identityArchive: IdentityArchive.Type;
  postList: Array<Post.Type>;
  postArchiveList: Array<PostArchive.Type>;
};

function parseRawData(PeriodData: unknown) {
  const array = z.array(z.any()).parse(PeriodData);

  const rawList = array
    .slice(0, 5000) // Limit to 1000 items for performance
    .map((i) => {
      try {
        return RippleFormat.parse(i);
      } catch (e) {
        console.error('Invalid data', e, i);
        return null;
      }
    })
    .filter((item) => item !== null);

  return rawList;
}

function transformData(data: Array<z.infer<typeof RippleFormat>>): Array<EntityData> {
  const rawList = data.filter((item) => item !== null);

  const withUUID = rawList.map((r) => {
    return RippleFormat.parse(r);
  });

  const createdAt = new Date();
  const groupByUser = Object.groupBy(withUUID, (i) => i.identityId);
  const entityList = Object.keys(groupByUser).map((userId) => {
    const group = groupByUser[userId]!;
    const identityId = group[0]!.identityId;
    const identity = IDENTITY_LIST.find((i) => i.id === identityId);

    if (!identity) {
      throw new Error('Identity not found for id: ' + identityId);
    }

    const identityWithUUID: Identity.Type = {
      id: identityId,
      // createdAt: group[0]!.createdAt,
      createdAt: createdAt,
    };

    const identityArchive: IdentityArchive.Type = {
      id: v4(),
      // createdAt: group[0]!.createdAt,
      capturedAt: createdAt,
      createdAt: createdAt,
      // identity: identityWithUUID.uuid,
      identity: identityWithUUID.id,
      name: identity.name,
      // avatar: generateMock(
      //   z.object({
      //     avatar: z.string(),
      //   }),
      // ).avatar,
      avatar: `https://api.dicebear.com/5.x/initials/svg?seed=${identity.name}`,
      // follower: 0,
      // following: 0,
      follower: Math.floor(Math.random() * 1000),
      following: Math.floor(Math.random() * 1000),
      post: group.length,
    };

    const { postList, postArchiveList } = group.reduce<{
      postList: Array<Post.Type>;
      postArchiveList: Array<PostArchive.Type>;
    }>(
      (acc, item) => {
        const postWithUUID: Post.Type = {
          id: item.id,
          createdAt: new Date(item.createdAt),
          author: identityWithUUID.id,
          // root: postUUID,
          // parent: postUUID,
          root: item.id,
          parent: item.id,
        };

        const postArchive: PostArchive.Type = {
          id: item.id,
          // createdAt: item.capturedAt,
          createdAt: new Date(item.createdAt),
          capturedAt: new Date(item.capturedAt),
          content: item.content ?? '',
          like: item.react ?? 0,
          comment: item.comment ?? 0,
          share: item.share ?? 0,
          //no data for favorite
          favorite: 0,
          post: postWithUUID.id,
          view: item.view ?? 0,
        };

        const existPost = acc.postList.find((i) => i.id === postWithUUID.id);
        if (!existPost) {
          acc.postList.push(Post.Schema.parse(postWithUUID));

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
      identity: Identity.Schema.parse(identityWithUUID),
      identityArchive: IdentityArchive.Schema.parse(identityArchive),
      postList,
      postArchiveList,
    };
  });

  return entityList;
}

function parseData(entityList: Array<EntityData>): {
  identityList: Array<Identity.Type>;
  postList: Array<Post.Type>;
  identityArchiveList: Array<IdentityArchive.Type>;
  postArchiveList: Array<PostArchive.Type>;
} {
  const { identityList, postList, identityArchiveList, postArchiveList } = entityList.reduce<{
    identityList: Array<Identity.Type>;
    postList: Array<Post.Type>;
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

export function parseForQuery(PeriodData: unknown) {
  const parsedData = parseRawData(PeriodData);
  const transformedData = transformData(parsedData);

  console.time('divideByDay');
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

export function parseRippleForQuery(sliceData: unknown) {
  const parsedData = parseRawData(sliceData);
  const transformedData = transformData(parsedData);

  console.time('divideByDay');
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
