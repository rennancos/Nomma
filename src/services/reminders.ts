import * as Notifications from 'expo-notifications';

// Lembretes locais para registrar gastos: agendados no próprio aparelho, funcionam offline e com o app fechado.
// Horários em que o usuário costuma comprar algo (manhã, almoço, noite).
export const REMINDER_HOURS = [9, 13, 21] as const;
const CHANNEL = 'lembretes';
const TITLE = 'Nomma';
const BODY = 'Pagou alguma coisa hoje? lembre de colocar no seu agente de controle de gastos';

// Com o app aberto, a notificação também aparece.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Deixa os lembretes de acordo com a configuração: cancela os agendados e, se ligado, agenda os horários de novo.
 * Idempotente: pode rodar a cada abertura do app. Retorna false se o usuário negou a permissão de notificação.
 */
export function syncReminders(enabled: boolean): Promise<boolean> {
  // Em fila: duas chamadas juntas (abertura do app + salvar Configurações) poderiam intercalar
  // "cancela, cancela, agenda, agenda" e duplicar os lembretes.
  const run = queue.then(() => sync(enabled));
  queue = run.catch(() => undefined);
  return run;
}
let queue: Promise<unknown> = Promise.resolve();

async function sync(enabled: boolean): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return true;

  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Lembretes de gastos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return false;

  for (const hour of REMINDER_HOURS) {
    await Notifications.scheduleNotificationAsync({
      content: { title: TITLE, body: BODY },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: CHANNEL },
    });
  }
  return true;
}
