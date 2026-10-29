import React from 'react';
import { Star, Play, RotateCcw, ArrowRight, Volume2, VolumeX, X, Trophy } from 'lucide-react';
import { LevelData } from './rules';

// ----------------------------------------------------
// Title Screen
// ----------------------------------------------------
interface TitleScreenProps {
  onStart: () => void;
  onOpenLevelSelect: () => void;
  totalCoins: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenLevelSelect,
  totalCoins,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-6 sm:p-10 z-20 bg-gradient-to-b from-teal-900/90 via-teal-800/80 to-emerald-950/95 text-white select-none">
      {/* Top Header stats */}
      <div className="w-full max-w-2xl flex justify-between items-center">
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl shadow">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="6.5" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
          </svg>
          <span className="font-bold text-sm sm:text-base tabular-nums text-white">
            {totalCoins} COINS
          </span>
        </div>
      </div>

      {/* Hero Centerpiece & Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-lg my-auto animate-fade-in">
        {/* Isometric 3D Block SVG Logo Emblem */}
        <div className="relative mb-6 drop-shadow-2xl">
          <svg className="w-28 h-28 sm:w-36 sm:h-36" viewBox="0 0 140 140" fill="none">
            {/* Soft contact shadow */}
            <ellipse cx="70" cy="115" rx="50" ry="18" fill="rgba(15, 23, 42, 0.45)" />

            {/* Base platform tile with colorful side */}
            <polygon points="70,75 120,95 70,115 20,95" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
            <polygon points="20,95 70,115 70,125 20,105" fill="#8b5cf6" />
            <polygon points="70,115 120,95 120,105 70,125" fill="#3b82f6" />

            {/* Target hole detail */}
            <polygon points="70,83 95,93 70,103 45,93" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />

            {/* Pink rectangular cuboid block standing upright */}
            <polygon points="70,25 95,37 70,49 45,37" fill="#fce7f3" stroke="#be123c" strokeWidth="2" />
            <polygon points="45,37 70,49 70,89 45,77" fill="#f43f5e" stroke="#be123c" strokeWidth="2" />
            <polygon points="70,49 95,37 95,77 70,89" fill="#be123c" stroke="#881337" strokeWidth="2" />

            {/* Shiny glossy highlights */}
            <polygon points="49,42 66,51 66,82 49,73" fill="rgba(255, 255, 255, 0.3)" />
          </svg>
        </div>

        {/* Title Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          Block Roll 3D
        </h1>
        <p className="mt-2 text-sm sm:text-base text-emerald-100/90 font-medium max-w-sm">
          Tumble the pink block across colorful winding paths and land upright on the target!
        </p>

        {/* Primary Action Button */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full max-w-xs">
          <button
            data-start="true"
            onClick={onStart}
            className="flex-1 py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-emerald-950 font-black text-lg tracking-wide uppercase transition shadow-[0_10px_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Play className="w-5 h-5 fill-current" />
            Play Now
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="py-4 px-5 rounded-2xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 font-bold text-sm tracking-wide border border-emerald-400/40 transition shadow-lg cursor-pointer active:scale-98"
          >
            Levels
          </button>
        </div>
      </div>

      {/* Control Hint Line at bottom */}
      <footer className="text-xs sm:text-sm text-emerald-200/75 font-medium tracking-wide">
        WASD / Arrows to Roll · Space / Enter to Start · Esc to Pause
      </footer>
    </div>
  );
};

