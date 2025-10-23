
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Song, Playlist } from '../types';

const DB_NAME = 'OfflineMusicPlayerDB';
const DB_VERSION = 1;
const SONGS_STORE = 'songs';
const PLAYLISTS_STORE = 'playlists';

interface MusicDB extends DBSchema {
  [SONGS_STORE]: {
    key: string;
    value: Song;
    indexes: { 'by-title': string; 'by-artist': string };
  };
  [PLAYLISTS_STORE]: {
    key: number;
    value: Playlist;
    indexes: { 'by-name': string };
  };
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MusicDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SONGS_STORE)) {
          const songsStore = db.createObjectStore(SONGS_STORE, { keyPath: 'id' });
          songsStore.createIndex('by-title', 'title');
          songsStore.createIndex('by-artist', 'artist');
        }
        if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
          const playlistsStore = db.createObjectStore(PLAYLISTS_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          playlistsStore.createIndex('by-name', 'name');
        }
      },
    });
  }
  return dbPromise;
};


// Song operations
export const getSongs = async (): Promise<Song[]> => {
  const db = await getDb();
  return db.getAll(SONGS_STORE);
};

export const addSongs = async (songs: Song[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction(SONGS_STORE, 'readwrite');
  await Promise.all(songs.map(song => tx.store.put(song)));
  await tx.done;
};

export const getSongById = async (id: string): Promise<Song | undefined> => {
  const db = await getDb();
  return db.get(SONGS_STORE, id);
};

export const incrementPlayCount = async (songId: string): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(SONGS_STORE, 'readwrite');
    const song = await tx.store.get(songId);
    if (song) {
        song.playCount += 1;
        await tx.store.put(song);
    }
    await tx.done;
};

// Playlist operations
export const getPlaylists = async (): Promise<Playlist[]> => {
    const db = await getDb();
    return db.getAll(PLAYLISTS_STORE);
};

export const addPlaylist = async (name: string): Promise<number> => {
    const db = await getDb();
    const newPlaylist: Omit<Playlist, 'id'> = {
        name,
        songIds: [],
        dateCreated: Date.now(),
    };
    return db.add(PLAYLISTS_STORE, newPlaylist as Playlist);
};

export const updatePlaylist = async (playlist: Playlist): Promise<void> => {
    const db = await getDb();
    await db.put(PLAYLISTS_STORE, playlist);
};

export const deletePlaylist = async (id: number): Promise<void> => {
    const db = await getDb();
    await db.delete(PLAYLISTS_STORE, id);
};
