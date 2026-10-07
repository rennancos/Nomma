import Storage from 'expo-sqlite/kv-store';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence, // tipo declarado em src/types/firebase-auth.d.ts
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { configureAssistantSession } from '@/services/assistant/client';

// Configuração pública do app da Web no Firebase (ver .env.example). Sem ela, o login fica indisponível.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const authConfigured = Object.values(config).every(Boolean);

let auth: Auth | null = null;
function getAuth(): Auth | null {
  if (!authConfigured) return null;
  // Sessão salva no kv-store do expo-sqlite (mesma API do AsyncStorage), separada dos bancos financeiros.
  auth ??= initializeAuth(initializeApp(config), { persistence: getReactNativePersistence(Storage) });
  return auth;
}

/** `undefined` enquanto a sessão salva é restaurada; `null` sem login. Também liga a sessão ao assistente. */
export function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(authConfigured ? undefined : null);
  useEffect(() => {
    const a = getAuth();
    if (!a) return;
    return onAuthStateChanged(a, (u) => {
      // getIdToken renova o token sozinho quando está perto de expirar.
      configureAssistantSession(u ? () => u.getIdToken() : null);
      setUser(u);
    });
  }, []);
  return user;
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use "Entrar".',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente novamente.',
};
export function authErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String(e.code) : '';
  return MESSAGES[code] ?? 'Não foi possível concluir. Tente novamente.';
}

function requireAuth(): Auth {
  const a = getAuth();
  if (!a) throw new Error('Login não configurado neste aplicativo.');
  return a;
}
export const signIn = (email: string, password: string) => signInWithEmailAndPassword(requireAuth(), email.trim(), password);
export const signUp = (email: string, password: string) => createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
export const resetPassword = (email: string) => sendPasswordResetEmail(requireAuth(), email.trim());
export const signOut = () => firebaseSignOut(requireAuth());
export const currentEmail = () => getAuth()?.currentUser?.email ?? null;