// ----------------------------------------------------
// Victory Modal
// ----------------------------------------------------
interface VictoryModalProps {
  levelNumber: number;
  levelName: string;
  moves: number;
  parMoves: number;
  coinsEarned: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  levelNumber,
  levelName,
  moves,
  parMoves,
  coinsEarned,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onLevelSelect,
}) => {
  const stars = moves <= parMoves ? 3 : moves <= Math.round(parMoves * 1.5) ? 2 : 1;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-emerald-950/75 select-none animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-teal-900 to-emerald-950 border-2 border-amber-400/50 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-center text-white flex flex-col items-center">
        {/* Star Badge Cluster */}
        <div className="flex items-center gap-2 mb-2">
          <Star
            className={`w-9 h-9 ${
              stars >= 1 ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-emerald-800'
            }`}
          />
          <Star
            className={`w-12 h-12 -translate-y-2 ${
              stars >= 2 ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.9)]' : 'text-emerald-800'
            }`}
          />
          <Star
            className={`w-9 h-9 ${
              stars >= 3 ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-emerald-800'
            }`}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase text-amber-300 tracking-tight">
          Level Complete!
        </h2>
        <p className="text-xs sm:text-sm text-emerald-200/80 font-medium mt-0.5">
          Level {levelNumber}: {levelName}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full my-5">
          <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-500/20 flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Moves Taken</span>
            <span className="text-2xl font-black text-white tabular-nums">{moves}</span>
            <span className="text-[10px] text-emerald-300/70 font-semibold">Par: {parMoves}</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-900/60 border border-emerald-500/20 flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Coins Found</span>
            <span className="text-2xl font-black text-amber-300 tabular-nums">+{coinsEarned}</span>
            <span className="text-[10px] text-amber-200/70 font-semibold">Gold Bonus</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5 w-full">
          {hasNextLevel ? (
            <button
              data-start="true"
              onClick={onNextLevel}
              className="w-full py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-emerald-950 font-black text-base uppercase tracking-wide transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Next Level</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              data-start="true"
              onClick={onLevelSelect}
              className="w-full py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-base uppercase tracking-wide transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Trophy className="w-5 h-5" />
              <span>All Levels Cleared!</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReplay}
              className="py-2.5 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold text-xs uppercase tracking-wider border border-emerald-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay</span>
            </button>

            <button
              onClick={onLevelSelect}
              className="py-2.5 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold text-xs uppercase tracking-wider border border-emerald-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Stages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Pause Modal
// ----------------------------------------------------
interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onLevelSelect,
  onTitle,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-emerald-950/80 select-none animate-fade-in">
      <div className="w-full max-w-xs rounded-3xl bg-gradient-to-b from-teal-900 to-emerald-950 border border-emerald-500/40 p-6 shadow-2xl text-center text-white flex flex-col items-center">
        <h2 className="text-2xl font-black uppercase text-emerald-100 tracking-wide mb-5">
          Game Paused
        </h2>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-base uppercase tracking-wide transition shadow cursor-pointer active:scale-98 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Resume
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white font-bold text-sm uppercase tracking-wide border border-emerald-400/30 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Level
          </button>

          <button
            onClick={onLevelSelect}
            className="w-full py-3 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white font-bold text-sm uppercase tracking-wide border border-emerald-400/30 transition cursor-pointer"
          >
            Level Select
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>Sound: {isMuted ? 'OFF' : 'ON'}</span>
          </button>

          <button
            onClick={onTitle}
            className="w-full py-2.5 px-4 rounded-xl text-emerald-400 hover:text-white font-medium text-xs transition cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Level Select Drawer / Modal
// ----------------------------------------------------
interface LevelSelectModalProps {
  levels: LevelData[];
  currentLevelId: number;
  maxUnlockedLevel: number;
  onSelectLevel: (levelIndex: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  maxUnlockedLevel,
  onSelectLevel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-emerald-950/85 select-none animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-teal-900 to-emerald-950 border border-emerald-500/40 p-6 shadow-2xl text-white flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
          <div>
            <h2 className="text-xl font-black uppercase text-amber-300 tracking-wide">
              Select Stage
            </h2>
            <p className="text-xs text-emerald-200/70">Pick a puzzle to solve</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-800 flex items-center justify-center text-emerald-300 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 overflow-y-auto">
          {levels.map((lvl, idx) => {
            const isUnlocked = lvl.id <= maxUnlockedLevel;
            const isCurrent = lvl.id === currentLevelId;

            return (
              <button
                key={lvl.id}
                disabled={!isUnlocked}
                onClick={() => {
                  onSelectLevel(idx);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition ${
                  isCurrent
                    ? 'bg-amber-400 text-emerald-950 border-amber-300 shadow-md scale-[1.02]'
                    : isUnlocked
                    ? 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-500/30 text-white cursor-pointer'
                    : 'bg-emerald-950/40 border-emerald-900/30 text-emerald-700/60 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isCurrent ? 'text-emerald-900' : 'text-emerald-400'}`}>
                    Level {lvl.id}
                  </span>
                  {isUnlocked ? (
                    <span className="text-xs font-bold">★ {lvl.parMoves} par</span>
                  ) : (
                    <span className="text-xs">🔒 Locked</span>
                  )}
                </div>
                <div className="mt-1">
                  <h3 className="font-extrabold text-sm truncate">{lvl.name}</h3>
                  <p className={`text-[11px] truncate ${isCurrent ? 'text-emerald-900/80' : 'text-emerald-300/60'}`}>
                    {lvl.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
