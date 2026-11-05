import { test, expect } from 'vitest';
import { DAILY_POINTS, VIP_COST, isStaffRank, qualifies, spamError } from './community-rules';
test('daily award is 50 points', () => expect(DAILY_POINTS).toBe(50));
test('VIP costs 1000 points', () => expect(VIP_COST).toBe(1000));
test('five consecutive messages blocks a sixth', () => { expect(spamError('hi', Array(5).fill('me'), 'me')).toBeTruthy(); expect(spamError('hi', ['me','me','other','me','me'], 'me')).toBeNull(); });
test('adjacent repeated words are blocked', () => { expect(spamError('Hi hi', [], 'me')).toBeTruthy(); expect(spamError('hi there hi', [], 'me')).toBeNull(); });
test('YouTube requires 50 subscribers and 10000 views', () => { expect(qualifies('youtuber',50,0,10000)).toBe(true); expect(qualifies('youtuber',49,0,10000)).toBe(false); expect(qualifies('youtuber',50,0,9999)).toBe(false); });
test('TikTok requires 10 followers and 25 likes', () => { expect(qualifies('tiktoker',10,25,0)).toBe(true); expect(qualifies('tiktoker',9,25,0)).toBe(false); expect(qualifies('tiktoker',10,24,0)).toBe(false); });
test('only owner admin developer have staff privileges', () => { expect(['owner','admin','developer'].every(isStaffRank)).toBe(true); expect(['vip','streamer','youtuber','tiktoker'].some(isStaffRank)).toBe(false); });
