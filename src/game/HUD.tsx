import React from 'react';
import { Direction, HintResult } from './rules';
import { RotateCcw, Undo2, Volume2, VolumeX, Pause, ChevronRight, Lightbulb, X } from 'lucide-react';

interface HUDProps {
  levelNumber: number;
  levelName: string;
  totalCoins: number;
  moves: number;
  parMoves: number;
  isMuted: boolean;
  canUndo: boolean;
  showHint: boolean;
  hintResult: HintResult | null;
  onRestart: () => void;
  onUndo: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onMove: (dir: Direction) => void;
  onOpenLevelSelect: () => void;
  onToggleHint: () => void;
  onCloseHint: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  levelNumber,
  levelName,
  totalCoins,
  moves,
  parMoves,
  isMuted,
  canUndo,
  showHint,
  hintResult,
  onRestart,
  onUndo,
  onToggleMute,
  onTogglePause,
  onMove,
  onOpenLevelSelect,
  onToggleHint,
  onCloseHint,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-10 select-none">
      {/* Top Bar Cluster */}
      <header className="flex flex-col items-center w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between w-full">
          {/* Left: Coin Badge */}
          <div className="pointer-events-auto flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/30 text-amber-300 px-3.5 py-1.5 rounded-2xl shadow-lg">
            <svg
              className="w-5 h-5 text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6.5" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
              <polygon points="12,8 13.2,10.8 16,11.2 13.8,13.2 14.5,16 12,14.5 9.5,16 10.2,13.2 8,11.2 10.8,10.8" fill="#F59E0B" />
            </svg>
            <span className="font-bold text-base sm:text-lg tabular-nums tracking-wide text-white drop-shadow">
              {totalCoins}
            </span>
          </div>

          {/* Center: Level Indicator Badge */}
          <button
            onClick={onOpenLevelSelect}
            className="pointer-events-auto flex flex-col items-center group cursor-pointer px-4 py-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 hover:border-emerald-400/60 transition shadow-lg"
            aria-label="Select Level"
            title="Click to select level"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300">
                LEVEL {levelNumber}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition" />
            </div>
            <span className="text-white text-xs sm:text-sm font-semibold opacity-95">
              {levelName}
            </span>
          </button>

