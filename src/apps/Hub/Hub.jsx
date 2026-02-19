import React from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck, Calculator, Clock, Type,
    Gamepad2, Grid3X3, Beaker, Candy, X, Grid, Castle, Zap, Rocket
} from 'lucide-react';

const AppCard = ({ to, href, icon: Icon, title, desc, color }) => {
    const content = (
        <div className="p-6 flex flex-col items-start gap-4 h-full">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-inner group-hover:scale-110 transition-transform`}>
                <Icon size={24} className="stroke-[1.5]" />
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-100 mb-1 group-hover:text-cyan-400 transition-colors">{title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{desc}</p>
            </div>
        </div>
    );

    const classes = "group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-cyan-900/10 hover:-translate-y-1 block h-full";

    if (href) {
        return <a href={href} className={classes}>{content}</a>;
    }
    return <Link to={to} className={classes}>{content}</Link>;
};

export default function Hub() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500 selection:text-white pb-12">

            {/* Hero Section */}
            <header className="pt-20 pb-12 px-6 text-center">
                <div className="mb-6 inline-flex items-center justify-center p-2 bg-slate-900/50 rounded-full border border-slate-800">
                    <span className="text-xs font-mono text-cyan-400 px-2 tracking-widest uppercase">Games Ver. 2.0</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
                    <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Games</span> Davi
                </h1>
                <p className="text-slate-400 max-w-md mx-auto text-lg">
                    Seu portal de jogos clássicos e novos desafios.
                </p>
            </header>

            {/* Grid Container */}
            <main className="max-w-5xl mx-auto px-6">



                {/* Games Section */}
                <section>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-slate-500 mb-6 pl-2 border-l-2 border-purple-500">Arcade Games</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AppCard href="games/quick-game-1/index.html" icon={Zap} title="Quick Game 1" desc="Jogo Rápido 1" color="bg-amber-500" />
                        <AppCard href="games/quick-game-2/index.html" icon={Rocket} title="Quick Game 2" desc="Jogo Rápido 2" color="bg-rose-500" />
                        <AppCard href="games/tower-defense/index.html" icon={Castle} title="Tower Defense" desc="Defenda sua base!" color="bg-orange-600" />
                        <AppCard to="/tictactoe" icon={X} title="Tic Tac Toe" desc="O clássico Jogo da Velha." color="bg-red-500" />
                        <AppCard to="/water" icon={Beaker} title="Water Sort" desc="Puzzle de organização de cores." color="bg-blue-500" />
                        <AppCard to="/match3" icon={Candy} title="Match 3" desc="Combine doces para pontuar." color="bg-yellow-500" />
                        <AppCard to="/tetris" icon={Gamepad2} title="Tetris Block" desc="Encaixe os blocos." color="bg-indigo-500" />
                        <AppCard to="/sudoku" icon={Grid3X3} title="Sudoku" desc="Desafio lógico numérico." color="bg-violet-500" />
                        <AppCard to="/dots" icon={Grid} title="Pontos e Linhas" desc="Estratégia 1v1." color="bg-green-500" />
                        <AppCard to="/abc" icon={Type} title="Alfabetização" desc="Jogo de letras e sons." color="bg-pink-500" />
                    </div>
                </section>

            </main>

            <footer className="mt-24 text-center border-t border-slate-900 pt-8">
                <p className="text-slate-600 text-sm">Feito por <strong className="text-slate-400">Ton Alexandre</strong> para o <strong className="text-cyan-400">Davizão</strong></p>
            </footer>
        </div>
    );
}
