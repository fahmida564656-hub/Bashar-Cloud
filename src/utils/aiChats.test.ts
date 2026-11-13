import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CHAT_TITLE,
  createAiThread,
  sortAiThreads,
  togglePinAiThread,
  renameAiThread,
  deleteAiThread,
  appendMessageToThread,
  updateMessageInThread,
  deriveThreadTitleFromPrompt,
  mergeAiThreads,
  filterAiThreads,
} from './aiChats';

test('deriveThreadTitleFromPrompt trims whitespace and caps length cleanly', () => {
  assert.equal(deriveThreadTitleFromPrompt('   '), DEFAULT_CHAT_TITLE);
  assert.equal(deriveThreadTitleFromPrompt('Write a React hook'), 'Write a React hook');
  const longText = 'ক্লাউড স্টোরেজ সিকিউরিটি এবং ব্যাকআপ নিয়ে বিস্তারিত একটি গাইড তৈরি করে দাও দয়া করে';
  const derived = deriveThreadTitleFromPrompt(longText);
  assert.ok(derived.endsWith('...'));
  assert.ok(derived.length <= 45);
});

test('togglePinAiThread moves pinned threads above unpinned threads and restores order on unpin', () => {
  const t1 = createAiThread({ id: 'c1', title: 'First', now: 1000 });
  const t2 = createAiThread({ id: 'c2', title: 'Second', now: 2000 });
  const t3 = createAiThread({ id: 'c3', title: 'Third', now: 3000 });

  let list = sortAiThreads([t1, t2, t3]);
  assert.deepEqual(
    list.map((t) => t.id),
    ['c3', 'c2', 'c1']
  );

  // Pin oldest thread -> moves to top
  list = togglePinAiThread(list, 'c1', 4000);
  assert.equal(list[0].id, 'c1');
  assert.equal(list[0].pinned, true);

  // Pin second thread later -> moves ahead of c1
  list = togglePinAiThread(list, 'c2', 5000);
  assert.deepEqual(
    list.map((t) => t.id),
    ['c2', 'c1', 'c3']
  );

  // Unpin c2 -> drops back into unpinned order (c2 updatedAt 5000 > c3 updatedAt 3000)
  list = togglePinAiThread(list, 'c2', 6000);
  assert.equal(list[0].id, 'c1');
  assert.equal(list[1].id, 'c2');
});

test('renameAiThread updates thread title and rejects blank titles', () => {
  const t1 = createAiThread({ id: 'c1', title: DEFAULT_CHAT_TITLE, now: 1000 });
  const renamed = renameAiThread([t1], 'c1', '  Python   Automation Script  ', 2000);
  assert.equal(renamed[0].title, 'Python Automation Script');

  const unchanged = renameAiThread(renamed, 'c1', '   ', 3000);
  assert.equal(unchanged[0].title, 'Python Automation Script');
});

test('appendMessageToThread auto-titles default chat on first user message only', () => {
  const t1 = createAiThread({ id: 'c1', now: 1000 });
  const withUser = appendMessageToThread([t1], 'c1', {
    id: 'm1',
    role: 'user',
    text: 'বাংলার ইতিহাস সম্পর্কে বলো',
    createdAt: 1500,
  });
  assert.equal(withUser[0].title, 'বাংলার ইতিহাস সম্পর্কে বলো');
  assert.equal(withUser[0].messages.length, 1);

  // Subsequent rename is preserved on next user message
  const customNamed = renameAiThread(withUser, 'c1', 'History Notes', 1600);
  const withSecond = appendMessageToThread(customNamed, 'c1', {
    id: 'm2',
    role: 'user',
    text: 'দ্বিতীয় প্রশ্ন',
    createdAt: 1700,
  });
  assert.equal(withSecond[0].title, 'History Notes');
});

test('updateMessageInThread updates streaming reply cleanly without mutating other messages', () => {
  const t1 = createAiThread({ id: 'c1', now: 1000 });
  let list = appendMessageToThread([t1], 'c1', {
    id: 'm1',
    role: 'user',
    text: 'Hi',
    createdAt: 1100,
  });
  list = appendMessageToThread(list, 'c1', {
    id: 'm2',
    role: 'model',
    text: 'Hello',
    createdAt: 1200,
  });
  list = updateMessageInThread(list, 'c1', 'm2', (msg) => ({
    ...msg,
    text: `${msg.text}, how can I help?`,
  }));
  assert.equal(list[0].messages[1].text, 'Hello, how can I help?');
  assert.equal(list[0].messages[0].text, 'Hi');
});

test('mergeAiThreads combines cloud and local chats without losing newer updates or pins', () => {
  const localChat = createAiThread({ id: 'c1', title: 'Local Rename', pinned: true, now: 3000 });
  const cloudOld = createAiThread({ id: 'c1', title: 'Old Cloud Title', pinned: false, now: 1000 });
  const cloudOnly = createAiThread({ id: 'c2', title: 'Another Device Chat', now: 2500 });

  const merged = mergeAiThreads([cloudOld, cloudOnly], [localChat]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'c1');
  assert.equal(merged[0].title, 'Local Rename');
  assert.equal(merged[0].pinned, true);
});

test('deleteAiThread and filterAiThreads work accurately', () => {
  const a = createAiThread({ id: 'a', title: 'React Dashboard', now: 1000 });
  const b = createAiThread({ id: 'b', title: 'Math Algebra', now: 2000 });

  assert.equal(filterAiThreads([a, b], 'react').length, 1);
  assert.equal(deleteAiThread([a, b], 'a').length, 1);
});
