export const POINTS_PER_YUAN = 100;
export const RECHARGE_TIERS_YUAN = [500, 1000, 2000] as const;
export const RECHARGE_TIERS_POINTS = RECHARGE_TIERS_YUAN.map((yuan) => yuan * POINTS_PER_YUAN);

export function formatYuanFromFen(fen: number) {
  return `¥${(fen / 100).toFixed(2)}`;
}

export function formatPoints(points: number) {
  return `${Math.trunc(points).toLocaleString("zh-CN")} 积分`;
}

export function pointsFromYuan(yuan: number) {
  return Math.round(yuan * POINTS_PER_YUAN);
}
