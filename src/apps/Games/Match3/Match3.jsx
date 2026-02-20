import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Zap, Hammer, Bomb, Crosshair, Star, Heart, Gem, Moon, Sun, X as XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const WIDTH = 8;
const CANDY_TYPES = [
    { id: 0, color: 'text-red-500', bg: 'bg-red-500', icon: Heart },
    { id: 1, color: 'text-yellow-400', bg: 'bg-yellow-400', icon: Star },
    { id: 2, color: 'text-purple-500', bg: 'bg-purple-500', icon: Zap },
    { id: 3, color: 'text-green-500', bg: 'bg-green-500', icon: Gem },
    { id: 4, color: 'text-blue-500', bg: 'bg-blue-500', icon: Moon },
    { id: 5, color: 'text-orange-500', bg: 'bg-orange-500', icon: Sun },
];

const Match3 = () => {
    const [board, setBoard] = useState([]);
    const [score, setScore] = useState(0);
    const [activePowerup, setActivePowerup] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [shake, setShake] = useState(false);
    const [modalMsg, setModalMsg] = useState(null); // For custom alerts

    // Drag Interaction State
    const dragStartRef = useRef(null); // { index, x, y }
    const [draggedIndex, setDraggedIndex] = useState(null); // Visual feedback

    // Initial Board
    useEffect(() => {
        createBoard();
    }, []);

    const createBoard = () => {
        const randomBoard = [];
        for (let i = 0; i < WIDTH * WIDTH; i++) {
            randomBoard.push(Math.floor(Math.random() * CANDY_TYPES.length));
        }
        setBoard(randomBoard);
        setScore(0);
        setIsProcessing(false);
    };

    // Game Loop
    useEffect(() => {
        if (board.length === 0) return;

        const timeout = setTimeout(() => {
            const matchResult = checkForMatches(board);
            if (matchResult.hasMatch) {
                setBoard(matchResult.newBoard);
                setScore(s => s + matchResult.score);
                if (matchResult.score > 60) triggerShake();
                setIsProcessing(true);
            } else {
                const fallResult = moveIntoSquareBelow(board);
                if (fallResult.hasChange) {
                    setBoard(fallResult.newBoard);
                    setIsProcessing(true);
                } else {
                    setIsProcessing(false);
                }
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [board]);

    const checkForMatches = (currentBoard) => {
        let newBoard = [...currentBoard];
        let hasMatch = false;
        let matchScore = 0;

        // Rows
        for (let i = 0; i < 64; i++) {
            if ([6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 62, 63].includes(i)) continue;
            const row = [i, i + 1, i + 2];
            if (row.every(idx => newBoard[idx] === newBoard[i] && newBoard[i] !== null)) {
                matchScore += 30;
                row.forEach(idx => newBoard[idx] = null);
                hasMatch = true;
            }
        }

        // Cols
        for (let i = 0; i <= 47; i++) {
            const col = [i, i + WIDTH, i + WIDTH * 2];
            if (col.every(idx => newBoard[idx] === newBoard[i] && newBoard[i] !== null)) {
                matchScore += 30;
                col.forEach(idx => newBoard[idx] = null);
                hasMatch = true;
            }
        }

        return { hasMatch, newBoard, score: matchScore };
    };

    const moveIntoSquareBelow = (currentBoard) => {
        let newBoard = [...currentBoard];
        let hasChange = false;

        for (let i = 0; i <= 55; i++) {
            const isFirstRow = i < 8;

            if (isFirstRow && newBoard[i] === null) {
                newBoard[i] = Math.floor(Math.random() * CANDY_TYPES.length);
                hasChange = true;
            }

            if (newBoard[i + WIDTH] === null && newBoard[i] !== null) {
                newBoard[i + WIDTH] = newBoard[i];
                newBoard[i] = null;
                hasChange = true;
            }
        }
        return { hasChange, newBoard };
    };

    // --- INTERACTION HANDLERS (Touch/Mouse Swipe) ---

    const handleInputStart = (index, clientX, clientY) => {
        if (isProcessing) return;

        // If Powerup active, handle click immediately
        if (activePowerup) {
            usePowerup(index);
            return;
        }

        dragStartRef.current = { index, x: clientX, y: clientY };
        setDraggedIndex(index);
    };

    const handleInputEnd = (clientX, clientY) => {
        if (!dragStartRef.current || isProcessing) {
            setDraggedIndex(null);
            dragStartRef.current = null;
            return;
        }

        const { index, x: startX, y: startY } = dragStartRef.current;
        const diffX = clientX - startX;
        const diffY = clientY - startY;
        const threshold = 30; // px to consider a swipe

        let targetIndex = null;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0 && (index % WIDTH !== WIDTH - 1)) targetIndex = index + 1;
                else if (diffX < 0 && (index % WIDTH !== 0)) targetIndex = index - 1;
            }
        } else {
            // Vertical
            if (Math.abs(diffY) > threshold) {
                if (diffY > 0 && index < 56) targetIndex = index + WIDTH;
                else if (diffY < 0 && index >= WIDTH) targetIndex = index - WIDTH;
            }
        }

        if (targetIndex !== null) {
            attemptSwap(index, targetIndex);
        }

        setDraggedIndex(null);
        dragStartRef.current = null;
    };

    const attemptSwap = (idx1, idx2) => {
        const newBoard = [...board];
        // Swap
        const temp = newBoard[idx1];
        newBoard[idx1] = newBoard[idx2];
        newBoard[idx2] = temp;

        const check = checkForMatches(newBoard);
        if (check.hasMatch) {
            setBoard(newBoard);
        } else {
            // Animate invalid move (optional, just reset for now)
            setDraggedIndex(null);
        }
    };

    // --- POWERUPS ---

    const usePowerup = (index) => {
        let newBoard = [...board];
        let cost = 0;
        let performed = false;

        if (activePowerup === 'HAMMER') {
            cost = 100;
            if (score >= cost) {
                newBoard[index] = null;
                performed = true;
            }
        } else if (activePowerup === 'BOMB') {
            cost = 250;
            if (score >= cost) {
                const row = Math.floor(index / WIDTH);
                const col = index % WIDTH;
                for (let r = row - 1; r <= row + 1; r++) {
                    for (let c = col - 1; c <= col + 1; c++) {
                        if (r >= 0 && r < WIDTH && c >= 0 && c < WIDTH) newBoard[r * WIDTH + c] = null;
                    }
                }
                performed = true;
            }
        } else if (activePowerup === 'LASER') {
            cost = 500;
            if (score >= cost) {
                const row = Math.floor(index / WIDTH);
                const col = index % WIDTH;
                for (let i = 0; i < WIDTH; i++) {
                    newBoard[row * WIDTH + i] = null;
                    newBoard[i * WIDTH + col] = null;
                }
                performed = true;
            }
        }

        if (performed) {
            setScore(s => s - cost);
            setBoard(newBoard);
            setActivePowerup(null);
            triggerShake();
        } else {
            setModalMsg(`Saldo Insuficiente! Custa ${cost} pts.`);
            setActivePowerup(null);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 300);
    };

    return (
        <div
            className={`min-h-screen bg-slate-950 flex flex-col items-center justify-start pt-6 px-2 select-none overflow-hidden ${shake ? 'animate-shake' : ''}`}
            // Global Touch/Mouse Up Handler to catch drags that end outside the candy
            onMouseUp={(e) => handleInputEnd(e.clientX, e.clientY)}
            onTouchEnd={(e) => {
                const touch = e.changedTouches[0];
                handleInputEnd(touch.clientX, touch.clientY);
            }}
        >

            {/* Modal */}
            {modalMsg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-xs text-center transform scale-100 transition-transform">
                        <div className="mb-4 text-slate-300 font-bold text-lg">{modalMsg}</div>
                        <button
                            onClick={() => setModalMsg(null)}
                            className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full transition shadow-lg active:scale-95"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
                <Link to="/" className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Score</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 drop-shadow-sm">{score}</span>
                </div>
                <button onClick={createBoard} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Board */}
            <div className={`bg-slate-900/50 p-2 rounded-2xl border-4 ${isProcessing ? 'border-slate-600' : 'border-slate-800'} shadow-2xl backdrop-blur-sm mb-6 transition-colors duration-300 touch-none`}>
                <div className="grid grid-cols-8 gap-1 bg-slate-950/50 p-1 rounded-xl">
                    {board.map((type, index) => {
                        const CandyConfig = CANDY_TYPES[type];
                        const Icon = CandyConfig?.icon;
                        const isNull = type === null;
                        const isDragged = draggedIndex === index;

                        return (
                            <div
                                key={index}
                                onMouseDown={(e) => handleInputStart(index, e.clientX, e.clientY)}
                                onTouchStart={(e) => {
                                    // Prevent scroll while playing
                                    // e.preventDefault(); 
                                    const touch = e.touches[0];
                                    handleInputStart(index, touch.clientX, touch.clientY);
                                }}
                                className={`
                                    w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all duration-150 rounded-lg relative select-none
                                    ${isDragged ? 'bg-slate-700 scale-90 ring-4 ring-white z-10' : 'hover:bg-slate-800'}
                                    ${activePowerup ? 'hover:ring-2 hover:ring-red-500' : ''}
                                `}
                            >
                                {!isNull && CandyConfig && (
                                    <div className={`${CandyConfig.color} drop-shadow-lg filter brightness-110 pointer-events-none`}>
                                        <Icon size={32} strokeWidth={2.5} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Powerups */}
            <div className="w-full max-w-md px-4">
                <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Lojinha de Power-ups</div>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => setActivePowerup(activePowerup === 'HAMMER' ? null : 'HAMMER')}
                        className={`group relative flex flex-col items-center gap-1 p-3 rounded-2xl border-b-4 transition-all active:border-b-0 active:translate-y-1 ${activePowerup === 'HAMMER' ? 'bg-yellow-600 border-yellow-800 text-white' : 'bg-slate-800 border-slate-950 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Hammer size={24} />
                        <span className="text-[10px] font-bold">100 pts</span>
                    </button>

                    <button
                        onClick={() => setActivePowerup(activePowerup === 'BOMB' ? null : 'BOMB')}
                        className={`group relative flex flex-col items-center gap-1 p-3 rounded-2xl border-b-4 transition-all active:border-b-0 active:translate-y-1 ${activePowerup === 'BOMB' ? 'bg-orange-600 border-orange-800 text-white' : 'bg-slate-800 border-slate-950 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Bomb size={24} />
                        <span className="text-[10px] font-bold">250 pts</span>
                    </button>

                    <button
                        onClick={() => setActivePowerup(activePowerup === 'LASER' ? null : 'LASER')}
                        className={`group relative flex flex-col items-center gap-1 p-3 rounded-2xl border-b-4 transition-all active:border-b-0 active:translate-y-1 ${activePowerup === 'LASER' ? 'bg-purple-600 border-purple-800 text-white' : 'bg-slate-800 border-slate-950 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Crosshair size={24} />
                        <span className="text-[10px] font-bold">500 pts</span>
                    </button>
                </div>
                {activePowerup && (
                    <div className="mt-4 text-center animate-pulse text-yellow-400 font-bold text-sm bg-slate-900/80 py-2 rounded-lg border border-yellow-500/30">
                        {activePowerup === 'HAMMER' && "Toque em um doce para destruir!"}
                        {activePowerup === 'BOMB' && "Toque para explodir uma área 3x3!"}
                        {activePowerup === 'LASER' && "Toque para destruir a linha e coluna!"}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out; }
            `}</style>
        </div>
    );
};

export default Match3;
