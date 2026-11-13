import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  attachment?: {
    name: string;
    snippet: string;
  } | null;
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

function buildSystemInstruction(userName?: string): string {
  const userLine = userName ? `The current user's name is "${userName}".` : '';
  return [
    'You are Bashar Cloud AI, an intelligent, accurate, and professional AI assistant built into Bashar Cloud.',
    userLine,
    'Answer every question clearly, thoroughly, and practically across all domains: coding & debugging, math & science, study & exam preparation, writing & translation, business & productivity, everyday life, and cloud document analysis.',
    'Language matching: Respond in natural, fluent Bengali when the user writes in Bengali (or requests Bengali), in English when they write in English, or seamlessly mix technical English terms inside Bengali when appropriate.',
    'Formatting: Structure longer explanations cleanly using Markdown headings, concise bullet points, numbered steps, and fenced code blocks with language tags (for example ```ts or ```python) so responses read clearly like a modern web assistant.',
    'Accuracy: Be honest if something is uncertain or missing from provided context. Do not invent facts or claim external side effects that did not happen.',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown AI error');
  const lower = raw.toLowerCase();

  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 500,
      message:
        'GEMINI_API_KEY পাওয়া যায়নি। অনুগ্রহ করে Settings > Secrets প্যানেলে আপনার API Key যোগ করুন অথবা যাচাই করুন।',
    };
  }

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
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
        'API ব্যবহারের সীমা (Quota/Rate limit) সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা Settings > Secrets থেকে বিলিং-সক্রিয় API Key ব্যবহার করুন।',
    };
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: 'নির্বাচিত AI মডেলটি পাওয়া যায়নি। অনুগ্রহ করে General (Gemini 4 Hydrogen) বা Fast মোডে চেষ্টা করুন।',
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

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'bashar-cloud-ai',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const body = (req.body || {}) as IncomingChatPayload;
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      res.status(400).json({ error: 'অনুগ্রহ করে একটি প্রশ্ন বা বার্তা লিখুন।' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      const errInfo = formatGeminiError(new Error('Missing GEMINI_API_KEY'));
      res.status(errInfo.status).json({ error: errInfo.message });
      return;
    }

    const { model, thinkingLevel } = getModelAndThinking(body.mode);
    const systemInstruction = buildSystemInstruction(body.userName);

    const historyItems = Array.isArray(body.history)
      ? body.history
          .filter(
            (item) =>
              item &&
              (item.role === 'user' || item.role === 'model') &&
              typeof item.text === 'string' &&
              item.text.trim().length > 0
          )
          .slice(-24)
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text }],
          }))
      : [];

    const userPrompt =
      body.attachment && body.attachment.snippet
        ? `[Attached Cloud File: ${body.attachment.name}]\n\`\`\`\n${body.attachment.snippet.slice(0, 12000)}\n\`\`\`\n\nUser Question:\n${rawMessage}`
        : rawMessage;

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
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const startStream = async (targetModel: string, targetThinking: ThinkingLevel) => {
        const chat = ai.chats.create({
          model: targetModel,
          history: historyItems,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: targetThinking },
          },
        });
        return chat.sendMessageStream({ message: userPrompt });
      };

      let activeModel: string = model;
      let stream;
      try {
        stream = await startStream(model, thinkingLevel);
      } catch (primaryErr) {
        const msg = primaryErr instanceof Error ? primaryErr.message.toLowerCase() : String(primaryErr).toLowerCase();
        const shouldFallback =
          msg.includes('not_found') ||
          msg.includes('404') ||
          msg.includes('unavailable') ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('overloaded');
        if (shouldFallback && model !== 'gemini-3.1-flash-lite') {
          activeModel = 'gemini-3.1-flash-lite';
          stream = await startStream(activeModel, ThinkingLevel.MINIMAL);
        } else {
          throw primaryErr;
        }
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
          sendEvent({
            type: 'error',
            error: 'AI কোনো উত্তর প্রদান করেনি। অনুগ্রহ করে প্রশ্নটি একটু স্পষ্ট করে আবার চেষ্টা করুন।',
          });
        } else {
          sendEvent({ type: 'done', model: activeModel });
        }
        res.end();
      }
    } catch (err) {
      const formatted = formatGeminiError(err);
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
  let useViteDev = process.env.NODE_ENV !== 'production';

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
    if (fs.existsSync(distDir)) {
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