          {/* Right: Actions Cluster (Hint, Undo, Restart, Audio, Pause) */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {/* Moves / Par pill */}
            <div className="hidden sm:flex items-center gap-1 bg-emerald-950/70 border border-emerald-500/30 text-emerald-100 text-xs px-3 py-2 rounded-xl">
              <span className="text-emerald-400 font-medium">MOVES</span>
              <span className="font-bold text-white tabular-nums">{moves}</span>
              <span className="text-emerald-400/60">/{parMoves}</span>
            </div>

            {/* 3-Step Hint Button */}
            <button
              onClick={onToggleHint}
              className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition shadow-md cursor-pointer active:scale-95 ${
                showHint
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30'
                  : 'bg-emerald-900/80 border-emerald-400/40 text-amber-300 hover:bg-emerald-800 hover:text-amber-200'
              }`}
              aria-label="Toggle 3-step hints"
              title="Next 3 steps hint (H)"
            >
              <Lightbulb className={`w-4 h-4 sm:w-5 sm:h-5 ${showHint ? 'text-slate-950 animate-pulse' : 'text-amber-300'}`} />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-slate-950 border border-emerald-950 shadow">
                3
              </span>
            </button>

            {/* Undo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition shadow-md ${
                canUndo
                  ? 'bg-emerald-900/80 border-emerald-400/40 text-emerald-200 hover:bg-emerald-800 hover:text-white cursor-pointer active:scale-95'
                  : 'bg-emerald-950/40 border-emerald-900/30 text-emerald-700 cursor-not-allowed opacity-50'
              }`}
              aria-label="Undo move"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Restart Button */}
            <button
              onClick={onRestart}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-800 hover:text-white cursor-pointer transition shadow-md active:scale-95"
              aria-label="Restart level"
              title="Restart (R)"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-800 hover:text-white cursor-pointer transition shadow-md active:scale-95"
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-300" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Pause Button */}
            <button
              onClick={onTogglePause}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-800 hover:text-white cursor-pointer transition shadow-md active:scale-95"
              aria-label="Pause game"
              title="Pause (Esc / P)"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Floating 3-Step Hint Panel */}
        {showHint && hintResult && (
          <div className="pointer-events-auto mt-3 w-full max-w-lg bg-emerald-950/90 backdrop-blur-md border-2 border-amber-400/60 rounded-2xl p-3 sm:p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    Next 3 Steps Hint
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                      3-Move Guide
                    </span>
                  </h2>
                  <p className="text-[10px] sm:text-xs text-emerald-200/90 font-medium">
                    Follow the numbered path markers to reach the goal
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseHint}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Close hints"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hintResult.isDeadEnd && (
              <div className="mb-2.5 p-2 rounded-xl bg-red-950/80 border border-red-500/50 text-red-100 text-xs flex items-start gap-2">
                <span className="text-base leading-none">⚠️</span>
                <div className="text-[11px] leading-tight">
                  <strong className="font-bold text-red-300">Dead End!</strong> The block cannot reach the target from this position. Use <strong className="underline">Undo</strong> or <strong className="underline">Restart</strong>. Showing the opening 3 steps from start:
                </div>
              </div>
            )}

            {/* The 3 Steps Cards */}
            <div className="grid grid-cols-3 gap-2">
              {hintResult.steps.map((step) => {
                const stepTheme =
                  step.stepNumber === 1
                    ? {
                        badge: 'bg-amber-500 text-slate-950 font-black',
                        card: 'border-amber-400/60 bg-amber-950/40 text-amber-200',
                        btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
                      }
                    : step.stepNumber === 2
                    ? {
                        badge: 'bg-cyan-400 text-slate-950 font-black',
                        card: 'border-cyan-400/60 bg-cyan-950/40 text-cyan-200',
                        btn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
                      }
                    : {
                        badge: 'bg-pink-500 text-slate-950 font-black',
                        card: 'border-pink-400/60 bg-pink-950/40 text-pink-200',
                        btn: 'bg-pink-500 hover:bg-pink-400 text-white',
                      };

                return (
                  <div
                    key={step.stepNumber}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl border ${stepTheme.card} shadow-md`}
                  >
                    <div className="flex items-center gap-1 w-full justify-between mb-1">
                      <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md ${stepTheme.badge}`}>
                        STEP {step.stepNumber}
                      </span>
                      <span className="text-sm sm:text-base font-black">{step.arrow}</span>
                    </div>

                    <div className="text-center font-extrabold text-xs sm:text-sm my-1 tracking-wide">
                      {step.label}
                    </div>

                    {step.stepNumber === 1 && !hintResult.isDeadEnd ? (
                      <button
                        onClick={() => onMove(step.direction)}
                        className={`w-full mt-1 py-1 px-1.5 rounded-lg ${stepTheme.btn} font-extrabold text-[10px] sm:text-xs transition shadow active:scale-95 cursor-pointer`}
                        title={`Execute move ${step.label}`}
                      >
                        Roll {step.arrow}
                      </button>
                    ) : (
                      <div className="text-[10px] text-white/60 font-medium">
                        {step.stepNumber === 2 ? 'Next' : 'Follow up'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-300">
              <span>Glowing 1, 2, 3 footprint rings shown on 3D tiles</span>
              <span className="text-amber-300 font-bold">Press 'H' to toggle</span>
            </div>
          </div>
        )}
      </header>

      {/* Bottom Controls: Tilted Isometric Diamond Controller placed on the right */}
      <footer className="w-full flex justify-end items-end p-2 sm:p-4 pr-3 sm:pr-8 pb-3 sm:pb-6 pointer-events-none">
        {/* Tilted Isometric Diamond D-Pad */}
        <div className="pointer-events-auto relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center p-2 rounded-3xl bg-emerald-950/80 border-2 border-emerald-500/40 shadow-2xl backdrop-blur-sm">
          {/* Top-Right: UP (↗ in isometric screen space) */}
          <button
            onClick={() => onMove('UP')}
            className="absolute top-2 right-4 sm:right-5 w-16 h-13 sm:w-18 sm:h-14 flex flex-col items-center justify-center rounded-2xl bg-emerald-800/90 hover:bg-pink-600 active:bg-pink-500 border-2 border-emerald-400/40 hover:border-pink-300 text-white font-bold transition shadow-lg active:scale-95 cursor-pointer group"
            aria-label="Move Up-Right"
            title="Up-Right (W / Arrow Up)"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-pink-300 group-hover:text-white transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-pink-200 group-hover:text-white">
              UP ↗
            </span>
          </button>

          {/* Top-Left: LEFT (↖ in isometric screen space) */}
          <button
            onClick={() => onMove('LEFT')}
            className="absolute top-2 left-4 sm:left-5 w-16 h-13 sm:w-18 sm:h-14 flex flex-col items-center justify-center rounded-2xl bg-emerald-800/90 hover:bg-pink-600 active:bg-pink-500 border-2 border-emerald-400/40 hover:border-pink-300 text-white font-bold transition shadow-lg active:scale-95 cursor-pointer group"
            aria-label="Move Up-Left"
            title="Up-Left (A / Arrow Left)"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-pink-300 group-hover:text-white transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="17" y1="17" x2="7" y2="7" />
              <polyline points="17 7 7 7 7 17" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-pink-200 group-hover:text-white">
              ↖ LEFT
            </span>
          </button>

          {/* Bottom-Left: DOWN (↙ in isometric screen space) */}
          <button
            onClick={() => onMove('DOWN')}
            className="absolute bottom-2 left-4 sm:left-5 w-16 h-13 sm:w-18 sm:h-14 flex flex-col items-center justify-center rounded-2xl bg-emerald-800/90 hover:bg-pink-600 active:bg-pink-500 border-2 border-emerald-400/40 hover:border-pink-300 text-white font-bold transition shadow-lg active:scale-95 cursor-pointer group"
            aria-label="Move Down-Left"
            title="Down-Left (S / Arrow Down)"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-pink-300 group-hover:text-white transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="17" y1="7" x2="7" y2="17" />
              <polyline points="17 17 7 17 7 7" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-pink-200 group-hover:text-white">
              ↙ DOWN
            </span>
          </button>

          {/* Bottom-Right: RIGHT (↘ in isometric screen space) */}
          <button
            onClick={() => onMove('RIGHT')}
            className="absolute bottom-2 right-4 sm:right-5 w-16 h-13 sm:w-18 sm:h-14 flex flex-col items-center justify-center rounded-2xl bg-emerald-800/90 hover:bg-pink-600 active:bg-pink-500 border-2 border-emerald-400/40 hover:border-pink-300 text-white font-bold transition shadow-lg active:scale-95 cursor-pointer group"
            aria-label="Move Down-Right"
            title="Down-Right (D / Arrow Right)"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-pink-300 group-hover:text-white transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="7" x2="17" y2="17" />
              <polyline points="7 17 17 17 17 7" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-pink-200 group-hover:text-white">
              RIGHT ↘
            </span>
          </button>

          {/* Center Isometric Diamond Badge */}
          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-emerald-950 border-2 border-pink-400/70 rotate-45 flex items-center justify-center shadow-lg z-10 pointer-events-none">
            <div className="-rotate-45 flex flex-col items-center justify-center">
              <span className="text-[8px] sm:text-[9px] text-pink-300 font-extrabold tracking-tighter">
                MOVES
              </span>
              <span className="text-sm sm:text-base font-black text-white tabular-nums leading-none">
                {moves}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
