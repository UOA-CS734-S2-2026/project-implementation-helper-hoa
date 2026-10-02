import { aiConfig } from '../config/ai';

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatRequestPayload = {
  message: string;
  history?: ChatTurn[];
};

export type ChatResponsePayload = {
  reply: string;
};

export class AIService {
  /**
   * `token` is the caller's Firebase ID token, taken from the Authorization
   * header by requireAuth. It is forwarded so the Python tier can act as the
   * logged-in user when its MCP tools read from this API.
   */
  async chat(
    payload: ChatRequestPayload,
    token: string,
  ): Promise<ChatResponsePayload> {
    let response: Response;
    try {
      response = await fetch(`${aiConfig.pythonBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: payload.message,
          history: payload.history ?? [],
        }),
        signal: AbortSignal.timeout(90000),
      });
    } catch {
      throw new Error(
        `AI service is unreachable at ${aiConfig.pythonBaseUrl}. Is the Python chatbot server running?`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `AI service responded with ${response.status}${text ? `: ${text}` : ''}`,
      );
    }

    return (await response.json()) as ChatResponsePayload;
  }
}