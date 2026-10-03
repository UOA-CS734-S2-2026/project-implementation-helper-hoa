import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requireAuth } from '../middlewares/auth';
import { AIService, ChatRequestPayload } from '../services/ai.service';

export function createAIRoutes(service: AIService): Router {
  const router = Router();

  router.post('/chat', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { message, history } = req.body as Partial<ChatRequestPayload>;

      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'message is required and must be a non-empty string' });
        return;
      }

      if (!req.rawToken) {
        res.status(401).json({ error: 'Unauthorized: Missing token' });
        return;
      }

      // The chatbot's MCP tools call back into this API, so the caller's token
      // travels with the request instead of the Python tier inventing its own.
      const { reply } = await service.chat(
        {
          message: message.trim(),
          history: Array.isArray(history) ? history : [],
        },
        req.rawToken,
      );

      res.status(200).json({ reply });
    } catch (error) {
      next(error);
    }
  });

  router.get('/health', (_req, res: Response) => {
    res.status(200).json({ status: 'ok', ai: 'route' });
  });

  return router;
}
