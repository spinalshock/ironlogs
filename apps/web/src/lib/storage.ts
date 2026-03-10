import { openDB, type DBSchema } from 'idb';
import type { LiftEntry } from '@ironlogs/core';

interface IronLogsDB extends DBSchema {
  lifts: {
    key: number;
    value: LiftEntry & { id?: number; synced?: boolean };
    indexes: { 'by-date': string };
  };
  achievements: {
    key: string;
    value: { id: string; unlockedAt: string };
  };
  settings: {
    key: string;
    value: { key: string; value: string };
  };
}

function getDB() {
  return openDB<IronLogsDB>('ironlogs', 1, {
    upgrade(db) {
      const liftStore = db.createObjectStore('lifts', { keyPath: 'id', autoIncrement: true });
      liftStore.createIndex('by-date', 'date');
      db.createObjectStore('achievements', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });
}

export async function addLift(entry: LiftEntry) {
  const db = await getDB();
  await db.add('lifts', { ...entry, synced: false });
}

export async function getLocalLifts(): Promise<LiftEntry[]> {
  const db = await getDB();
  return db.getAll('lifts');
}

export async function deleteLocalLift(id: number) {
  const db = await getDB();
  await db.delete('lifts', id);
}

export async function clearLocalLifts() {
  const db = await getDB();
  await db.clear('lifts');
}

export async function unlockAchievement(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('achievements', id);
  if (!existing) {
    await db.put('achievements', { id, unlockedAt: new Date().toISOString() });
    return true;
  }
  return false;
}

export async function getUnlockedAchievements(): Promise<Record<string, string>> {
  const db = await getDB();
  const all = await db.getAll('achievements');
  const result: Record<string, string> = {};
  for (const a of all) result[a.id] = a.unlockedAt;
  return result;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDB();
  const val = await db.get('settings', key);
  return val?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function exportLiftsAsCSV(): Promise<string> {
  const lifts = await getLocalLifts();
  if (lifts.length === 0) return '';
  const header = 'date,bodyweight,lift,weight,reps,set_type,notes,sleep';
  const rows = lifts.map((l) =>
    `${l.date},${l.bodyweight},${l.lift},${l.weight},${l.reps},${l.set_type},${l.notes},${l.sleep || ''}`
  );
  return [header, ...rows].join('\n');
}
