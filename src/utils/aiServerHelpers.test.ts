import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveGeminiApiKey,
  normalizeAiHistory,
  parseSseChunks,
  parseBase64DataUrl,
  buildUserParts,
  buildCloudSummaryText,
  buildSystemInstruction,
  buildModelAttemptPlan,
  withTimeout,
} from './aiServerHelpers';

test('resolveGeminiApiKey handles whitespace, quotes, fallbacks, and ignores placeholders', () => {
  assert.equal(resolveGeminiApiKey({ GEMINI_API_KEY: '  "AIzaTestKey123"  ' }), 'AIzaTestKey123');
  assert.equal(resolveGeminiApiKey({ GEMINI_API_KEY: 'MY_GEMINI_API_KEY', API_KEY: 'AIzaFallback' }), 'AIzaFallback');
  assert.equal(resolveGeminiApiKey({ GOOGLE_API_KEY: "'AIzaGoogleKey'" }), 'AIzaGoogleKey');
  assert.equal(resolveGeminiApiKey({ GEMINI_API_KEY: '   ', API_KEY: 'undefined' }), '');
});

test('normalizeAiHistory strips leading model turns and merges consecutive same-role turns', () => {
  const normalized = normalizeAiHistory([
    { role: 'model', text: 'Welcome!' },
    { role: 'user', text: 'First question' },
    { role: 'user', text: 'Retry question' },
    { role: 'model', text: 'Answer' },
    { role: 'user', text: '   ' },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].role, 'user');
  assert.equal(normalized[0].parts[0].text, 'First question\n\nRetry question');
  assert.equal(normalized[1].role, 'model');
  assert.equal(normalized[1].parts[0].text, 'Answer');
});

test('parseSseChunks handles both LF and CRLF events and final flush without trailing blank line', () => {
  const crlf = 'data: {"type":"meta","model":"gemini-4-hydrogen"}\r\n\r\ndata: {"type":"chunk","text":"Hello"}\r\n\r\ndata: {"type":"done"}';
  const pass1 = parseSseChunks(crlf, false);
  assert.equal(pass1.events.length, 2);
  assert.equal(pass1.events[1].text, 'Hello');
  assert.equal(pass1.remainder, 'data: {"type":"done"}');

  const pass2 = parseSseChunks(pass1.remainder, true);
  assert.equal(pass2.events.length, 1);
  assert.equal(pass2.events[0].type, 'done');
});

test('parseBase64DataUrl validates safe image mime types and rejects malformed or SVG URLs', () => {
  const png = parseBase64DataUrl('data:image/png;base64,iVBORw0KGgo=');
  assert.deepEqual(png, { mimeType: 'image/png', data: 'iVBORw0KGgo=' });

  const jpg = parseBase64DataUrl('data:image/jpg;base64,/9j/4AAQ');
  assert.deepEqual(jpg, { mimeType: 'image/jpeg', data: '/9j/4AAQ' });

  assert.equal(parseBase64DataUrl('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(parseBase64DataUrl('not-a-data-url'), null);
});

test('buildUserParts builds multimodal parts for image attachments and snippet blocks for documents', () => {
  const imgParts = buildUserParts('এই ছবিটি বিশ্লেষণ করো', {
    name: 'receipt.png',
    imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  });
  assert.equal(imgParts.length, 2);
  assert.deepEqual(imgParts[0], { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } });
  assert.match((imgParts[1] as { text: string }).text, /\[Attached Image: receipt\.png\]/);

  const docParts = buildUserParts('সারসংক্ষেপ দাও', {
    name: 'notes.txt',
    snippet: 'Meeting at 4 PM',
  });
  assert.equal(docParts.length, 1);
  assert.match((docParts[0] as { text: string }).text, /Meeting at 4 PM/);
});

test('buildSystemInstruction includes user name and Cloud Drive summary when provided', () => {
  const summaryText = buildCloudSummaryText({
    totalFiles: 5,
    usedText: '12.4 MB',
    totalLimitGB: 1000,
    imagesCount: 2,
    videosCount: 1,
    audiosCount: 0,
    docsCount: 2,
    recentNames: ['invoice.pdf', 'photo.jpg'],
  });
  assert.match(summaryText, /5 total items, 12\.4 MB used of 1000 GB/);
  assert.match(summaryText, /invoice\.pdf, photo\.jpg/);

  const instruction = buildSystemInstruction('Bashar', {
    totalFiles: 0,
    usedText: '0 B',
    totalLimitGB: 1000,
  });
  assert.match(instruction, /Bashar/);
  assert.match(instruction, /0 total items/);
});

test('buildModelAttemptPlan provides fast bounded primary + fallback models per mode', () => {
  const fastPlan = buildModelAttemptPlan('fast');
  assert.equal(fastPlan.length, 1);
  assert.equal(fastPlan[0].targetModel, 'gemini-3.1-flash-lite');

  const generalPlan = buildModelAttemptPlan('general');
  assert.equal(generalPlan[0].targetModel, 'gemini-4-hydrogen');
  assert.ok(generalPlan[0].timeoutMs <= 5000);
  assert.equal(generalPlan[1].targetModel, 'gemini-3.1-flash-lite');

  const deepPlan = buildModelAttemptPlan('deep');
  assert.equal(deepPlan[0].targetModel, 'gemini-4-hydrogen');
  assert.equal(deepPlan[0].thinkingLevelName, 'XHIGH');
  assert.equal(deepPlan[1].targetModel, 'gemini-3.1-flash-lite');

  const cooldownPlan = buildModelAttemptPlan('general', { skipHydrogen: true });
  assert.equal(cooldownPlan.length, 1);
  assert.equal(cooldownPlan[0].targetModel, 'gemini-3.1-flash-lite');
});

test('withTimeout resolves fast promises and rejects stalled promises cleanly', async () => {
  const fast = await withTimeout(Promise.resolve('ok'), 200, 'Fast test');
  assert.equal(fast, 'ok');

  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 30, 'Slow test'),
    /Slow test timed out after 30ms/
  );
});
