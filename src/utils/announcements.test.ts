import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnnouncement,
  filterAnnouncements,
  getUnreadAnnouncementCount,
  isAnnouncementUnread,
  isSafeExternalUrl,
  normalizeAnnouncementCategory,
  sortAnnouncementsNewestFirst,
} from './announcements.ts';
import type { AdminAnnouncement } from '../types.ts';

describe('announcements domain utilities', () => {
  it('validates http and https external URLs safely and rejects javascript:/data:', () => {
    assert.equal(isSafeExternalUrl('https://basharcloud.com/offer'), true);
    assert.equal(isSafeExternalUrl('http://example.com'), true);
    assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
    assert.equal(isSafeExternalUrl('data:text/html,<script>'), false);
    assert.equal(isSafeExternalUrl('not-a-url'), false);
    assert.equal(isSafeExternalUrl(''), false);
  });

  it('builds valid announcements and enforces title, message, and URL rules', () => {
    const ad = buildAnnouncement({
      title: '  ঈদ স্পেশাল ক্লাউড অফার  ',
      message: '  ৫০% ছাড়ে লাইফটাইম মেম্বারশিপ নিন  ',
      category: 'offer',
      actionUrl: 'https://bashar.cloud/promo',
      actionLabel: '',
      now: 1700000000000,
    });

    assert.ok(ad.id.startsWith('ad-1700000000000-'));
    assert.equal(ad.title, 'ঈদ স্পেশাল ক্লাউড অফার');
    assert.equal(ad.message, '৫০% ছাড়ে লাইফটাইম মেম্বারশিপ নিন');
    assert.equal(ad.category, 'offer');
    assert.equal(ad.actionUrl, 'https://bashar.cloud/promo');
    assert.equal(ad.actionLabel, 'বিস্তারিত দেখুন');
    assert.equal(ad.createdTimestamp, 1700000000000);

    assert.throws(
      () => buildAnnouncement({ title: '  ', message: 'Hello' }),
      /শিরোনাম/
    );
    assert.throws(
      () => buildAnnouncement({ title: 'Title', message: '  ' }),
      /বিস্তারিত/
    );
    assert.throws(
      () =>
        buildAnnouncement({
          title: 'Title',
          message: 'Body',
          actionUrl: 'javascript:alert(1)',
        }),
      /https:\/\//
    );
  });

  it('sorts newest first and deduplicates by id', () => {
    const older: AdminAnnouncement = {
      id: 'ad-1',
      title: 'First',
      message: 'Old',
      category: 'general',
      createdAt: 'Jan 1',
      createdTimestamp: 1000,
    };
    const newer: AdminAnnouncement = {
      id: 'ad-2',
      title: 'Second',
      message: 'New',
      category: 'important',
      createdAt: 'Jan 2',
      createdTimestamp: 5000,
    };
    const dupOlder: AdminAnnouncement = { ...older, title: 'Dup' };

    const sorted = sortAnnouncementsNewestFirst([older, newer, dupOlder]);
    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'ad-2');
    assert.equal(sorted[1].id, 'ad-1');
  });

  it('computes unread counts and filters by unread status & search query across title, body, category', () => {
    const list: AdminAnnouncement[] = [
      {
        id: 'ad-1',
        title: 'সার্ভার আপগ্রেড সম্পন্ন',
        message: 'নতুন AI ফিচার চালু হয়েছে',
        category: 'update',
        createdAt: '10:00',
        createdTimestamp: 2000,
      },
      {
        id: 'ad-2',
        title: 'ফ্ল্যাশ অফার',
        message: 'আজকের জন্য বিশেষ ছাড়',
        category: 'offer',
        createdAt: '11:00',
        createdTimestamp: 5000,
      },
    ];

    assert.equal(isAnnouncementUnread(list[0], 3000), false);
    assert.equal(isAnnouncementUnread(list[1], 3000), true);
    assert.equal(getUnreadAnnouncementCount(list, 3000), 1);
    assert.equal(getUnreadAnnouncementCount(list, 5000), 0);

    const unreadOnly = filterAnnouncements(list, {
      filter: 'unread',
      lastReadTimestamp: 3000,
    });
    assert.deepEqual(
      unreadOnly.map((a) => a.id),
      ['ad-2']
    );

    const byMessage = filterAnnouncements(list, { query: 'AI ফিচার' });
    assert.deepEqual(
      byMessage.map((a) => a.id),
      ['ad-1']
    );

    const byCategory = filterAnnouncements(list, { query: 'প্রমোশন' });
    assert.deepEqual(
      byCategory.map((a) => a.id),
      ['ad-2']
    );

    assert.equal(normalizeAnnouncementCategory('unknown'), 'general');
  });
});
