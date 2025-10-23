
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Song, Playlist, SortOption, ShuffleMode, RepeatMode } from './types';
import { getSongs, addSongs, getPlaylists, addPlaylist, updatePlaylist, deletePlaylist, incrementPlayCount } from './services/db';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, MusicIcon, PlaylistIcon, FolderIcon, SearchIcon, PlusIcon, MoreIcon, XIcon, SpinnerIcon } from './components/Icons';

const SUPPORTED_FORMATS = ['mp3', 'm4a', 'wav', 'flac', 'aac'];
const PLAY_COUNT_THRESHOLD_S = 5;

// --- Helper Functions ---
const formatDuration = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// --- Child Components (defined outside App to prevent re-creation on re-render) ---

interface PlayerControlsProps {
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
    onToggleShuffle: () => void;
    onToggleRepeat: () => void;
    isPlaying: boolean;
    duration: number;
    currentTime: number;
    currentSong: Song | null;
    shuffleMode: ShuffleMode;
    repeatMode: RepeatMode;
}

const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({ onPlayPause, onNext, onPrev, onSeek, onToggleShuffle, onToggleRepeat, isPlaying, duration, currentTime, currentSong, shuffleMode, repeatMode }) => {
    const seekBarRef = useRef<HTMLInputElement>(null);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(Number(e.target.value));
    };

    useEffect(() => {
        if (seekBarRef.current) {
            const progress = (currentTime / duration) * 100 || 0;
            seekBarRef.current.style.background = `linear-gradient(to right, #1DB954 ${progress}%, #4b5563 ${progress}%)`;
        }
    }, [currentTime, duration]);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-md text-white p-3 shadow-lg">
            <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-700 rounded-md flex-shrink-0">
                    {currentSong && <img src={`https://picsum.photos/seed/${currentSong.id}/64`} alt="album art" className="w-full h-full object-cover rounded-md" />}
                </div>
                <div className="flex-grow min-w-0">
                    <p className="font-bold truncate">{currentSong?.title || 'No song selected'}</p>
                    <p className="text-sm text-gray-400 truncate">{currentSong?.artist || '...'}</p>
                </div>
                <div className="flex flex-col items-center flex-grow-[2] max-w-lg">
                    <div className="flex items-center space-x-4">
                        <button onClick={onToggleShuffle} title="Shuffle"><ShuffleIcon isActive={shuffleMode !== 'none'} /></button>
                        <button onClick={onPrev} title="Previous"><PrevIcon /></button>
                        <button onClick={onPlayPause} className="w-12 h-12 flex items-center justify-center bg-green-500 rounded-full text-black hover:bg-green-400 transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button onClick={onNext} title="Next"><NextIcon /></button>
                        <button onClick={onToggleRepeat} title="Repeat"><RepeatIcon mode={repeatMode} /></button>
                    </div>
                    <div className="flex items-center w-full space-x-2 mt-2">
                        <span className="text-xs">{formatDuration(currentTime)}</span>
                        <input
                            ref={seekBarRef}
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                        />
                        <span className="text-xs">{formatDuration(duration)}</span>
                    </div>
                </div>
                 <div className="flex-grow"></div>
            </div>
        </div>
    );
});

