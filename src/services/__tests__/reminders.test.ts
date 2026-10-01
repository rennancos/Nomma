import { describe, expect, it, jest } from '@jest/globals';

// Simula o agendador do aparelho: guarda os lembretes agendados e responde de forma assíncrona (como o nativo).
const scheduled: unknown[] = [];
const tick = () => new Promise((r) => setTimeout(r, 1));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => undefined,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  cancelAllScheduledNotificationsAsync: async () => { await tick(); scheduled.length = 0; },
  setNotificationChannelAsync: async () => { await tick(); },
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  scheduleNotificationAsync: async (req: unknown) => { await tick(); scheduled.push(req); },
}));

// eslint-disable-next-line import/first -- precisa vir depois do mock
import { REMINDER_HOURS, syncReminders } from '../reminders';

describe('syncReminders', () => {
  it('agenda um lembrete por horário', async () => {
    await syncReminders(true);
    expect(scheduled).toHaveLength(REMINDER_HOURS.length);
  });

  it('não duplica com chamadas simultâneas (abrir o app + salvar Configurações)', async () => {
    await Promise.all([syncReminders(true), syncReminders(true), syncReminders(true)]);
    expect(scheduled).toHaveLength(REMINDER_HOURS.length);
  });

  it('desligado cancela todos', async () => {
    await syncReminders(true);
    await syncReminders(false);
    expect(scheduled).toHaveLength(0);
  });
});
