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
  type AiAttachmentInput,
  type AiCloudSummaryInput,
} from './src/utils/aiServerHelpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
}

type AiMode = 'general' | 'deep' | 'fast';

interface IncomingHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface IncomingChatPayload {
  message?: string;
  history?: IncomingHistoryItem[];
  mode?: AiMode;
  userName?: string;
  stream?: boolean;
  attachment?: AiAttachmentInput | null;
  cloudSummary?: AiCloudSummaryInput | null;
}

function getModelAndThinking(mode: AiMode | undefined): {
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  thinkingLevel: ThinkingLevel;
} {
  if (mode === 'fast') {
    return {
      model: 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel.MINIMAL,
    };
  }
  if (mode === 'deep') {
    return {
      model: 'gemini-4-hydrogen',
      thinkingLevel: ThinkingLevel.XHIGH,
    };
  }
  return {
    model: 'gemini-4-hydrogen',
    thinkingLevel: ThinkingLevel.MEDIUM,
  };
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

    const { model, thinkingLevel } = getModelAndThinking(body.mode);
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

    const attempts: Array<{ targetModel: string; targetThinking?: ThinkingLevel }> = [
      { targetModel: model, targetThinking: thinkingLevel },
      { targetModel: model, targetThinking: undefined },
    ];
    if (model !== 'gemini-3.1-flash-lite') {
      attempts.push({ targetModel: 'gemini-3.1-flash-lite', targetThinking: ThinkingLevel.MINIMAL });
      attempts.push({ targetModel: 'gemini-3.1-flash-lite', targetThinking: undefined });
    }

    const runChatOnce = async (targetModel: string, targetThinking?: ThinkingLevel) => {
      const chat = ai.chats.create({
        model: targetModel,
        history: historyItems,
        config: targetThinking
          ? {
              systemInstruction,
              thinkingConfig: { thinkingLevel: targetThinking },
            }
          : { systemInstruction },
      });
      const result = await chat.sendMessage({ message: userParts });
      return result.text || '';
    };

    const runGenerateFallback = async (targetModel: string) => {
      const contents = [
        ...historyItems,
        { role: 'user' as const, parts: userParts },
      ];
      const result = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: { systemInstruction },
      });
      return result.text || '';
    };

    // Non-streaming JSON mode (proxy-proof fallback)
    if (!wantsStream) {
      let lastError: unknown = null;
      for (const attempt of attempts) {
        try {
          const reply = await runChatOnce(attempt.targetModel, attempt.targetThinking);
          if (reply.trim()) {
            res.json({ reply, model: attempt.targetModel });
            return;
          }
        } catch (err) {
          lastError = err;
          if (isAuthOrQuotaError(err)) break;
        }
      }
      try {
        const directReply = await runGenerateFallback('gemini-3.1-flash-lite');
        if (directReply.trim()) {
          res.json({ reply: directReply, model: 'gemini-3.1-flash-lite' });
          return;
        }
      } catch (err) {
        lastError = lastError || err;
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

    let closed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        closed = true;
      }
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      if (closed || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const startStream = async (targetModel: string, targetThinking?: ThinkingLevel) => {
        const chat = ai.chats.create({
          model: targetModel,
          history: historyItems,
          config: targetThinking
            ? {
                systemInstruction,
                thinkingConfig: { thinkingLevel: targetThinking },
              }
            : { systemInstruction },
        });
        return chat.sendMessageStream({ message: userParts });
      };

      let activeModel: string = model;
      let stream: AsyncIterable<GenerateContentResponse> | null = null;
      let lastStreamErr: unknown = null;

      for (const attempt of attempts) {
        try {
          activeModel = attempt.targetModel;
          stream = await startStream(attempt.targetModel, attempt.targetThinking);
          break;
        } catch (err) {
          lastStreamErr = err;
          if (isAuthOrQuotaError(err)) {
            throw err;
          }
        }
      }

      if (!stream) {
        // Last-resort non-streamed generateContent returned over SSE
        const fallbackReply = await runGenerateFallback('gemini-3.1-flash-lite');
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

      for await (const chunk of stream) {
        if (closed) break;
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || '';
        if (chunkText) {
          accumulated += chunkText;
          sendEvent({ type: 'chunk', text: chunkText, model: activeModel });
        }
      }

      if (!closed) {
        if (!accumulated.trim()) {
          const backupText = await runGenerateFallback(activeModel).catch(() => '');
          if (backupText.trim()) {
            sendEvent({ type: 'chunk', text: backupText, model: activeModel });
            sendEvent({ type: 'done', model: activeModel });
          } else {
            sendEvent({
              type: 'error',
              error: 'AI কোনো উত্তর প্রদান করেনি। অনুগ্রহ করে প্রশ্নটি একটু স্পষ্ট করে আবার চেষ্টা করুন।',
            });
          }
        } else {
          sendEvent({ type: 'done', model: activeModel });
        }
        res.end();
      }
    } catch (err) {
      const formatted = formatGeminiError(err, true);
      console.error('Bashar Cloud AI error:', err);
      sendEvent({ type: 'error', error: formatted.message });
      if (!res.writableEnded) {
        res.end();
      }
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
