import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import type { Category, CategoryKind } from '@/types';

export const listCategories = (db: SQLiteDatabase) =>
  db.getAllAsync<Category>(
    `SELECT id, name, kind, is_default AS isDefault, archived FROM categories
     ORDER BY kind, is_default DESC, name COLLATE NOCASE`,
  );

export async function createCategory(db: SQLiteDatabase, name: string, kind: CategoryKind): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    newId(), name, kind, now, now,
  );
}

/** Categorias são arquivadas, nunca apagadas, para preservar o histórico. */
export const setCategoryArchived = (db: SQLiteDatabase, id: string, archived: boolean) =>
  db.runAsync('UPDATE categories SET archived = ?, updated_at = ? WHERE id = ?', archived ? 1 : 0, nowISO(), id);
