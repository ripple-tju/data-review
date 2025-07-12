import dayjs from 'dayjs';

// export const getDateStrList = <D extends string | Date>(input: {
// 	from: D;
// 	to: string | Date;
// }): Array<string> => {
// 	const from = new Date(input.from);
// 	const to = new Date(input.to);

// 	const dateStrList: Array<string> = [];
// 	const current = new Date(from);

// 	while (current <= to) {
// 		dateStrList.push(dayjs(current).format('YYYY-MM-DD'));
// 		current.setDate(current.getDate() + 1);
// 	}

// 	return dateStrList;
// };

const defaultGetDateStr = <T extends { createdAt: Date }>(item: T) =>
	dayjs(item.createdAt).format('YYYY-MM-DD');

export const getDateStrList = <D extends string | Date>(range: {
	from: D;
	to: D;
}): Array<string> => {
	const from = dayjs(range.from);
	const to = dayjs(range.to);
	const diffDays = to.diff(from, 'day') + 1;

	return Array.from({ length: diffDays }, (_, index) =>
		from.add(index, 'day').format('YYYY-MM-DD'),
	);
};

export const divideByDay = <T extends { createdAt: Date }>(
	list: Array<T>,
	getDateStr: (item: T) => string = defaultGetDateStr,
) => {
	const groupByed = Object.groupBy(list, (item) => getDateStr(item));
	return Object.entries(groupByed).map(([date, itemList]) => ({
		date,
		itemList,
	}));
};

export const getRangeValue = <T extends { createdAt: Date }, D extends string | Date>(
	list: Array<T>,
	range: {
		from: D;
		to: D;
	},
	getDateStr: (item: T) => string = defaultGetDateStr,
) => {
	const dateStrList = getDateStrList(range);
	const divided = divideByDay(list, getDateStr);

	return dateStrList.map((dateStr) => {
		const items = divided.find((item) => item.date === dateStr)?.itemList || [];
		return {
			date: dateStr,
			length: items.length,
			itemList: items,
		};
	});
};

export const sortByCreatedAt = <T extends { createdAt: Date }>(
	a: T,
	b: T,
	getter: (item: T) => number = (item) => item.createdAt.getTime(),
) => {
	return getter(b) - getter(a);
};
