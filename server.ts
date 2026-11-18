import 'dotenv/config';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';
import {
  resolveGeminiApiKey,
  normalizeAiHistory,
  buildUserParts,
  buildSystemInstruction,
  buildModelAttemptPlan,
  withTimeout,
  type AiAttachmentInput,
  type AiCloudSummaryInput,
  type AiModeType,
} from './src/utils/aiServerHelpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
}

interface IncomingHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface IncomingChatPayload {
  message?: string;
  history?: IncomingHistoryItem[];
  mode?: AiModeType;
  userName?: string;
  stream?: boolean;
  attachment?: AiAttachmentInput | null;
  cloudSummary?: AiCloudSummaryInput | null;
}

const THINKING_LEVEL_MAP: Record<
  'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH' | 'MINIMAL',
  ThinkingLevel
> = {
  MINIMAL: ThinkingLevel.MINIMAL,
  LOW: ThinkingLevel.LOW,
  MEDIUM: ThinkingLevel.MEDIUM,
  HIGH: ThinkingLevel.HIGH,
  XHIGH: ThinkingLevel.XHIGH,
};

async function awaitStreamFirstChunk(
  stream: AsyncIterable<GenerateContentResponse>,
  timeoutMs: number,
  label: string
): Promise<{
  iterator: AsyncIterator<GenerateContentResponse>;
  firstChunk: IteratorResult<GenerateContentResponse>;
}> {
  const iterator = stream[Symbol.asyncIterator]();
  try {
    const firstChunk = await withTimeout(iterator.next(), timeoutMs, `${label} first chunk`);
    return { iterator, firstChunk };
  } catch (err) {
    iterator.return?.().catch(() => {});
    throw err;
  }
}

function formatGeminiError(err: unknown, hasApiKey: boolean): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown AI error');
  const lower = raw.toLowerCase();

  if (!hasApiKey) {
    return {
      status: 500,
      message:
        'GEMINI_API_KEY পাওয়া যায়নি। অনুগ্রহ করে Settings > Secrets প্যানেলে আপনার API Key যোগ করুন অথবা যাচাই করুন।',
    };
  }

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    return {
      status: 403,
      message:
        'API Key সঠিক নয় বা অনুমতি নেই। অনুগ্রহ করে Settings > Secrets প্যানেলে আপনার GEMINI_API_KEY যাচাই করুন।',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'API ব্যবহারের সীমা (Quota/Rate limit) সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা Fast মোড ব্যবহার করুন।',
    };
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: 'নির্বাচিত AI মডেলটি পাওয়া যায়নি। অনুগ্রহ করে General বা Fast মোডে চেষ্টা করুন।',
    };
  }

  if (lower.includes('unavailable') || lower.includes('503') || lower.includes('high demand') || lower.includes('overloaded')) {
    return {
      status: 503,
      message:
        'এই মুহূর্তে AI সার্ভারে সাময়িকভাবে অতিরিক্ত চাপ রয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার Retry করুন বা Fast মোড চেষ্টা করুন।',
    };
  }

  if (lower.includes('timed out')) {
    return {
      status: 504,
      message:
        'AI সার্ভার থেকে উত্তর আসতে বেশি সময় লাগছে। অনুগ্রহ করে আবার Retry করুন অথবা Fast মোড ব্যবহার করুন।',
    };
  }

  return {
    status: 500,
    message: `AI উত্তর তৈরি করতে সমস্যা হয়েছে: ${raw}`,
  };
}

