// No app, o Metro resolve firebase/auth para o build React Native de @firebase/auth, que exporta
// getReactNativePersistence. Os tipos publicados são os da Web e não a declaram (o "types" genérico
// do package.json vem antes da condição react-native), por isso a assinatura é declarada aqui.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
