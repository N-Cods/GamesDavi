import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Pause, Play, RotateCw, Archive, ChevronsDown } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- CONSTANTS ---
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 25;

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("Tetris Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-red-500 bg-black min-h-screen flex flex-col items-center justify-center font-mono">
                    <h1 className="text-xl font-bold mb-4">Tetris Crashed 😵</h1>
                    <div className="bg-gray-900 p-4 rounded border border-red-900 max-w-sm overflow-auto text-xs">
                        <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-bold transition"
                    >
                        Recarregar Página
                    </button>
                    <Link to="/" className="mt-4 text-gray-500 hover:text-white underline text-sm">Voltar ao Hub</Link>
                </div>
            );
        }
        return this.props.children;
    }
}

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

// --- CORE GAME COMPONENT ---
const TetrisGame = () => {
    const [stage, setStage] = useState(createStage());
    const [dropTime, setDropTime] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [rows, setRows] = useState(0);
    const [level, setLevel] = useState(0);
    const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('tetris_highscore') || '0'));

    // Initial State Setup
    // Use state lazy initializer for randomness to ensure hydration consistency if needed (though strict mode might cause double invoke)
    const [player, setPlayer] = useState(() => {
        const t = RANDOM_TETROMINO().shape;
        return {
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: t,
            collided: false,
        };
    });

    const [nextPiece, setNextPiece] = useState(() => RANDOM_TETROMINO().shape);

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
        setStage(createStage());
        setDropTime(1000);
        resetPlayer(true); // reset with new randoms
        setGameOver(false);
        setScore(0);
        setRows(0);
        setLevel(0);
        setHoldPiece(null);
        setCanHold(true);
        setIsPaused(false);
    };

    const resetPlayer = (forceNew = false) => {
        const newTetromino = forceNew ? RANDOM_TETROMINO().shape : nextPiece;
        if (!forceNew) setNextPiece(RANDOM_TETROMINO().shape);

        setPlayer({
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: newTetromino,
            collided: false,
        });

        // Simplified collision check for Game Over on spawn
        // Note: Real game over check happens in the loop or after collision, 
        // but if we spawn inside a block, it's instant game over.
    };

    const updatePlayerPos = ({ x, y, collided }) => {
        setPlayer(prev => ({
            ...prev,
            pos: { x: (prev.pos.x += x), y: (prev.pos.y += y) },
            collided,
        }));
    };

    const checkCollision = (player, stage, { x: moveX, y: moveY }) => {
        if (!player.tetromino) return false;

        for (let y = 0; y < player.tetromino.length; y += 1) {
            for (let x = 0; x < player.tetromino[y].length; x += 1) {
                if (player.tetromino[y][x] !== 0) {
                    if (
                        !stage[y + player.pos.y + moveY] ||
                        !stage[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
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
        if (rows > (level + 1) * 10) {
            setLevel(prev => prev + 1);
            setDropTime(1000 / (level + 1) + 200);
        }

        if (!checkCollision(player, stage, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1, collided: false });
        } else {
            if (player.pos.y < 1) {
                setGameOver(true);
                setDropTime(null);
            }
            updatePlayerPos({ x: 0, y: 0, collided: true });
        }
    };

    const dropPlayer = () => {
        setDropTime(null);
        drop();
    };

    const hardDrop = () => {
        let tmpY = 0;
        let safety = 0;
        while (!checkCollision(player, stage, { x: 0, y: tmpY + 1 }) && safety < ROWS) {
            tmpY += 1;
            safety++;
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
            resetPlayer(); // Get next piece
        } else {
            const temp = player.tetromino;
            setPlayer(prev => ({
                ...prev,
                pos: { x: COLS / 2 - 2, y: 0 },
                tetromino: holdPiece
            }));
            setHoldPiece(temp);
        }
        setCanHold(false);
    };

    // --- EFFECT: Game Loop ---
    useInterval(() => {
        if (!isPaused && !gameOver) drop();
    }, dropTime);

    // --- EFFECT: Score ---
    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('tetris_highscore', score);
        }
    }, [score, highScore]);

    // --- EFFECT: Stage Update ---
    useEffect(() => {
        const sweepRows = newStage => {
            return newStage.reduce((ack, row) => {
                if (row.findIndex(cell => cell[0] === 0) === -1) {
                    setRows(prev => prev + 1);
                    setScore(prev => prev + 100 * (level + 1));
                    ack.unshift(new Array(newStage[0].length).fill([0, 'clear']));
                    return ack;
                }
                ack.push(row);
                return ack;
            }, []);
        };

        const updateStage = prevStage => {
            const newStage = prevStage.map(row =>
                row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell))
            );

            // Draw Tetromino SAFE CHECK
            if (player.tetromino) {
                player.tetromino.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value !== 0) {
                            if (newStage[y + player.pos.y] && newStage[y + player.pos.y][x + player.pos.x]) {
                                newStage[y + player.pos.y][x + player.pos.x] = [
                                    value,
                                    `${player.collided ? 'merged' : 'clear'}`,
                                ];
                            }
                        }
                    });
                });
            }

            if (player.collided) {
                resetPlayer();
                setCanHold(true);
                return sweepRows(newStage);
            }

            return newStage;
        };

        setStage(prev => updateStage(prev));
    }, [player.collided, player.pos.x, player.pos.y, player.tetromino]);

    // Ghost Piece
    const getGhostPosition = () => {
        if (!player.tetromino) return player.pos;
        const ghostPlayer = { ...player, pos: { ...player.pos }, collided: false };
        let safety = 0;

        while (!checkCollision(ghostPlayer, stage, { x: 0, y: 1 }) && safety < ROWS) {
            ghostPlayer.pos.y += 1;
            safety++;
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

    // --- RENDER ---
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

                {/* Hold Panel */}
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 h-20 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-bold mb-1">HOLD</span>
                        <div className="grid grid-cols-4 gap-0.5 w-10">
                            {holdPiece ? holdPiece.map((row, y) => row.map((cell, x) => (
                                cell !== 0 && <div key={`${x}-${y}`} className={`w-2 h-2 ${TETROMINOES[cell].color} rounded-[1px]`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
                            ))) : <Archive size={16} className="text-slate-700" />}
                        </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-bold">SCORE</span>
                        <span className="text-sm font-bold text-white">{score}</span>
                    </div>
                </div>

                {/* Stage */}
                <div className="relative bg-slate-900 border-4 border-slate-800 rounded-lg p-1 shadow-2xl overflow-hidden">
                    <div
                        className="grid grid-cols-10 grid-rows-20 gap-px bg-slate-800/50 w-full h-auto aspect-[1/2]"
                        style={{ minWidth: '200px', maxWidth: '100%' }}
                    >
                        {stage.map((row, y) => row.map((cell, x) => {
                            let type = cell[0];
                            let isGhost = false;

                            // Ghost Render Logic
                            if (type === 0 && !gameOver && player.tetromino) {
                                // Check bounds
                                const gY = y - ghostPos.y;
                                const gX = x - ghostPos.x;
                                if (gY >= 0 && gY < player.tetromino.length &&
                                    gX >= 0 && gX < player.tetromino[0].length) {
                                    if (player.tetromino[gY][gX] !== 0) {
                                        isGhost = true;
                                    }
                                }
                            }

                            return <Cell key={`${x}-${y}`} type={type || (isGhost ? player.tetromino[y - ghostPos.y][x - ghostPos.x] : 0)} isGhost={isGhost} />;
                        }))}
                    </div>

                    {(gameOver || isPaused) && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in">
                            <h2 className={`font-black text-3xl mb-2 ${gameOver ? 'text-red-500' : 'text-yellow-400'}`}>
                                {gameOver ? 'GAME OVER' : 'PAUSADO'}
                            </h2>
                            {gameOver && (
                                <button onClick={startGame} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                    <RefreshCw size={20} /> Tentar Novamente
                                </button>
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

                {/* Next Panel */}
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 w-16 h-20 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">NEXT</span>
                    <div className="grid grid-cols-4 gap-0.5 w-10">
                        {nextPiece.map((row, y) => row.map((cell, x) => (
                            cell !== 0 && <div key={`${x}-${y}`} className={`w-2 h-2 ${TETROMINOES[cell].color} rounded-[1px]`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
                        )))}
                    </div>
                </div>
            </div>

            {/* Touch Controls */}
            <div className="mt-4 w-full max-w-sm grid grid-cols-3 gap-2 px-4 h-32">
                <div className="flex flex-col gap-2 justify-end">
                    <button onClick={hold} disabled={!canHold} className={`h-14 rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${!canHold ? 'bg-slate-800 border-slate-900 text-slate-600' : 'bg-slate-700 border-slate-900 hover:bg-slate-600 text-white'}`}><Archive size={20} /></button>
                    <button onClick={() => playerRotate(stage, 1)} className="h-14 bg-purple-600 hover:bg-purple-500 border-purple-800 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"><RotateCw size={24} /></button>
                </div>
                <div className="col-span-1 grid grid-rows-2 gap-1 h-full">
                    <button onClick={hardDrop} className="bg-red-600 hover:bg-red-500 border-red-800 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 h-full"><ChevronsDown size={28} /></button>
                    <button onTouchStart={(e) => dropPlayer()} onMouseDown={(e) => dropPlayer()} className="bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 h-full"><ArrowDown size={24} /></button>
                </div>
                <div className="flex flex-col gap-2 justify-end">
                    <div className="flex gap-1 h-full">
                        <button onClick={() => movePlayer(-1)} className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"><ArrowLeft size={24} /></button>
                        <button onClick={() => movePlayer(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-900 text-white rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1"><ArrowRight size={24} /></button>
                    </div>
                </div>
            </div>

            <div className="mt-2 text-slate-600 text-[10px] text-center uppercase tracking-wider font-bold">Cyber Tetris v2.0</div>
        </div>
    );
};

export default function TetrisWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <TetrisGame />
        </ErrorBoundary>
    );
};
