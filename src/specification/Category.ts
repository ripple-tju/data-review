import z from 'zod';

export const Schema = z.object({
  id: z.string(),
  name: z.string().optional(),
});

export type Type = z.infer<typeof Schema>;

// 一级粗粒度分类类目数据
export const Categories: Array<Type> = [
  { id: '1', name: '国际' },
  { id: '2', name: '体育' },
  { id: '3', name: '娱乐' },
  { id: '4', name: '社会' },
  { id: '5', name: '财经' },
  { id: '6', name: '时事' },
  { id: '7', name: '科技' },
  { id: '8', name: '情感' },
  { id: '9', name: '汽车' },
  { id: '10', name: '教育' },
  { id: '11', name: '时尚' },
  { id: '12', name: '游戏' },
  { id: '13', name: '军事' },
  { id: '14', name: '旅游' },
  { id: '15', name: '美食' },
  { id: '16', name: '文化' },
  { id: '17', name: '健康养生' },
  { id: '18', name: '搞笑' },
  { id: '19', name: '家居' },
  { id: '20', name: '动漫' },
  { id: '21', name: '宠物' },
  { id: '22', name: '母婴育儿' },
  { id: '23', name: '星座运势' },
  { id: '24', name: '历史' },
  { id: '25', name: '音乐' },
  { id: '26', name: '综合' },
];
