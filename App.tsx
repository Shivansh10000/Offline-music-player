import React, { useState, useEffect, useRef, useCallback } from 'react';
import { addSongs, getSongs, incrementPlayCount } from './services/db';
import { Song, ShuffleMode, RepeatMode } from './types';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, FolderIcon, SpinnerIcon } from './components/Icons';

// This is loaded from a CDN, so we declare it globally.
declare const jsmediatags: any;

// Helper function to format time
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const flooredSeconds = Math.floor(seconds);
    const min = Math.floor(flooredSeconds / 60);
    const sec = flooredSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const App: React.FC = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(1);
    const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('none');
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [playQueue, setPlayQueue] = useState<number[]>([]);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load songs from DB on mount
    useEffect(() => {
        const loadSongs = async () => {
            setIsLoading(true);
            const dbSongs = await getSongs();
            setSongs(dbSongs);
            // Initialize play queue
            setPlayQueue(dbSongs.map((_, index) => index));
            setIsLoading(false);
        };
        loadSongs();
    }, []);

    const currentSong = currentSongIndex !== null ? songs[currentSongIndex] : null;

    const handleNext = useCallback(() => {
        if (songs.length === 0 || currentSongIndex === null) return;
        if (repeatMode === 'one') {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            return;
        }

        const currentQueueIndex = playQueue.indexOf(currentSongIndex);
        let nextQueueIndex = currentQueueIndex + 1;

        if (nextQueueIndex >= playQueue.length) {
            if (repeatMode === 'all') {
                nextQueueIndex = 0;
            } else {
                setIsPlaying(false);
                return;
            }
        }
        const nextSongIndex = playQueue[nextQueueIndex];
        setCurrentSongIndex(nextSongIndex);
        setIsPlaying(true);
        incrementPlayCount(songs[nextSongIndex].id);
    }, [songs, currentSongIndex, playQueue, repeatMode]);

    // Audio element effects
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateCurrentTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleSongEnd = () => handleNext();

        audio.addEventListener('timeupdate', updateCurrentTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleSongEnd);

        return () => {
            audio.removeEventListener('timeupdate', updateCurrentTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleSongEnd);
        };
    }, [handleNext]);
    
    // Play/Pause effect
    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying]);
    
    // Song change effect
    useEffect(() => {
        if (audioRef.current && currentSong) {
            audioRef.current.src = URL.createObjectURL(currentSong.file);
            document.title = `${currentSong.title} - ${currentSong.artist}`;
            if (isPlaying) {
               audioRef.current.play().catch(e => console.error("Error playing audio:", e));
            }
        } else {
            document.title = 'Offline Music Player';
        }
    }, [currentSong]);

    const playSong = useCallback((index: number) => {
        setCurrentSongIndex(index);
        setIsPlaying(true);
        incrementPlayCount(songs[index].id);
    }, [songs]);

    const handlePlayPause = () => {
        if (currentSongIndex === null && songs.length > 0) {
            playSong(playQueue[0] ?? 0);
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handlePrev = () => {
        if (songs.length === 0 || currentSongIndex === null) return;
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }
        const currentQueueIndex = playQueue.indexOf(currentSongIndex);
        const prevQueueIndex = currentQueueIndex - 1;
        if (prevQueueIndex >= 0) {
            playSong(playQueue[prevQueueIndex]);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);

        const newSongs: Song[] = [];
        for (const file of Array.from(files)) {
            if (file.type.startsWith('audio/')) {
                try {
                    const tags: any = await new Promise((resolve, reject) => {
                        jsmediatags.read(file, { onSuccess: resolve, onError: reject });
                    });
                    
                    const newSong: Song = {
                        id: `${file.name}-${file.lastModified}`,
                        file: file,
                        fileName: file.name,
                        title: tags.tags.title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: tags.tags.artist || 'Unknown Artist',
                        album: tags.tags.album || 'Unknown Album',
                        duration: 0, // Will be set on metadata load
                        playCount: 0,
                        dateAdded: Date.now(),
                    };
                    newSongs.push(newSong);
                } catch (error) {
                    console.error("Error reading media tags for file:", file.name, error);
                     const newSong: Song = {
                        id: `${file.name}-${file.lastModified}`,
                        file: file,
                        fileName: file.name,
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        duration: 0,
                        playCount: 0,
                        dateAdded: Date.now(),
                    };
                    newSongs.push(newSong);
                }
            }
        }

        if (newSongs.length > 0) {
            await addSongs(newSongs);
            const allSongs = await getSongs();
            setSongs(allSongs);
            setPlayQueue(allSongs.map((_, index) => index));
        }
        setIsLoading(false);
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value));
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const toggleShuffle = () => {
        setShuffleMode(prev => {
            const newMode = prev === 'none' ? 'random' : 'none';
            if (newMode === 'random') {
                const shuffled = [...songs.map((_, i) => i)].sort(() => Math.random() - 0.5);
                setPlayQueue(shuffled);
            } else {
                const originalOrder = songs.map((_, index) => index);
                setPlayQueue(originalOrder);
            }
            return newMode;
        });
    };

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'none') return 'all';
            if (prev === 'all') return 'one';
            return 'none';
        });
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
            <main className="flex-grow p-4 overflow-y-auto pb-32">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">My Library</h1>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full flex items-center"
                    >
                        <FolderIcon />
                        <span className="ml-2">Add Songs</span>
                    </button>
                    <input
                        type="file"
                        multiple
                        accept="audio/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <SpinnerIcon />
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {songs.map((song, index) => (
                            <li
                                key={song.id}
                                onClick={() => playSong(index)}
                                className={`p-3 rounded-lg flex justify-between items-center cursor-pointer ${currentSong?.id === song.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                            >
                                <div>
                                    <div className="font-semibold">{song.title}</div>
                                    <div className="text-sm text-gray-400">{song.artist}</div>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {/* Duration can be displayed here once available */}
                                </div>
                            </li>
                        ))}
                        {songs.length === 0 && !isLoading && <p className="text-center text-gray-500 mt-8">No songs in library. Add some!</p>}
                    </ul>
                )}
            </main>

            {/* Player Bar */}
            <footer className="bg-gray-800 p-4 fixed bottom-0 w-full">
                <div className="flex items-center">
                    <div className="w-1/4">
                        {currentSong && (
                            <div>
                                <div className="font-bold truncate">{currentSong.title}</div>
                                <div className="text-sm text-gray-400 truncate">{currentSong.artist}</div>
                            </div>
                        )}
                    </div>
                    <div className="w-2/4 flex flex-col items-center">
                        <div className="flex items-center space-x-6">
                            <button onClick={toggleShuffle}><ShuffleIcon isActive={shuffleMode !== 'none'} /></button>
                            <button onClick={handlePrev} disabled={currentSongIndex === null}><PrevIcon /></button>
                            <button onClick={handlePlayPause} className="w-12 h-12 bg-white text-gray-900 rounded-full flex items-center justify-center disabled:opacity-50" disabled={songs.length === 0}>
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </button>
                            <button onClick={handleNext} disabled={currentSongIndex === null}><NextIcon /></button>
                            <button onClick={toggleRepeat}><RepeatIcon mode={repeatMode} /></button>
                        </div>
                        <div className="w-full flex items-center space-x-2 mt-2">
                            <span>{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                disabled={currentSongIndex === null}
                            />
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="w-1/4 flex items-center justify-end">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </footer>
            <audio ref={audioRef} />
        </div>
    );
};

export default App;
