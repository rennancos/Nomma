import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { askAssistant, configureAssistantSession, assistantAvailable } from '../client';
import { buildAssistantReport } from '@/services/finance/assistant';

const report = buildAssistantReport({ accounts: [], transactions: [], cards: [], categories: [], installments: [] }, { month: '2026-10' }, '2026-10-06');
const originalFetch = global.fetch;
const originalUrl = process.env.EXPO_PUBLIC_ASSISTANT_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_ASSISTANT_URL = 'https://backend.example/assistant'; });
afterEach(() => {
  configureAssistantSession(null);
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_ASSISTANT_URL;
  else process.env.EXPO_PUBLIC_ASSISTANT_URL = originalUrl;
});

test('não envia dados sem integração de sessão ou sem HTTPS', async () => {
  const mock = jest.fn<typeof fetch>(); global.fetch = mock;
  expect(assistantAvailable()).toBe(false);
  await expect(askAssistant('Resumo', report)).rejects.toThrow('não está configurada');
  configureAssistantSession(async () => 'token');
  process.env.EXPO_PUBLIC_ASSISTANT_URL = 'http://backend.example';
  expect(assistantAvailable()).toBe(false);
  expect(mock).not.toHaveBeenCalled();
});

test('sessão expirada impede chamada, resposta inválida permite nova tentativa', async () => {
  const mock = jest.fn<typeof fetch>(); global.fetch = mock;
  configureAssistantSession(async () => null);
  await expect(askAssistant('Resumo', report)).rejects.toThrow('Entre novamente');
  expect(mock).not.toHaveBeenCalled();
  configureAssistantSession(async () => 'token');
  mock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: '' }) } as Response);
  await expect(askAssistant('Resumo', report)).rejects.toThrow('inválida');
  mock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: 'Sem lançamentos.' }) } as Response);
  await expect(askAssistant('Resumo', report)).resolves.toBe('Sem lançamentos.');
});

test('limite e perda de conexão produzem mensagens úteis sem detalhes internos', async () => {
  const mock = jest.fn<typeof fetch>(); global.fetch = mock;
  configureAssistantSession(async () => 'token');
  mock.mockResolvedValue({ ok: false, status: 429 } as Response);
  await expect(askAssistant('Resumo', report)).rejects.toThrow('Limite');
  mock.mockRejectedValue(new TypeError('network internal detail'));
  await expect(askAssistant('Resumo', report)).rejects.toThrow('Verifique sua conexão');
});
