import { cut_for_search } from 'jieba-wasm';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Option } from 'effect';
type Id = string;
type Content = string;
type Word = string;

export function buildCutWordCache(
  data: Array<{ id: Id; content: Content }>,
  stopWordList: Array<Word>,
  analyzer: (text: Content) => Array<Word>,
): Array<{ id: Id; wordList: Array<Word> }> {
  return data.map((i) => {
    return {
      id: i.id,
      wordList: analyzer(i.content).filter((word) => {
        return !stopWordList.includes(word);
      }),
    };
  });
}

export function buildReverseIndex(
  cutWordCache: Array<{ id: Id; wordList: Array<Word> }>,
): Record<Word, Array<Id>> {
  const reverseIndexMap = new Map<Word, Array<Id>>();

  cutWordCache.forEach((item) => {
    item.wordList.forEach((word) => {
      if (!reverseIndexMap.has(word)) {
        reverseIndexMap.set(word, []);
      }
      reverseIndexMap.get(word)?.push(item.id);
    });
  });

  const reverseIndex = Object.fromEntries(reverseIndexMap);
  return reverseIndex;
}

export function buildAllCache(
  data: Array<{ id: Id; content: Content }>,
  stopWordList: Array<Word>,
  analyzer: (text: Content) => Array<Word> = cut_for_search,
): {
  cutWordCache: Array<{ id: Id; wordList: Array<Word> }>;
  reverseIndex: Record<Word, Array<Id>>;
} {
  const startTime = performance.now();

  console.log('Building cut word cache and reverse index...');
  console.log(`Data length: ${data.length}`);
  console.log(`Stop word list length: ${stopWordList.length}`);
  console.log(`Using analyzer: ${analyzer.name}`);

  // Step 1: Build cut word cache
  const cutWordCacheStartTime = performance.now();
  const cutWordCache = buildCutWordCache(data, stopWordList, analyzer);
  const cutWordCacheEndTime = performance.now();
  const cutWordCacheTime = cutWordCacheEndTime - cutWordCacheStartTime;

  console.log(`✅ Cut word cache built in ${cutWordCacheTime.toFixed(2)}ms`);
  console.log(
    `   Processed ${data.length} items, generated ${cutWordCache.reduce((sum, item) => sum + item.wordList.length, 0)} total words`,
  );

  // Step 2: Build reverse index
  const reverseIndexStartTime = performance.now();
  const reverseIndex = buildReverseIndex(cutWordCache);
  const reverseIndexEndTime = performance.now();
  const reverseIndexTime = reverseIndexEndTime - reverseIndexStartTime;

  console.log(`✅ Reverse index built in ${reverseIndexTime.toFixed(2)}ms`);
  console.log(`   Created index for ${Object.keys(reverseIndex).length} unique words`);

  const totalTime = performance.now() - startTime;
  console.log(`🎯 Total processing time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Cut word cache: ${((cutWordCacheTime / totalTime) * 100).toFixed(1)}%`);
  console.log(`   Reverse index: ${((reverseIndexTime / totalTime) * 100).toFixed(1)}%`);

  return {
    cutWordCache,
    reverseIndex,
  };
}

//  if not run as a module, read args from command line and run buildCutWordCache
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.argv[1] || import.meta.url !== pathToFileURL(process.argv[1]).href) {
  console.log('This module is not run as a standalone script.');
} else {
  const [dataJSONPath, stopWordJSONPath] = process.argv.slice(2);
  console.log('Arguments:', { dataJSONPath, stopWordJSONPath });

  const dataJSON = Option.fromNullable(dataJSONPath).pipe(
    Option.map((path) => resolve(__dirname, path.trim())),
    Option.map((path) => readFileSync(path, 'utf-8')),
    Option.map((content) => JSON.parse(content)),
    Option.getOrThrowWith(() => new Error(`Data JSON file not found or invalid`)),
  );

  const stopWordJSON = Option.fromNullable(stopWordJSONPath).pipe(
    Option.map((path) => resolve(__dirname, path.trim())),
    Option.map((path) => readFileSync(path, 'utf-8')),
    Option.map((content) => JSON.parse(content)),
    Option.getOrElse(() => [] as Array<Word>),
  );

  const data = dataJSON;
  const stopWordList = stopWordJSON;

  const { cutWordCache, reverseIndex } = buildAllCache(data, stopWordList);

  // 输出格式与 buildAllCache 返回格式保持一致
  const outputData = {
    cutWordCache,
    reverseIndex,
  };

  writeFileSync(resolve(__dirname, 'wordIndexCache.json'), JSON.stringify(outputData, null, 2));

  console.log(`📁 Results saved to wordIndexCache.json`);
  console.log(`   Cut word cache entries: ${cutWordCache.length}`);
  console.log(`   Reverse index entries: ${Object.keys(reverseIndex).length}`);
}
