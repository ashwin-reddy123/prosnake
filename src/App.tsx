import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Volume2, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

const TRACKS = [
  { id: 1, title: 'AI Track 1: NEON DRIVE', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'AI Track 2: CYBERPUNK AWAKENING', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'AI Track 3: SYNTHWAVE DREAMS', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];

const generateFood = (currentSnake: { x: number; y: number }[]) => {
  if (currentSnake.length >= GRID_SIZE * GRID_SIZE) return { x: 0, y: 0 };
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    const onSnake = currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
    if (!onSnake) break;
  }
  return newFood;
};

export default function App() {
  // Snake State
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const nextDir = useRef({ x: 1, y: 0 });
  const lastTickDir = useRef({ x: 1, y: 0 });

  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // --- Snake Game Logic ---
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 10 });
    nextDir.current = { x: 1, y: 0 };
    lastTickDir.current = { x: 1, y: 0 };
    setGameOver(false);
    setScore(0);
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !isStarted || isPaused) return;

    setSnake(prev => {
      const head = prev[0];
      const dir = nextDir.current;
      lastTickDir.current = dir;

      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return prev;
      }

      // Self collision
      if (prev.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameOver(true);
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // remove tail
      }

      return newSnake;
    });
  }, [food, gameOver, isStarted, isPaused, highScore]);

  useEffect(() => {
    const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const interval = setInterval(moveSnake, currentSpeed);
    return () => clearInterval(interval);
  }, [moveSnake, score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys, but only if the game has started
      if (isStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!isStarted && e.key === ' ') {
        setIsStarted(true);
        setIsPlaying(true);
        return;
      }
      
      const { x, y } = lastTickDir.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (y !== 1) nextDir.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (y !== -1) nextDir.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (x !== 1) nextDir.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (x !== -1) nextDir.current = { x: 1, y: 0 };
          break;
        case ' ':
          if (isStarted && !gameOver) {
            setIsPaused(p => !p);
          } else if (gameOver) {
            resetGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, gameOver]);

  // --- Audio Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => nextTrack();
    audio.addEventListener('ended', handleEnded);

    if (isPlaying) {
      audio.play().catch(e => {
        console.warn("Autoplay prevented:", e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // --- Render logic ---
  if (!isStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] text-white font-sans">
        <div className="text-center space-y-8 neon-border p-12 rounded-xl bg-black/80 backdrop-blur-md max-w-xl mx-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-widest text-[#0ff] [text-shadow:0_0_15px_#0ff,0_0_30px_#0ff]">NEON SNAKE</h1>
          <p className="text-xl md:text-2xl text-pink-400 [text-shadow:0_0_10px_#f0f] tracking-wide">+ SYNTHWAVE PLAYER</p>
          <div className="text-gray-400 text-sm space-y-2 mt-4 text-left p-4 bg-white/5 rounded border border-white/10">
            <p className="text-center text-gray-300">Welcome to the grid. Collect glowing data nodes while tuning into experimental synth waves.</p>
            <div className="flex flex-wrap gap-4 justify-center mt-6 text-cyan-400 font-mono">
               <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><ArrowUp size={16}/> W</span>
               <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><ArrowDown size={16}/> S</span>
               <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><ArrowLeft size={16}/> A</span>
               <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><ArrowRight size={16}/> D</span>
               <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">[SPACE]</span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsStarted(true);
              setIsPlaying(true);
              if (audioRef.current) audioRef.current.play().catch(e => console.warn(e));
            }}
            className="mt-8 px-10 py-4 bg-cyan-950/50 border-2 border-[#0ff] text-[#0ff] hover:bg-[#0ff] hover:text-black transition-all font-bold text-xl rounded-md shadow-[0_0_15px_#0ff] hover:shadow-[0_0_30px_#0ff] tracking-wider"
          >
            INITIALIZE SYSTEM
          </button>
        </div>
        <audio ref={audioRef} src={TRACKS[currentTrackIndex].src} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] text-white font-sans overflow-hidden">
      <audio ref={audioRef} src={TRACKS[currentTrackIndex].src} />

      <main className="flex-1 flex flex-col xl:flex-row items-center justify-center p-4 gap-8 my-auto h-full">
        {/* Sidebar Stats */}
        <div className="flex flex-col gap-6 w-full max-w-sm xl:w-72 neon-border p-6 rounded-lg bg-black/80 backdrop-blur shrink-0 mt-4 xl:mt-0">
          <div className="text-center pb-4 border-b border-cyan-900/50">
            <h2 className="text-3xl font-bold text-[#0ff] [text-shadow:0_0_10px_#0ff] tracking-wider mb-1">TERMINAL</h2>
            <div className="text-xs text-pink-400 tracking-widest [text-shadow:0_0_5px_#f0f] animate-pulse">SYSTEM_ONLINE</div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
              <div className="flex items-center gap-2 text-gray-400">
                <Trophy size={18} className="text-[#0ff]" />
                <span>Score:</span>
              </div>
              <span className="font-mono text-xl text-white font-bold [text-shadow:0_0_8px_#fff]">
                 {score.toString().padStart(4, '0')}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
              <span className="text-gray-400 pl-7">High Score:</span>
              <span className="font-mono text-cyan-400 font-bold">
                 {highScore.toString().padStart(4, '0')}
              </span>
            </div>
          </div>
          
          <div className="hidden xl:block mt-4 pt-4 border-t border-cyan-900/50 text-gray-500 text-xs text-center space-y-2">
            <p>MOVEMENT: W A S D / ARROWS</p>
            <p>PAUSE / START: SPACE</p>
          </div>
        </div>

        {/* Game Board container */}
        <div className="relative shrink-0 flex items-center justify-center m-2 xl:m-0">
          <div
            className="neon-border bg-black/90 grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: 'min(85vw, 600px)',
              height: 'min(85vw, 600px)',
              maxWidth: '80vh',
              maxHeight: '80vh'
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isSnakeHead = snake[0].x === x && snake[0].y === y;
              const isSnakeBody = snake.some((seg, idx) => idx !== 0 && seg.x === x && seg.y === y);
              const isFood = food.x === x && food.y === y;

              let cellClasses = 'w-full h-full border border-cyan-900/20 ';
              if (isSnakeHead) {
                cellClasses += 'bg-[#0ff] shadow-[0_0_15px_#0ff] z-10 scale-[1.05] relative';
              } else if (isSnakeBody) {
                cellClasses += 'bg-cyan-600/90 shadow-[0_0_8px_#0cc] scale-[0.9]';
              } else if (isFood) {
                cellClasses += 'bg-[#f0f] shadow-[0_0_15px_#f0f] animate-[pulse_1s_ease-in-out_infinite] rounded-full scale-[0.7] relative z-0';
              }

              return <div key={i} className={cellClasses} />;
            })}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center neon-border-pink backdrop-blur-sm z-20 transition-all duration-300 rounded">
              <h2 className="text-5xl md:text-6xl font-bold text-[#f0f] [text-shadow:0_0_20px_#f0f] mb-4 tracking-wider">CRASHED</h2>
              <p className="text-xl text-white mb-8 font-mono">Nodes Collected: <span className="text-cyan-400">{score / 10}</span></p>
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-pink-950/50 border-2 border-[#f0f] text-[#f0f] rounded hover:bg-[#f0f] hover:text-black transition-all shadow-[0_0_15px_#f0f] hover:shadow-[0_0_30px_#f0f] font-bold tracking-widest"
              >
                REBOOT SEQUENCE
              </button>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20 rounded">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-[0.4em] [text-shadow:0_0_15px_#fff]">PAUSED</h2>
            </div>
          )}
        </div>
      </main>

      {/* Music Player Footer */}
      <footer className="h-24 md:h-28 bg-black/95 border-t-2 border-[#f0f] shadow-[0_-5px_20px_rgba(255,0,255,0.15)] flex items-center justify-between px-4 lg:px-8 z-30 shrink-0 mt-auto drop-shadow-2xl">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[150px]">
          <div
            className="hidden md:flex w-14 h-14 bg-pink-950/50 border border-[#f0f] text-[#f0f] items-center justify-center rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(255,0,255,0.3)]"
            style={{ animation: isPlaying ? 'spin 4s linear infinite' : 'none' }}
          >
            <Music size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[#f0f] text-xs font-bold tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(255,0,255,0.8)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f0f] shadow-[0_0_5px_#f0f]" style={{opacity: isPlaying ? 1 : 0}}></span>
              Now Playing
            </p>
            <p className="text-gray-200 text-sm md:text-base truncate font-mono tracking-tight">{TRACKS[currentTrackIndex].title}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 md:gap-8 flex-1">
          <button
            onClick={prevTrack}
            className="text-cyan-600 hover:text-[#0ff] transition-all hover:scale-110 drop-shadow-[0_0_8px_#0cc]"
          >
            <SkipBack size={32} strokeWidth={1.5} />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-cyan-950 border-2 border-[#0ff] rounded-full text-[#0ff] hover:bg-cyan-900 transition-all hover:scale-[1.02] shadow-[0_0_15px_#0ff] hover:shadow-[0_0_25px_#0ff]"
          >
            {isPlaying ? <Pause size={32} strokeWidth={1.5} /> : <Play size={34} strokeWidth={1.5} className="ml-1" />}
          </button>
          <button
            onClick={nextTrack}
            className="text-cyan-600 hover:text-[#0ff] transition-all hover:scale-110 drop-shadow-[0_0_8px_#0cc]"
          >
            <SkipForward size={32} strokeWidth={1.5} />
          </button>
        </div>

        {/* Volume */}
        <div className="hidden md:flex justify-end items-center gap-3 w-1/4 min-w-[150px] text-cyan-500">
          <Volume2 size={24} strokeWidth={1.5} />
          <div className="relative flex items-center group w-24 md:w-32">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-cyan-900/30 relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
              <div
                className="absolute top-0 left-0 h-full bg-[#0ff] shadow-[0_0_10px_#0ff] transition-all duration-75"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
