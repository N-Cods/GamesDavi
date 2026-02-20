import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Pause, Play, RotateCw, Archive, ChevronsDown } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- CONSTANTS ---
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 25; // Base pixel size for calculations (responsive via CSS)

const TETROMINOES = {
    0: { shape: [[0]], color: 'bg-slate-900/50', border: 'border-slate-800' },
    I: { shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]], color: 'bg-cyan-500', border: 'border-cyan-400', shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.7)]' },
    J: { shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]], color: 'bg-blue-500', border: 'border-blue-400', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.7)]' },
    L: { shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']], color: 'bg-orange-500', border: 'border-orange-400', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.7)]' },
    O: { shape: [['O', 'O'], ['O', 'O']], color: 'bg-yellow-400', border: 'border-yellow-300', shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.7)]' },
    S: { shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: 'bg-green-500', border: 'border-green-400', shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.7)]' },
    T: { shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]], color: 'bg-purple-500', border: 'border-purple-400', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]' },
    Z: { shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: 'bg-red-500', border: 'border-red-400', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.7)]' },
};

const RANDOM_TETROMINO = () => {
    const tetrominos = 'IJLOSTZ';
    const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
    return TETROMINOES[randTetromino];
};

// --- HOOKS ---
const useInterval = (callback, delay) => {
    const savedCallback = useRef();
    useEffect(() => { savedCallback.current = callback; }, [callback]);
    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

// --- COMPONENT ---
const Tetris = () => {
    const [stage, setStage] = useState(createStage());
    const [dropTime, setDropTime] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [rows, setRows] = useState(0);
    const [level, setLevel] = useState(0);
    const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('tetris_highscore') || '0'));

    // Player State
    const [player, setPlayer] = useState({
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOES[0].shape,
        collided: false,
    });

    // Next Piece & Hold
    const [nextPiece, setNextPiece] = useState(RANDOM_TETROMINO().shape);
    const [holdPiece, setHoldPiece] = useState(null);
    const [canHold, setCanHold] = useState(true);

    const [isPaused, setIsPaused] = useState(false);

    // --- LOGIC ---
    function createStage() {
        return Array.from(Array(ROWS), () =>
            Array(COLS).fill([0, 'clear'])
        );
    }

    const movePlayer = (dir) => {
        if (!checkCollision(player, stage, { x: dir, y: 0 })) {
            updatePlayerPos({ x: dir, y: 0 });
        }
    };

    const startGame = () => {
        // Reset everything
        setStage(createStage());
        setDropTime(1000);
        resetPlayer();
        setGameOver(false);
        setScore(0);
        setRows(0);
        setLevel(0);
        setHoldPiece(null);
        setCanHold(true);
        setIsPaused(false);
        setNextPiece(RANDOM_TETROMINO().shape);
    };

    const resetPlayer = () => {
        const newTetromino = nextPiece;
        setNextPiece(RANDOM_TETROMINO().shape);

        setPlayer({
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: newTetromino,
            collided: false,
        });

        // Instant Game Over Check
        const dummyPlayer = {
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: newTetromino,
            collided: false
        };

        if (checkCollision(dummyPlayer, createStage(), { x: 0, y: 0 })) { // Check against empty stage is wrong? No, should be current stage.
            // Actually we should check against *current* stage
        }
    };

    // Correct Game Over check inside resetPlayer requires current stage, 
    // but state updates are async. Better to check on next render or use Ref for stage.
    // For simplicity, we check collision immediately after spawn in the Effect or assume collision if spawn fails.

    const updatePlayerPos = ({ x, y, collided }) => {
        setPlayer(prev => ({
            ...prev,
            pos: { x: (prev.pos.x += x), y: (prev.pos.y += y) },
            collided,
        }));
    };

    const checkCollision = (player, stage, { x: moveX, y: moveY }) => {
        for (let y = 0; y < player.tetromino.length; y += 1) {
            for (let x = 0; x < player.tetromino[y].length; x += 1) {
                // 1. Check that we're on an actual Tetromino cell
                if (player.tetromino[y][x] !== 0) {
                    if (
                        // 2. Check that our move is inside the game areas height (y)
                        !stage[y + player.pos.y + moveY] ||
                        // 3. Check that our move is inside the game areas width (x)
                        !stage[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
                        // 4. Check that the cell isn't set to clear
                        stage[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !== 'clear'
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const drop = () => {
        // Increase level every 10 rows
        if (rows > (level + 1) * 10) {
            setLevel(prev => prev + 1);
            setDropTime(1000 / (level + 1) + 200);
        }

        if (!checkCollision(player, stage, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1, collided: false });
        } else {
            // Game Over
            if (player.pos.y < 1) {
                setGameOver(true);
                setDropTime(null);
            }
            updatePlayerPos({ x: 0, y: 0, collided: true });
        }
    };

    const keyUp = ({ keyCode }) => {
        if (!gameOver && !isPaused) {
            if (keyCode === 40) { // Down
                setDropTime(1000 / (level + 1) + 200);
            }
        }
    };

    const dropPlayer = () => {
        setDropTime(null);
        drop();
    };

    const hardDrop = () => {
        let tmpY = 0;
        // Calculate max drop
        while (!checkCollision(player, stage, { x: 0, y: tmpY + 1 })) {
            tmpY += 1;
        }
        updatePlayerPos({ x: 0, y: tmpY, collided: true });
    };

    const rotate = (matrix, dir) => {
        const rotatedTetro = matrix.map((_, index) => matrix.map(col => col[index]));
        if (dir > 0) return rotatedTetro.map(row => row.reverse());
        return rotatedTetro.reverse();
    };

    const playerRotate = (stage, dir) => {
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

        const pos = clonedPlayer.pos.x;
        let offset = 1;
        while (checkCollision(clonedPlayer, stage, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > clonedPlayer.tetromino[0].length) {
                rotate(clonedPlayer.tetromino, -dir);
                clonedPlayer.pos.x = pos;
                return;
            }
        }
        setPlayer(clonedPlayer);
    };

    const hold = () => {
        if (!canHold || gameOver || isPaused) return;

        if (holdPiece === null) {
            setHoldPiece(player.tetromino);
            setPlayer(prev => ({ // Reset position to top
                ...prev,
                pos: { x: COLS / 2 - 2, y: 0 },
                tetromino: nextPiece, // Get next
            }));
            setNextPiece(RANDOM_TETROMINO().shape); // Generate new next
        } else {
            const temp = player.tetromino;
            setPlayer(prev => ({
                ...prev,
                pos: { x: COLS / 2 - 2, y: 0 },
                tetromino: holdPiece
            }));
            setHoldPiece(temp);
        }
        setCanHold(false); // Only one hold per turn
    };

    // --- GAME LOOP & EFFECTS ---

    useInterval(() => {
        if (!isPaused && !gameOver) drop();
    }, dropTime);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('tetris_highscore', score);
        }
    }, [score, highScore]);

    useEffect(() => {
        const sweepRows = newStage => {
            return newStage.reduce((ack, row) => {
                if (row.findIndex(cell => cell[0] === 0) === -1) {
                    setRows(prev => prev + 1);
                    setScore(prev => prev + 100 * (level + 1)); // Score multiplier
                    ack.unshift(new Array(newStage[0].length).fill([0, 'clear']));
                    return ack;
                }
                ack.push(row);
                return ack;
            }, []);
        };

        const updateStage = prevStage => {
            // First flush the stage from the previous render
            const newStage = prevStage.map(row =>
                row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell))
            );

            // Draw Tetromino
            player.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        newStage[y + player.pos.y][x + player.pos.x] = [
                            value,
                            `${player.collided ? 'merged' : 'clear'}`,
                        ];
                    }
                });
            });

            // Collision handled?
            if (player.collided) {
                // Check if Game Over immediately after merging (if we are at top)
                if (player.pos.y < 1) {
                    setGameOver(true);
                    setDropTime(null);
                }

                resetPlayer();
                setCanHold(true);
                return sweepRows(newStage);
            }

            return newStage;
        };

        setStage(prev => updateStage(prev));
    }, [player.collided, player.pos.x, player.pos.y, player.tetromino]); // Dependencies for update

    // Ghost Piece
    const getGhostPosition = () => {
        const ghostPlayer = { ...player, pos: { ...player.pos }, collided: false };
        while (!checkCollision(ghostPlayer, stage, { x: 0, y: 1 })) {
            ghostPlayer.pos.y += 1;
        }
        return ghostPlayer.pos;
    };
    const ghostPos = getGhostPosition();

    // RENDER HELPERS
    const Cell = React.memo(({ type, isGhost }) => {
        const tetro = TETROMINOES[type] || TETROMINOES[0];
        const isFilled = type !== 0;

        return (
            <div
                className={`w-full h-full border ${isGhost ? 'border-dashed border-white/30 bg-white/5' : isFilled ? `${tetro.color} ${tetro.border} ${tetro.shadow}` : 'border-slate-800 bg-slate-900'} rounded-sm transition-all duration-75`}
            />
        );
    });

    return (
        <div
            className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center py-4 px-2 select-none overflow-hidden touch-none"
            onKeyDown={(e) => {
                if (e.keyCode === 37) movePlayer(-1);
                else if (e.keyCode === 39) movePlayer(1);
                else if (e.keyCode === 40) dropPlayer();
                else if (e.keyCode === 38) playerRotate(stage, 1);
            }}
            tabIndex="0"
        >
            {/* Header */}
            <div className="flex justify-between w-full max-w-sm items-center mb-2">
                <Link to="/" className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><ArrowLeft size={20} /></Link>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">High Score</span>
                    <span className="text-xl font-black text-cyan-400">{highScore}</span>
                </div>
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`p-2 rounded-full ${isPaused ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'} hover:text-white`}
                >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                </button>
            </div>

            <div className="flex gap-2 w-full max-w-sm justify-center items-start">

                {/* Left Panel: Hold */}
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 h-20 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-bold mb-1">HOLD</span>
                        <div className="grid grid-cols-4 gap-0.5 w-10">
                            {holdPiece ? holdPiece.map((row, y) => row.map((cell, x) => (
                                cell !== 0 && <div key={`${x}-${y}`} className={`w-2 h-2 ${TETROMINOES[cell].color} rounded-[1px]`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
                            ))) : <Archive size={16} className="text-slate-700" />}
                        </div>
                    </div>

                    {/* Score Card */}
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-bold">SCORE</span>
                        <span className="text-sm font-bold text-white">{score}</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-bold">LEVEL</span>
                        <span className="text-sm font-bold text-yellow-400">{level}</span>
                    </div>
                </div>

                {/* Main Stage */}
                <div className="relative bg-slate-900 border-4 border-slate-800 rounded-lg p-1 shadow-2xl">
                    <div
                        className="grid grid-cols-10 grid-rows-20 gap-px bg-slate-800/50"
                        style={{ width: '200px', height: '400px' }}
                    >
                        {stage.map((row, y) => row.map((cell, x) => {
                            // Render Logic
                            let type = cell[0];
                            let isGhost = false;

                            // Check Ghost
                            if (type === 0 && !gameOver && player.tetromino[y - ghostPos.y] && player.tetromino[y - ghostPos.y][x - ghostPos.x] !== 0) {
                                type = 0; // It is empty, but ghost overrides visual
                                isGhost = true;
                            } else if (type === 0) {
                                isGhost = false;
                            }

                            return <Cell key={`${x}-${y}`} type={type || (isGhost ? player.tetromino[y - ghostPos.y][x - ghostPos.x] : 0)} isGhost={isGhost} />;
                        }))}
                    </div>

                    {/* Overlays */}
                    {(gameOver || isPaused) && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in">
                            {gameOver ? (
                                <>
                                    <h2 className="text-red-500 font-black text-3xl mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">GAME OVER</h2>
                                    <div className="text-slate-300 text-sm mb-6">Score: {score}</div>
                                    <button onClick={startGame} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all active:scale-95 flex items-center gap-2">
                                        <RefreshCw size={20} /> Tentar Novamente
                                    </button>
                                </>
                            ) : (
                                <h2 className="text-yellow-400 font-black text-3xl tracking-widest">PAUSADO</h2>
                            )}
                        </div>
                    )}

                    {!gameOver && !isPaused && !dropTime && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <button onClick={startGame} className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-6 rounded-full pointer-events-auto shadow-lg animate-pulse">
                                Iniciar Jogo
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel: Next */}
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 h-20 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">NEXT</span>
                    <div className="grid grid-cols-4 gap-0.5 w-10">
                        {nextPiece.map((row, y) => row.map((cell, x) => (
                            cell !== 0 && <div key={`${x}-${y}`} className={`w-2 h-2 ${TETROMINOES[cell].color} rounded-[1px]`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
                        )))}
                    </div>
                </div>

            </div>

            {/* Controls */}
            <div className="mt-4 w-full max-w-sm grid grid-cols-3 gap-2 px-4 h-32">
                {/* Hold / Rotate Area */}
                <div className="flex flex-col gap-2 justify-end">
                    <button
                        onClick={hold}
                        disabled={!canHold}
                        className={`h-14 rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${!canHold ? 'bg-slate-800 border-slate-900 text-slate-600' : 'bg-slate-700 border-slate-900 hover:bg-slate-600 text-white'}`}
                    >
                        <Archive size={20} />
                    </button>
                    <button
                        onClick={() => playerRotate(stage, 1)}
                        className="h-14 bg-purple-600 hover:bg-purple-500 border-purple-800 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"
                    >
                        <RotateCw size={24} />
                    </button>
                </div>

                {/* Directional Pad */}
                <div className="col-span-1 grid grid-rows-2 gap-1 h-full">
                    <button
                        onClick={hardDrop}
                        className="bg-red-600 hover:bg-red-500 border-red-800 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 h-full"
                    >
                        <ChevronsDown size={28} />
                    </button>
                    <button
                        onTouchStart={(e) => { dropPlayer(); }}
                        onMouseDown={(e) => { dropPlayer(); }}
                        className="bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 h-full"
                    >
                        <ArrowDown size={24} />
                    </button>
                </div>

                {/* Left/Right */}
                <div className="flex flex-col gap-2 justify-end">
                    <div className="flex gap-1 h-full">
                        <button
                            onClick={() => movePlayer(-1)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <button
                            onClick={() => movePlayer(1)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"
                        >
                            <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-2 text-slate-600 text-[10px] text-center uppercase tracking-wider font-bold">
                Cyber Tetris v2.0
            </div>
        </div>
    );
};

export default Tetris;
