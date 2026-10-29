import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LEVELS, Direction, getThreeStepHints, HintResult, BlockState } from './game/rules';
import { GameView } from './game/GameView';
import { HUD } from './game/HUD';
import { TitleScreen, VictoryModal, PauseModal, LevelSelectModal } from './game/Modals';
import { sounds } from './game/audio';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('block_roll_unlocked');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const [totalCoins, setTotalCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('block_roll_coins');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [moves, setMoves] = useState<number>(0);
  const [coinsEarnedInLevel, setCoinsEarnedInLevel] = useState<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [hintResult, setHintResult] = useState<HintResult | null>(null);

  // References to invoke Three.js callbacks
  const moveHandlerRef = useRef<((dir: Direction) => void) | null>(null);
  const restartHandlerRef = useRef<(() => void) | null>(null);
  const undoHandlerRef = useRef<(() => void) | null>(null);
  const getStateHandlerRef = useRef<(() => BlockState) | null>(null);

  // Sync state machine with document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Support ?autostart=1
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      setGameState('playing');
    }
  }, []);

  const currentLevel = LEVELS[currentLevelIdx] || LEVELS[0];

  // Start game handler
  const handleStartGame = useCallback(() => {
    sounds.playClick();
    setGameState('playing');
    setMoves(0);
    setCoinsEarnedInLevel(0);
  }, []);

  // Next level handler
  const handleNextLevel = useCallback(() => {
    sounds.playClick();
    if (currentLevelIdx < LEVELS.length - 1) {
      const nextIdx = currentLevelIdx + 1;
      setCurrentLevelIdx(nextIdx);
      const nextLvlId = LEVELS[nextIdx].id;
      if (nextLvlId > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLvlId);
        try {
          localStorage.setItem('block_roll_unlocked', String(nextLvlId));
        } catch {
          // ignore
        }
      }
      setMoves(0);
      setCoinsEarnedInLevel(0);
      setGameState('playing');
    }
  }, [currentLevelIdx, maxUnlockedLevel]);

  // Win trigger
  const handleWin = useCallback(
    (finalMoves: number) => {
      setMoves(finalMoves);
      setGameState('gameover');
      // Unlock next level if available
      const nextLvlId = currentLevel.id + 1;
      if (nextLvlId <= LEVELS.length && nextLvlId > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLvlId);
        try {
          localStorage.setItem('block_roll_unlocked', String(nextLvlId));
        } catch {
          // ignore
        }
      }
    },
    [currentLevel.id, maxUnlockedLevel]
  );

  // Fall trigger (block fell into the void)
  const handleFall = useCallback(() => {
    // GameView automatically resets state after a brief fall animation
  }, []);

  // Coin collected
  const handleCoinCollected = useCallback((_totalLevelCoins: number, newlyEarned: number) => {
    setCoinsEarnedInLevel((prev) => prev + newlyEarned);
    setTotalCoins((prev) => {
      const updated = prev + newlyEarned;
      try {
        localStorage.setItem('block_roll_coins', String(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  }, []);

  // Toggle Pause
  const handleTogglePause = useCallback(() => {
    sounds.playClick();
    setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  }, []);

  // Toggle 3-step hint
  const handleToggleHint = useCallback(() => {
    setShowHint((prev) => {
      const next = !prev;
      if (next) {
        if (getStateHandlerRef.current) {
          const currentState = getStateHandlerRef.current();
          const res = getThreeStepHints(currentState, currentLevel);
          setHintResult(res);
        }
        sounds.playHint();
      } else {
        setHintResult(null);
        sounds.playClick();
      }
      return next;
    });
  }, [currentLevel]);

  // Keep 3-step hints in sync if moves change while hints are shown
  useEffect(() => {
    if (showHint && getStateHandlerRef.current) {
      const currentState = getStateHandlerRef.current();
      const res = getThreeStepHints(currentState, currentLevel);
      setHintResult(res);
    }
  }, [moves, showHint, currentLevel]);

  // Restart level
  const handleRestart = useCallback(() => {
    setMoves(0);
    setCoinsEarnedInLevel(0);
    if (restartHandlerRef.current) {
      restartHandlerRef.current();
    }
    if (showHint) {
      const res = getThreeStepHints(currentLevel.start, currentLevel);
      setHintResult(res);
    }
    if (gameState === 'paused' || gameState === 'gameover') {
      setGameState('playing');
    }
  }, [gameState, showHint, currentLevel]);

  // Undo move
  const handleUndo = useCallback(() => {
    if (undoHandlerRef.current) {
      undoHandlerRef.current();
    }
  }, []);

  // Move trigger from HUD or Virtual D-Pad
  const handleMove = useCallback((dir: Direction) => {
    if (moveHandlerRef.current) {
      moveHandlerRef.current(dir);
    }
  }, []);

  // Select level from modal
  const handleSelectLevel = useCallback((levelIdx: number) => {
    setCurrentLevelIdx(levelIdx);
    setMoves(0);
    setCoinsEarnedInLevel(0);
    setShowHint(false);
    setHintResult(null);
    setGameState('playing');
  }, []);

  // Global keyboard shortcuts for Enter / Space / Esc / Mute / Hint
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
        }
      } else if (gameState === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (currentLevelIdx < LEVELS.length - 1) {
            handleNextLevel();
          } else {
            setShowLevelSelect(true);
          }
        }
      } else if (gameState === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handleTogglePause();
        } else if (e.key === 'm' || e.key === 'M') {
          handleToggleMute();
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleToggleHint();
        }
      } else if (gameState === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setGameState('playing');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, handleStartGame, handleNextLevel, handleTogglePause, handleToggleMute, handleToggleHint, currentLevelIdx]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#32bfa0] relative font-sans text-slate-800">
      {/* 3D Scene Canvas Viewport */}
      <GameView
        level={currentLevel}
        hints={showHint && hintResult ? hintResult.steps : null}
        onMoveChange={setMoves}
        onCoinCollected={handleCoinCollected}
        onWin={handleWin}
        onFall={handleFall}
        isPaused={gameState !== 'playing'}
        onRegisterMoveHandler={(fn) => {
          moveHandlerRef.current = fn;
        }}
        onRegisterRestartHandler={(fn) => {
          restartHandlerRef.current = fn;
        }}
        onRegisterUndoHandler={(fn) => {
          undoHandlerRef.current = fn;
        }}
        onRegisterGetState={(fn) => {
          getStateHandlerRef.current = fn;
        }}
        canUndoChange={setCanUndo}
      />

      {/* In-Game HUD (active during playing or paused) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          totalCoins={totalCoins}
          moves={moves}
          parMoves={currentLevel.parMoves}
          isMuted={isMuted}
          canUndo={canUndo}
          showHint={showHint}
          hintResult={hintResult}
          onRestart={handleRestart}
          onUndo={handleUndo}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onMove={handleMove}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          onToggleHint={handleToggleHint}
          onCloseHint={() => {
            setShowHint(false);
            setHintResult(null);
          }}
        />
      )}

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          totalCoins={totalCoins}
        />
      )}

      {/* Victory Modal */}
      {gameState === 'gameover' && (
        <VictoryModal
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          moves={moves}
          parMoves={currentLevel.parMoves}
          coinsEarned={coinsEarnedInLevel}
          hasNextLevel={currentLevelIdx < LEVELS.length - 1}
          onNextLevel={handleNextLevel}
          onReplay={handleRestart}
          onLevelSelect={() => {
            setGameState('playing');
            setShowLevelSelect(true);
          }}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={handleRestart}
          onLevelSelect={() => {
            setShowLevelSelect(true);
          }}
          onTitle={() => setGameState('title')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Level Select Modal */}
      {showLevelSelect && (
        <LevelSelectModal
          levels={LEVELS}
          currentLevelId={currentLevel.id}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLevelSelect(false)}
        />
      )}
    </main>
  );
}
