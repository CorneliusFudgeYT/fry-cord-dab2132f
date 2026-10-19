export const VIP_COST = 1000;
export const DAILY_POINTS = 50;
export const THEMES = ['dark', 'light', 'blue', 'green', 'yellow'] as const;
export const LANGUAGES = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch']] as const;
export const REGIONS = [['other', 'UTC / Other'], ['americas', 'Americas'], ['europe', 'Europe'], ['asia', 'Asia'], ['oceania', 'Oceania']] as const;
export type Rank = 'owner' | 'admin' | 'developer' | 'vip' | 'youtuber' | 'tiktoker' | 'streamer';
export function isStaffRank(rank: string) { return ['owner', 'admin', 'developer'].includes(rank); }
export function spamError(content: string, authors: string[], me: string) {
  const words = content.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (words.some((word, i) => i > 0 && word === words[i - 1])) return 'Do not repeat a word twice in a row.';
  if (authors.length >= 5 && authors.slice(-5).every(id => id === me)) return 'Wait for someone else after 5 messages.';
  return null;
}
export function qualifies(kind: 'youtuber' | 'tiktoker', followers: number, likes: number, views: number) {
  return kind === 'youtuber' ? followers >= 50 && views >= 10000 : followers >= 10 && likes >= 25;
}