// --- Main App Component ---
export default function App() {
    // State
    const [songs, setSongs] = useState<Song[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [activeView, setActiveView] = useState<{ type: 'library' | 'playlist'; id?: number }>({ type: 'library' });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>({ key: 'title', direction: 'asc' });

    // Playback State
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    const [playQueue, setPlayQueue] = useState<Song[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('none');
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
    
    // Loading/Modal State
    const [isLoading, setIsLoading] = useState(true);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
    const [isScanning, setIsScanning] = useState(false);
    const [isAddToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState<Song | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const playCountTrackedRef = useRef<Set<string>>(new Set());

    // Data Loading
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const [dbSongs, dbPlaylists] = await Promise.all([getSongs(), getPlaylists()]);
            setSongs(dbSongs);
            setPlaylists(dbPlaylists);
            setIsLoading(false);
        };
        loadInitialData();
    }, []);
    
    // Audio Player Logic
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
    
      const updateCurrentTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => playNextSong();
    
      audio.addEventListener('timeupdate', updateCurrentTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);
    
      return () => {
        audio.removeEventListener('timeupdate', updateCurrentTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playQueue, currentSongIndex, repeatMode]);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const currentSong = playQueue[currentSongIndex];
        if (audioRef.current && currentSong) {
            audioRef.current.src = URL.createObjectURL(currentSong.file);
            if (isPlaying) {
                 audioRef.current.play().catch(e => console.error("Error playing audio:", e));
            }
        }
    }, [currentSongIndex, playQueue, isPlaying]);
    
    // Play Count Logic
    useEffect(() => {
        const currentSong = playQueue[currentSongIndex];
        if (!currentSong) return;

        const songPlaybackId = `${currentSong.id}-${Date.now()}`;

        if (isPlaying && currentTime >= PLAY_COUNT_THRESHOLD_S && !playCountTrackedRef.current.has(songPlaybackId)) {
            playCountTrackedRef.current.add(songPlaybackId);
            incrementPlayCount(currentSong.id).then(() => {
                setSongs(prevSongs => prevSongs.map(s => s.id === currentSong.id ? { ...s, playCount: s.playCount + 1 } : s));
            });
        }

        if(!isPlaying && currentSongIndex !== -1) {
             // Reset tracking when paused
            playCountTrackedRef.current.clear();
        }

    }, [currentTime, isPlaying, currentSongIndex, playQueue]);


    // Functions
    const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            scanFiles(Array.from(files));
        }
    };
    
    const scanFiles = async (files: File[]) => {
        setIsScanning(true);
        setScanProgress({ current: 0, total: files.length });

        const newSongs: Song[] = [];
        const existingSongIds = new Set(songs.map(s => s.fileName));

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setScanProgress({ current: i + 1, total: files.length });

            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!extension || !SUPPORTED_FORMATS.includes(extension) || existingSongIds.has(file.name)) {
                continue;
            }

            try {
                const tags = await new Promise((resolve, reject) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any).jsmediatags.read(file, {
                        onSuccess: resolve,
                        onError: reject,
                    });
                });
                
                const audio = document.createElement('audio');
                audio.src = URL.createObjectURL(file);
                const duration = await new Promise<number>((resolve) => {
                    audio.onloadedmetadata = () => resolve(audio.duration);
                    audio.onerror = () => resolve(0); // fallback
                });
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { title, artist, album } = (tags as any).tags;

                const song: Song = {
                    id: `${file.name}-${file.lastModified}`,
                    file: file,
                    fileName: file.name,
                    title: title || file.name.replace(/\.[^/.]+$/, ""),
                    artist: artist || 'Unknown Artist',
                    album: album || 'Unknown Album',
                    duration: duration,
                    playCount: 0,
                    dateAdded: Date.now(),
                };
                newSongs.push(song);
            } catch (error) {
                console.warn(`Could not read metadata for ${file.name}`, error);
            }
        }

        if (newSongs.length > 0) {
            await addSongs(newSongs);
            setSongs(prev => [...prev, ...newSongs]);
        }
        setIsScanning(false);
    };

    const playSong = (song: Song, songList: Song[]) => {
        const index = songList.findIndex(s => s.id === song.id);
        if (index > -1) {
            if (shuffleMode !== 'none') {
                const shuffledQueue = getShuffledQueue(songList);
                const newIndex = shuffledQueue.findIndex(s => s.id === song.id);
                setPlayQueue(shuffledQueue);
                setCurrentSongIndex(newIndex);
            } else {
                setPlayQueue(songList);
                setCurrentSongIndex(index);
            }
            setIsPlaying(true);
        }
    };
    
    const playNextSong = () => {
        if (playQueue.length === 0) return;
    
        if (repeatMode === 'one') {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            return;
        }
    
        let nextIndex = currentSongIndex + 1;
        if (nextIndex >= playQueue.length) {
            if (repeatMode === 'all') {
                nextIndex = 0;
            } else {
                setIsPlaying(false);
                return;
            }
        }
        setCurrentSongIndex(nextIndex);
    };
    
    const playPrevSong = () => {
        if (playQueue.length === 0) return;
        if(audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        let prevIndex = currentSongIndex - 1;
        if (prevIndex < 0) {
            if(repeatMode === 'all') {
               prevIndex = playQueue.length - 1;
            } else {
                return; // Stop at the beginning if not repeating
            }
        }
        setCurrentSongIndex(prevIndex);
    };
    
    const handlePlayPause = () => {
        if (playQueue.length > 0) {
            setIsPlaying(!isPlaying);
        } else if (songs.length > 0) {
            playSong(songs[0], songs);
        }
    };

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const getShuffledQueue = useCallback((sourceQueue: Song[]): Song[] => {
        const queue = [...sourceQueue];
        if (shuffleMode === 'random') {
            for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }
        } else if (shuffleMode === 'weighted') {
            const totalPlayCount = queue.reduce((sum, song) => sum + song.playCount, 0);
            queue.sort((a, b) => {
                const weightA = (totalPlayCount - a.playCount) || 1;
                const weightB = (totalPlayCount - b.playCount) || 1;
                return (Math.random() * weightB) - (Math.random() * weightA);
            });
        }
        return queue;
    }, [shuffleMode]);

    const toggleShuffle = () => {
        const modes: ShuffleMode[] = ['none', 'random', 'weighted'];
        const nextIndex = (modes.indexOf(shuffleMode) + 1) % modes.length;
        const newMode = modes[nextIndex];
        setShuffleMode(newMode);

        if (newMode !== 'none' && playQueue.length > 0) {
            const currentSong = playQueue[currentSongIndex];
            const newQueue = getShuffledQueue(playQueue);
            const newIndex = newQueue.findIndex(s => s.id === currentSong.id);
            setPlayQueue(newQueue);
            setCurrentSongIndex(newIndex);
        } else if (newMode === 'none' && playQueue.length > 0) {
            // Revert to original order of active view
            const originalList = activeView.type === 'library'
              ? songs
              : playlists.find(p => p.id === activeView.id)?.songIds.map(id => songs.find(s => s.id === id)!) || [];
            
            const currentSong = playQueue[currentSongIndex];
            const newIndex = originalList.findIndex(s => s.id === currentSong.id);
            setPlayQueue(originalList);
            setCurrentSongIndex(newIndex);
        }
    };

    const toggleRepeat = () => {
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
        setRepeatMode(modes[nextIndex]);
    };

    const handleCreatePlaylist = async () => {
        const name = prompt("Enter new playlist name:");
        if (name) {
            const newId = await addPlaylist(name);
            const newPlaylist = { id: newId, name, songIds: [], dateCreated: Date.now() };
            setPlaylists([...playlists, newPlaylist]);
        }
    };

    const handleAddSongToPlaylist = async (playlistId: number, songId: string) => {
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.songIds.includes(songId)) {
            const updatedPlaylist = { ...playlist, songIds: [...playlist.songIds, songId] };
            await updatePlaylist(updatedPlaylist);
            setPlaylists(playlists.map(p => p.id === playlistId ? updatedPlaylist : p));
        }
        setAddToPlaylistModalOpen(null);
    };

    const filteredAndSortedSongs = useMemo(() => {
        let items = songs;
        
        if (activeView.type === 'playlist') {
            const playlist = playlists.find(p => p.id === activeView.id);
            if (playlist) {
                items = playlist.songIds.map(id => songs.find(s => s.id === id)).filter((s): s is Song => !!s);
            } else {
                items = [];
            }
        }
        
        if (searchQuery) {
            items = items.filter(song =>
                song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                song.album.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return [...items].sort((a, b) => {
            let compare = 0;
            if (sortOption.key === 'title' || sortOption.key === 'artist') {
                compare = a[sortOption.key].localeCompare(b[sortOption.key]);
            } else {
                compare = a[sortOption.key] - b[sortOption.key];
            }
            return sortOption.direction === 'asc' ? compare : -compare;
        });
    }, [songs, playlists, activeView, searchQuery, sortOption]);
    
    const currentSong = playQueue[currentSongIndex] || null;

    // UI Render
    return (
        <div className="flex h-screen bg-black">
            <audio ref={audioRef} />
            {isAddToPlaylistModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Add to Playlist</h2>
                        <p className="text-gray-300 mb-4 truncate">Adding: {isAddToPlaylistModalOpen.title}</p>
                        <div className="max-h-60 overflow-y-auto">
                            {playlists.map(playlist => (
                                <button key={playlist.id} onClick={() => handleAddSongToPlaylist(playlist.id, isAddToPlaylistModalOpen.id)} className="block w-full text-left p-3 hover:bg-gray-700 rounded-md transition-colors">
                                    {playlist.name}
                                </button>
                            ))}
                        </div>
                         <button onClick={() => setAddToPlaylistModalOpen(null)} className="mt-6 w-full p-2 bg-gray-600 hover:bg-gray-500 rounded-md">
                            Cancel
                        </button>
                    </div>
                 </div>
            )}
            {isScanning && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
                        <h2 className="text-lg font-bold mb-4">Scanning Library...</h2>
                        <SpinnerIcon />
                        <p className="mt-4">{scanProgress.current} / {scanProgress.total} files processed</p>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-64 bg-black text-gray-300 p-4 flex flex-col space-y-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Music Player</h1>
                <div>
                    <h2 className="text-sm font-semibold tracking-wider uppercase mb-2">Library</h2>
                    <nav className="space-y-1">
                        <button onClick={() => setActiveView({ type: 'library' })} className={`w-full flex items-center space-x-3 p-2 rounded-md text-left ${activeView.type === 'library' ? 'bg-gray-700 text-white' : 'hover:bg-gray-800'}`}>
                            <MusicIcon /> <span>All Songs</span>
                        </button>
                         <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center space-x-3 p-2 rounded-md text-left hover:bg-gray-800">
                           <FolderIcon /> <span>Add Music</span>
                        </button>
                        {/* Fix: remove non-standard 'directory' attribute to resolve TypeScript error. 'webkitdirectory' is retained for directory selection functionality. */}
                        <input type="file" multiple webkitdirectory="" ref={fileInputRef} onChange={handleFolderSelect} className="hidden" />
                    </nav>
                </div>
                <div className="flex-grow flex flex-col min-h-0">
                     <div className="flex justify-between items-center mb-2">
                         <h2 className="text-sm font-semibold tracking-wider uppercase">Playlists</h2>
                         <button onClick={handleCreatePlaylist} className="p-1 hover:bg-gray-700 rounded-full"><PlusIcon /></button>
                     </div>
                    <nav className="space-y-1 overflow-y-auto">
                        {playlists.map(p => (
                            <button key={p.id} onClick={() => setActiveView({ type: 'playlist', id: p.id })} className={`w-full flex items-center space-x-3 p-2 rounded-md text-left ${activeView.type === 'playlist' && activeView.id === p.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-800'}`}>
                                <PlaylistIcon /> <span className="truncate">{p.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-gray-900 overflow-y-auto pb-28">
                <div className="p-6">
                    <div className="relative mb-4">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search by title, artist, album..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-800 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    
                    {isLoading ? <div className="text-center p-10"><SpinnerIcon /></div> : (
                        songs.length === 0 ? (
                            <div className="text-center p-10 bg-gray-800 rounded-lg">
                                <h2 className="text-2xl font-bold mb-2">Your library is empty</h2>
                                <p className="text-gray-400 mb-4">Click "Add Music" in the sidebar to scan a folder.</p>
                                <button onClick={() => fileInputRef.current?.click()} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full hover:bg-green-600 transition-colors">
                                    Select Music Folder
                                </button>
                            </div>
                        ) : (
                             <div className="text-white">
                                 {/* Song List Header */}
                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr_5rem] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                                    <div className="text-right">#</div>
                                    <div>Title</div>
                                    <div>Artist</div>
                                    <div>Album</div>
                                    <div className="text-center">Plays</div>
                                </div>
                                {/* Song List */}
                                {filteredAndSortedSongs.map((song, index) => (
                                    <div key={song.id} 
                                        onDoubleClick={() => playSong(song, filteredAndSortedSongs)} 
                                        className={`grid grid-cols-[3rem_1fr_1fr_1fr_5rem] gap-4 items-center px-4 h-16 rounded-md group hover:bg-gray-800/50 ${currentSong?.id === song.id ? 'bg-green-500/20' : ''}`}>
                                        <div className="text-right text-gray-400">
                                           <button onClick={() => playSong(song, filteredAndSortedSongs)} className="w-8 h-8 flex items-center justify-center group-hover:hidden">{index+1}</button>
                                           <button onClick={() => song.id === currentSong?.id && isPlaying ? handlePlayPause() : playSong(song, filteredAndSortedSongs)} className="w-8 h-8 items-center justify-center hidden group-hover:flex">
                                               {song.id === currentSong?.id && isPlaying ? <PauseIcon /> : <PlayIcon />}
                                           </button>
                                        </div>
                                        <div className="truncate">
                                            <p className={`${currentSong?.id === song.id ? 'text-green-400' : 'text-white'}`}>{song.title}</p>
                                            <p className="text-sm text-gray-400 group-hover:text-gray-300">{formatDuration(song.duration)}</p>
                                        </div>
                                        <div className="truncate text-gray-400">{song.artist}</div>
                                        <div className="truncate text-gray-400">{song.album}</div>
                                        <div className="text-center text-gray-400 relative">
                                            <span>{song.playCount}</span>
                                            <button onClick={() => setAddToPlaylistModalOpen(song)} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-700">
                                                <MoreIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )
                    )}
                </div>
            </main>

            {/* Player Controls */}
            <PlayerControls
                currentSong={currentSong}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                shuffleMode={shuffleMode}
                repeatMode={repeatMode}
                onPlayPause={handlePlayPause}
                onNext={playNextSong}
                onPrev={playPrevSong}
                onSeek={handleSeek}
                onToggleShuffle={toggleShuffle}
                onToggleRepeat={toggleRepeat}
            />
        </div>
    );
}