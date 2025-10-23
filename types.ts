
export interface Song {
  id: string;
  file: File;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  playCount: number;
  dateAdded: number; // Storing timestamp for easier sorting
}

export interface Playlist {
  id: number;
  name: string;
  songIds: string[];
  dateCreated: number;
}

export type SortKey = 'title' | 'artist' | 'playCount' | 'dateAdded';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
    key: SortKey;
    direction: SortDirection;
}

export type ShuffleMode = 'none' | 'random' | 'weighted';

export type RepeatMode = 'none' | 'one' | 'all';
