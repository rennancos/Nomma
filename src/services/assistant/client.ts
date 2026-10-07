import { z } from 'zod';
import { assistantContext, type AssistantReport } from '@/services/finance/assistant';

// O futuro fluxo de login injeta uma sessão renovável. Nunca usar token fixo no bundle.
let sessionProvider: (() => Promise<string | null>) | null = null;
export function configureAssistantSession(provider: (() => Promise<string | null>) | null) { sessionProvider = provider; }
const endpoint = () => process.env.EXPO_PUBLIC_ASSISTANT_URL?.trim();
/** O app foi gerado com a URL HTTPS do serviço. */
export const assistantConfigured = () => Boolean(endpoint()?.startsWith('https://'));
/** Serviço configurado e usuário conectado. */
export const assistantAvailable = () => assistantConfigured() && Boolean(sessionProvider);
const responseSchema = z.object({ answer: z.string().trim().min(1).max(12000) });

export async function askAssistant(question: string, report: AssistantReport, signal?: AbortSignal): Promise<string> {
  if (!assistantAvailable()) throw new Error('A conversa com IA ainda não está configurada. Use as consultas locais abaixo.');
  const text = question.trim();
  if (!text || text.length > 1000) throw new Error('Escreva uma pergunta com até 1.000 caracteres.');
  const token = await sessionProvider!();
  if (!token) throw new Error('Entre novamente na sua conta para usar a IA.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 35000);
  try {
    const response = await fetch(endpoint()!, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: text, context: assistantContext(report) }),
    });
    if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente.');
    if (response.status === 429) throw new Error('Limite de consultas atingido. Tente novamente em alguns minutos.');
    if (!response.ok) throw new Error('A IA está indisponível. Tente novamente.');
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('A IA retornou uma resposta inválida. Tente novamente.');
    return parsed.data.answer;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A consulta foi cancelada ou demorou demais. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    throw error;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
