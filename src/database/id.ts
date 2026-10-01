import { randomUUID } from 'expo-crypto';

// UUIDs (e não autoincremento) para permitir sincronização futura entre dispositivos.
export const newId = (): string => randomUUID();
export const nowISO = (): string => new Date().toISOString();
