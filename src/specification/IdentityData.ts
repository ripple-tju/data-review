export const IDENTITY_LIST = [
	{
		name: 'IHebei ',
		code: null,
		id: '100083100704102',
	},
	// {
	// 	name: 'Armenpress',
	// 	code: 'armenpress',
	// 	id: '100064825145251',
	// },
	// {
	// 	name: 'O\'zbekiston Milliy Axborot Agentligi',
	// 	code: 'uzauz',
	// 	id: '100063137143651',
	// },
	// {
	// 	name: 'O\'zbekiston Milliy Teleradiokompaniyasi',
	// 	code: 'mtrkuzb',
	// 	id: '100063686166793',
	// },
	// {
	// 	name: 'BERNAMA',
	// 	code: 'bernamaofficial',
	// 	id: '100064482682966',
	// },
	// {
	// 	name: '马来西亚星洲日报 Malaysia Sin Chew Daily',
	// 	code: 'SinChewDaily',
	// 	id: '100064546095888',
	// },
	// {
	// 	name: 'Liputan6',
	// 	code: 'liputan6online',
	// 	id: '100044438889371',
	// },
	{
		name: '',
		code: 'iZhejiang',
		id: '100069280626650',
	},
	{
		name: 'iHenan',
		code: null,
		id: '100088222875309',
	},
	{
		name: '',
		code: 'XH.NewsAgency',
		id: '100069119310988',
	},
	{
		name: '',
		code: 'ChinaGlobalTVNetwork',
		id: '100044504436603',
	},
	{
		name: '',
		code: 'globaltimesnews',
		id: '100064866483380',
	},
	{
		name: '',
		code: 'chinadaily',
		id: '100064427625676',
	},
	{
		name: '',
		code: 'peopledaily',
		id: '100075917005707',
	},
	{
		name: '',
		code: 'ChinaNewsService', //
		id: '100064562504975',
	},
	{
		name: '',
		code: 'EDNewsChina',
		id: '100064327914017',
	},
	{
		name: '',
		code: 'iChongqing',
		id: '100068142004605',
	},
	{
		name: '',
		code: 'hihainan1',
		id: '100063643895483',
	},
	{
		name: '',
		code: 'LoveFujian',
		id: '100069151031516',
	},
	{
		name: '',
		code: 'guangmingdailyChina',
		id: '100064918501569',
	},
	{
		name: '科技日报',
		code: null,
		id: '61564656980318',
	},
	{
		name: '',
		code: 'guangdongtoday',
		id: '100064771504427',
	},
	{
		name: '',
		code: 'ShandongprovinceChina',
		id: '100068868429456',
	},
	// {
	// 	name: '',
	// 	code: 'DateTianjin',
	// 	id: '100081284622534',
	// },
	{
		name: '',
		code: 'thesilkroadshaanxi',
		id: '100090203407308',
	},
	{
		name: 'Changsha Daily',
		code: null,
		id: '100087768736876',
	},
	{
		name: 'MeetJiangxi',
		code: 'MeetJiangxi',
		id: '61557422943484',
	},
	{
		name: 'Hello Guangxi',
		code: null,
		id: '61564200921081',
	},
	{
		name: 'Discover Gansu ',
		code: 'discovergansu',
		id: '100057359203148',
	},
	{
		name: 'This is Xinjiang',
		code: 'TianshanFairyland',
		id: '100067884776440',
	},
	{
		name: 'UP Guizhou',
		code: 'Guizhouecho',
		id: '100083225624174',
	},
	{
		name: 'Jiangsu, China',
		code: 'GoJiangsu',
		id: '100067487310312',
	},
	{
		name: 'ShanghaiEye',
		code: 'shanghaieyeSMG',
		id: '100064519369017',
	},
];

export function DetectionState() {
	return {
		last: {
			detectedAt: 0,
			url: null,
		},
	};
}

export const DAY = 24 * 60 * 60 * 1000;
export const MAX_DETECTION_TIME = 2 * DAY;

export const BASE_URL = 'https://www.facebook.com';