function isAuthOrQuotaError(err: unknown): boolean {
  const raw = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return (
    raw.includes('api_key_invalid') ||
    raw.includes('api key not valid') ||
    raw.includes('permission_denied') ||
    raw.includes('401') ||
    raw.includes('403') ||
    raw.includes('resource_exhausted') ||
    raw.includes('quota')
  );
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  let hydrogenCooldownUntil = 0;

  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = resolveGeminiApiKey(process.env);
    res.json({
      ok: true,
      service: 'bashar-cloud-ai',
      hasApiKey: Boolean(apiKey),
    });
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const body = (req.body || {}) as IncomingChatPayload;
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      res.status(400).json({ error: 'অনুগ্রহ করে একটি প্রশ্ন বা বার্তা লিখুন।' });
      return;
    }

    const apiKey = resolveGeminiApiKey(process.env);
    if (!apiKey) {
      const errInfo = formatGeminiError(new Error('Missing GEMINI_API_KEY'), false);
      res.status(errInfo.status).json({ error: errInfo.message });
      return;
    }

    const attempts = buildModelAttemptPlan(body.mode, {
      skipHydrogen: Date.now() < hydrogenCooldownUntil,
    });
    const systemInstruction = buildSystemInstruction(body.userName, body.cloudSummary);
    const historyItems = normalizeAiHistory(body.history, 24);
    const wantsStream = body.stream !== false;
    const userParts = buildUserParts(rawMessage, body.attachment);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const runChatOnce = async (
      targetModel: string,
      thinkingLevel: ThinkingLevel | undefined,
      timeoutMs: number
    ) => {
      const chat = ai.chats.create({
        model: targetModel,
        history: historyItems,
        config: thinkingLevel
          ? {
              systemInstruction,
              thinkingConfig: { thinkingLevel },
            }
          : { systemInstruction },
      });
      const result = await withTimeout(
        chat.sendMessage({ message: userParts }),
        timeoutMs,
        targetModel
      );
      return result.text || '';
    };

    const runGenerateFallback = async (targetModel: string, timeoutMs = 20000) => {
      const contents = [
        ...historyItems,
        { role: 'user' as const, parts: userParts },
      ];
      const result = await withTimeout(
        ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        }),
        timeoutMs,
        `${targetModel} direct`
      );
      return result.text || '';
    };

    // Non-streaming JSON mode (proxy-proof fallback)
    if (!wantsStream) {
      let lastError: unknown = null;
      for (const attempt of attempts) {
        try {
          const thinkingLevel = attempt.thinkingLevelName
            ? THINKING_LEVEL_MAP[attempt.thinkingLevelName]
            : undefined;
          const reply = await runChatOnce(attempt.targetModel, thinkingLevel, attempt.timeoutMs);
          if (reply.trim()) {
            if (attempt.targetModel === 'gemini-4-hydrogen') {
              hydrogenCooldownUntil = 0;
            }
            res.json({ reply, model: attempt.targetModel });
            return;
          }
        } catch (err) {
          lastError = err;
          console.warn(
            `[Bashar AI] ${attempt.targetModel} JSON attempt failed:`,
            err instanceof Error ? err.message : err
          );
          if (isAuthOrQuotaError(err)) break;
          if (attempt.targetModel === 'gemini-4-hydrogen') {
            hydrogenCooldownUntil = Date.now() + 60_000;
          }
        }
      }

      if (!isAuthOrQuotaError(lastError)) {
        try {
          const directReply = await runGenerateFallback('gemini-3.1-flash-lite', 20000);
          if (directReply.trim()) {
            res.json({ reply: directReply, model: 'gemini-3.1-flash-lite' });
            return;
          }
        } catch (err) {
          lastError = lastError || err;
        }
      }

      const formatted = formatGeminiError(lastError || new Error('Empty AI reply'), true);
      res.status(formatted.status).json({ error: formatted.message });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let closed = false;
    const keepAliveTimer = setInterval(() => {
      if (!closed && !res.writableEnded) {
        res.write(': ping\n\n');
      }
    }, 7000);

    res.on('close', () => {
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) {
        closed = true;
      }
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      if (closed || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const startStream = async (
        targetModel: string,
        thinkingLevel: ThinkingLevel | undefined,
        timeoutMs: number
      ) => {
        const chat = ai.chats.create({
          model: targetModel,
          history: historyItems,
          config: thinkingLevel
            ? {
                systemInstruction,
                thinkingConfig: { thinkingLevel },
              }
            : { systemInstruction },
        });
        const stream = await withTimeout(
          chat.sendMessageStream({ message: userParts }),
          timeoutMs,
          `${targetModel} init`
        );
        return awaitStreamFirstChunk(stream, timeoutMs, targetModel);
      };

      let activeModel: string = attempts[0].targetModel;
      let activeIterator: AsyncIterator<GenerateContentResponse> | null = null;
      let firstChunk: IteratorResult<GenerateContentResponse> | null = null;
      let lastStreamErr: unknown = null;

      for (const attempt of attempts) {
        if (closed) break;
        try {
          activeModel = attempt.targetModel;
          const thinkingLevel = attempt.thinkingLevelName
            ? THINKING_LEVEL_MAP[attempt.thinkingLevelName]
            : undefined;
          const started = await startStream(attempt.targetModel, thinkingLevel, attempt.timeoutMs);
          activeIterator = started.iterator;
          firstChunk = started.firstChunk;
          if (attempt.targetModel === 'gemini-4-hydrogen') {
            hydrogenCooldownUntil = 0;
          }
          break;
        } catch (err) {
          lastStreamErr = err;
          console.warn(
            `[Bashar AI] ${attempt.targetModel} stream attempt failed:`,
            err instanceof Error ? err.message : err
          );
          if (isAuthOrQuotaError(err)) {
            throw err;
          }
          if (attempt.targetModel === 'gemini-4-hydrogen') {
            hydrogenCooldownUntil = Date.now() + 60_000;
          }
        }
      }

      if (closed) {
        activeIterator?.return?.().catch(() => {});
        if (!res.writableEnded) res.end();
        return;
      }

      if (!activeIterator || !firstChunk) {
        // Last-resort non-streamed generateContent returned over SSE
        const fallbackReply = await runGenerateFallback('gemini-3.1-flash-lite', 20000);
        if (!fallbackReply.trim()) {
          throw lastStreamErr || new Error('Empty AI response');
        }
        sendEvent({ type: 'meta', model: 'gemini-3.1-flash-lite' });
        sendEvent({ type: 'chunk', text: fallbackReply, model: 'gemini-3.1-flash-lite' });
        sendEvent({ type: 'done', model: 'gemini-3.1-flash-lite' });
        if (!res.writableEnded) res.end();
        return;
      }

      sendEvent({ type: 'meta', model: activeModel });

      let accumulated = '';

      if (!firstChunk.done) {
        const firstText = firstChunk.value?.text || '';
        if (firstText) {
          accumulated += firstText;
          sendEvent({ type: 'chunk', text: firstText, model: activeModel });
        }

        while (!closed) {
          const nextChunk = await withTimeout(
            activeIterator.next(),
            25000,
            `${activeModel} chunk`
          );
          if (nextChunk.done) break;
          const chunkText = nextChunk.value?.text || '';
          if (chunkText) {
            accumulated += chunkText;
            sendEvent({ type: 'chunk', text: chunkText, model: activeModel });
          }
        }
      }

      if (closed) {
        activeIterator.return?.().catch(() => {});
        if (!res.writableEnded) res.end();
        return;
      }

      if (!accumulated.trim()) {
        const backupText = await runGenerateFallback('gemini-3.1-flash-lite', 20000).catch(() => '');
        if (backupText.trim()) {
          sendEvent({ type: 'meta', model: 'gemini-3.1-flash-lite' });
          sendEvent({ type: 'chunk', text: backupText, model: 'gemini-3.1-flash-lite' });
          sendEvent({ type: 'done', model: 'gemini-3.1-flash-lite' });
        } else {
          sendEvent({
            type: 'error',
            error: 'AI কোনো উত্তর প্রদান করেনি। অনুগ্রহ করে প্রশ্নটি একটু স্পষ্ট করে আবার চেষ্টা করুন।',
          });
        }
      } else {
        sendEvent({ type: 'done', model: activeModel });
      }
      if (!res.writableEnded) res.end();
    } catch (err) {
      const formatted = formatGeminiError(err, true);
      console.error('Bashar Cloud AI error:', err);
      sendEvent({ type: 'error', error: formatted.message });
      if (!res.writableEnded) {
        res.end();
      }
    } finally {
      clearInterval(keepAliveTimer);
    }
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint পাওয়া যায়নি।' });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distDir, 'index.html'));
  let useViteDev = !(process.env.NODE_ENV === 'production' && hasBuiltDist);

  if (useViteDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      useViteDev = false;
    }
  }

  if (!useViteDev) {
    if (hasBuiltDist) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      app.get('*', (_req: Request, res: Response) => {
        res.status(503).send('Application build (dist) is not ready yet.');
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Bashar Cloud server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
