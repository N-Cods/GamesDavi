/** * MAZE DEFENSE V5 - 3 COLUMN LAYOUT
 * - Left: Stats/Controls
 * - Center: Game
 * - Right: Towers
 * - Fixes: AutoWave, Start Money, Ice AoE
 * - Refactored: Split into modules
 * - Feature: High Score, Share, Speed Control (1x, 2x, 4x)
 */

const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const container = document.getElementById('game_area');

// GRID CONSTANTS
const COLS = 25;
const ROWS = 15;
let TILE_SIZE = 40;

// GAME STATE
// GAME STATE
let state = {
    money: 600, // Starting money
    lives: 20,
    wave: 1,
    active: false,
    auto_wave: false,
    paused: false,
    game_over: false,
    speed: 1,

    // Spawn Logic
    spawning: false,
    spawn_timer: 0,
    spawn_delay: 0,
    spawn_count: 0,
    spawn_max: 0,

    grid: [],
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    spawn: { x: 0, y: 7 },
    exit: { x: 24, y: 7 },
    path: [],
    selection: null,
    build_type: 'wall'
};

const TOWERS = {
    wall: { name: "Parede", cost: 50, rng: 0, dmg: 0, rate: 0, type: 'ground', img: './img/weapon-wall.svg', desc: "Bloqueia a passagem dos inimigos terrestres. Essencial para criar labirintos." },
    cannon: { name: "Canhão", cost: 50, rng: 2.0, dmg: 10, rate: 60, type: 'ground', img: './img/weapon-cannon.svg', upgrade_factor: 1.25, desc: "Dano básico. Bom custo-benefício para início de jogo." },
    mg: { name: "Metralha", cost: 150, rng: 3.0, dmg: 100, rate: 6, type: 'ground', img: './img/weapon-machine-gun.svg', upgrade_factor: 1.25, desc: "Alta cadência de tiro. Derrete inimigos rápidos e fracos." },
    sniper: { name: "Sniper", cost: 250, rng: 10.0, dmg: 99999, rate: 60, type: 'all', img: './img/weapon-sniper.svg', upgrade_factor: 1.25, desc: "Alcance infinito. Elimina alvos prioritários com um tiro." },
    poison: { name: "Veneno", cost: 150, rng: 3.0, dmg: 0, rate: 0, type: 'all', img: './img/weapon-poison.svg', slow: 0.3, upgrade_factor: 1.25, is_aura: true, desc: "Aura tóxica que retarda (30%) inimigos na área. Upgrade aumenta efeito." },
    aa: { name: "Anti-Aereo", cost: 300, rng: 5.0, dmg: 100, rate: 12, type: 'air', img: './img/weapon-anti-aereo.svg', upgrade_factor: 1.25, desc: "Defesa vital contra ameaças aéreas. Dano alto vs Voo." },
    mine: { name: "Mina", cost: 500, rng: 1.5, dmg: 99999, rate: 0, type: 'ground', img: './img/weapon-mine.svg', is_trap: true, single_use: true, upgrade_factor: 1.25, desc: "Explode ao contato. Dano massivo em área." },
    bazooka: { name: "Bazooka", cost: 500, rng: 4.0, dmg: 100, rate: 60, type: 'all', img: './img/weapon-bazooka.svg', aoe: 1.5, upgrade_factor: 1.25, desc: "Dispara foguetes com grande área de explosão." },

    // NEW TOWERS
    bowling: { name: "Boliche", cost: 10, rng: 0, dmg: 99999, rate: 0, type: 'ground', img: './img/weapon-bowling.svg', is_projectile: true, desc: "Atravessa o mapa eliminando tudo no caminho (inimigos e torres). Bloqueada por Paredes." },
    dice: { name: "Dado", cost: 400, rng: 5.0, dmg: 0, rate: 300, type: 'all', img: './img/weapon-dice.svg', is_rng: true, desc: "Sorte: 6 = Mata todos, 1 = Cura todos. Rola a cada 5s." },
    heart: { name: "Coração", cost: 1500, rng: 0, dmg: 0, rate: 0, type: 'none', img: './img/weapon-heart-on-fire.svg', is_eco: true, desc: "Queima 1 vida por onda para DOBRAR o dinheiro ganho." },
    lollipop: { name: "Pirulito", cost: 400, rng: 2.5, dmg: 0, rate: 0, type: 'all', img: './img/weapon-lollipop.svg', is_aura: true, slow: 0.9, desc: "Caramelo grudento: Desacelera inimigos em 90%." },
    pacman: { name: "Pacman", cost: 300, rng: 0.5, dmg: 99999, rate: 0, type: 'ground', img: './img/weapon-pacmam.svg', is_trap: true, start_lvl: 10, desc: "Come inimigos e perde 1 nível. Some no nível 0." },
    powerup: { name: "Powerup", cost: 1000, rng: 99, dmg: 0, rate: 0, type: 'none', img: './img/weapon-powerup.svg', is_buff: true, buff_type: 'cannon', desc: "Buff Global: Aumenta dano de TODOS os Canhões em 10% por nível." },
    promoted: { name: "Promoted", cost: 600, rng: 1.5, dmg: 0, rate: 0, type: 'none', img: './img/weapon-promoted.svg', is_buff: true, buff_type: 'neighbor', desc: "Evolui a torre abaixo a cada onda. Some se acabar o dinheiro." }
};

// Preload Images
const T_IMGS = {};
Object.keys(TOWERS).forEach(k => {
    T_IMGS[k] = new Image();
    T_IMGS[k].src = TOWERS[k].img;
});

const BG_IMG = new Image();
BG_IMG.src = './img/fundo-tabuleiro.svg';

// --- ENGINE CORE ---

window.toggle_fullscreen = function () {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
    setTimeout(resize, 300);
}

function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const max_tile_w = Math.floor(w / COLS);
    const max_tile_h = Math.floor(h / ROWS);
    TILE_SIZE = Math.min(max_tile_w, max_tile_h);
    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;
}

window.addEventListener('resize', resize);



document.getElementById('auto_wave').addEventListener('change', (e) => {
    state.auto_wave = e.target.checked;
    if (state.auto_wave && !state.active && !state.game_over && !state.spawning) start_wave();
});

// --- PATHFINDING (FLOW FIELD / INTEGRATION FIELD) ---
// Generates a map of distances from the Exit to every tile.
// 0 = Exit, High Number = Far, 999 = Wall/Blocked
function generate_flow_field() {
    const field = Array.from({ length: ROWS }, () => Array(COLS).fill(999));
    let q = [];

    // Start from Exit
    let ex = state.exit.x, ey = state.exit.y;
    field[ey][ex] = 0;
    q.push({ x: ex, y: ey });

    while (q.length) {
        let c = q.shift();
        let dist = field[c.y][c.x];

        [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => {
            let nx = c.x + dx, ny = c.y + dy;
            // Check bounds
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                // If not wall and better path found
                if (state.grid[ny][nx] !== 1 && field[ny][nx] > dist + 1) {
                    field[ny][nx] = dist + 1;
                    q.push({ x: nx, y: ny });
                }
            }
        });
    }
    return field;
}

function recalc_path() {
    state.flow_field = generate_flow_field();
    // Check if spawn is blocked
    // If spawn distance is 999, it means the path is blocked
    state.path_blocked = (state.flow_field[state.spawn.y][state.spawn.x] >= 999);
}

// --- LOGIC CLASSES ---

class Tower {
    constructor(gx, gy, type) {
        this.gx = gx; this.gy = gy;
        this.type = type;
        const d = TOWERS[type];
        this.lvl = d.start_lvl || 1; // Pacman starts at 10
        this.angle = 0;
        this.cd = 0;
        this.range = d.rng;
        this.dmg = d.dmg;
        this.rate = d.rate;
        this.cost = d.cost;
    }
    upgrade() {
        this.lvl++;
        const factor = TOWERS[this.type].upgrade_factor || 1.25;
        this.dmg *= factor;
    }
    update() {
        // --- POWERUP LOGIC (Passive Buff) ---
        if (this.type === 'powerup') return; // Passive, effect applied globally or via scan

        // --- HEART / PROMOTED (Wave End Logic handled externally) ---
        if (this.type === 'heart' || this.type === 'promoted') return;

        // --- LOLLIPOP (Aura Slow 90%) ---
        if (this.type === 'lollipop') {
            state.enemies.forEach(e => {
                if (Math.hypot(e.gx - this.gx, e.gy - this.gy) <= this.range) {
                    e.apply_slow(TOWERS.lollipop.slow, 2);
                }
            });
            return;
        }

        // --- PACMAN (Trap / Consumer) ---
        if (this.type === 'pacman') {
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                let e = state.enemies[i];
                // Eat ground enemies
                if (!e.flying && Math.hypot(e.gx - this.gx, e.gy - this.gy) < 0.5) {
                    // Eat!
                    e.hit(99999, 'pacman'); // Instakill
                    this.lvl--; // Level Down
                    // Particles
                    create_explosion(this.gx, this.gy, 0.5, '#facc15');

                    if (this.lvl <= 0) {
                        // Destroy self
                        state.grid[this.gy][this.gx] = 0;
                        state.towers = state.towers.filter(t => t !== this);
                        recalc_path();
                        update_ui();
                        if (state.selection === this) close_menu();
                        return; // Dead
                    }
                }
            }
            return;
        }

        // --- MINE LOGIC ---
        if (this.type === 'mine') {
            for (let e of state.enemies) {
                if (!e.flying && Math.hypot(e.gx - this.gx, e.gy - this.gy) < 0.8) {
                    create_explosion(this.gx, this.gy, this.range, '#ef4444');
                    // Damage all ground in radius
                    state.enemies.forEach(sub_e => {
                        if (!sub_e.flying && Math.hypot(sub_e.gx - this.gx, sub_e.gy - this.gy) <= this.range) {
                            sub_e.hit(this.dmg, 'mine');
                        }
                    });
                    // Remove mine
                    state.grid[this.gy][this.gx] = 0;
                    state.towers = state.towers.filter(t => t !== this);
                    update_ui(); // Update sell/money UI if selected
                    if (state.selection === this) close_menu();
                    recalc_path();
                }
            }
            return;
        }

        // --- POISON AURA ---
        if (TOWERS[this.type].is_aura) {
            state.enemies.forEach(e => {
                if (Math.hypot(e.gx - this.gx, e.gy - this.gy) <= this.range) {
                    if ((TOWERS[this.type].type === 'air' && e.flying) ||
                        (TOWERS[this.type].type === 'ground' && !e.flying) ||
                        TOWERS[this.type].type === 'all') {

                        // Poison Upgrade: 30% base + 3% per level cap 90%
                        let slw = TOWERS[this.type].slow - ((this.lvl - 1) * 0.03);
                        if (slw < 0.1) slw = 0.1; // Max 90% slow (0.1 multiplier)
                        e.apply_slow(slw, 2);
                    }
                }
            });
            return;
        }

        // --- SHOOTING LOGIC (Wall & non-shooters return) ---
        if (this.rate === 0) return;

        if (this.cd > 0) this.cd--;
        if (this.cd <= 0) {
            // FIND TARGET
            let target = null;
            let min_dist = Infinity;

            for (let e of state.enemies) {
                if (this.type === 'aa' && !e.flying) continue;
                if (this.type === 'cannon' && e.flying) continue;
                if (this.type === 'mg' && e.flying) continue;
                // Sniper/Bazooka/Dice hit all

                let d = Math.hypot(e.gx - this.gx, e.gy - this.gy);

                // Sniper Global Range logic (rng 10 is enough for map? Map is 25x15. Sniper rng 10 might be short? 
                // Description says "Global". Let's assume description > stats? 
                // In game.js TOWERS.sniper.rng is 10.0. Let's trust stats or boost it? 
                // Let's use stats check.

                if (d <= this.range) {
                    if (d < min_dist) { min_dist = d; target = e; }
                }
            }

            if (target) {
                // DICE LOGIC
                if (this.type === 'dice') {
                    if (!this.rolling) {
                        this.rolling = true;
                        // Trigger visual and delayed effect
                        window.show_dice_roll(this);
                    }
                    return;
                }

                // Normal Shoot
                this.angle = Math.atan2(target.gy - this.gy, target.gx - this.gx);

                // POWERUP BUFF CHECK
                // Calculate damage based on Powerups existing
                let dmg = this.dmg;
                if (this.type === 'cannon') {
                    // Count powerups
                    state.towers.forEach(t => {
                        if (t.type === 'powerup') {
                            dmg *= (1 + (t.lvl * 0.1));
                        }
                    });
                }

                state.projectiles.push(new Projectile(this.gx, this.gy, target, dmg, this.type));
                this.cd = this.rate;
            }
        }
    }


    draw(ctx) {
        const x = this.gx * TILE_SIZE + TILE_SIZE / 2;
        const y = this.gy * TILE_SIZE + TILE_SIZE / 2;
        const sz = TILE_SIZE;

        ctx.save();
        ctx.translate(x, y);

        // Draw Tower Base (Placeholder for all)
        // ctx.fillStyle = '#334155';
        // ctx.fillRect(-sz/2, -sz/2, sz, sz);

        if (this.rate > 0) ctx.rotate(this.angle);

        // PROCEDURAL DRAWING BASED ON TYPE
        switch (this.type) {
            case 'wall':
                ctx.fillStyle = '#94a3b8'; // Slate-400
                ctx.fillRect(-sz / 2 + 2, -sz / 2 + 2, sz - 4, sz - 4);

                // Brick pattern detail
                ctx.fillStyle = '#64748b'; // Slate-500
                ctx.fillRect(-sz / 2 + 6, -sz / 2 + 6, sz / 2 - 8, sz / 2 - 8);
                ctx.fillRect(2, 2, sz / 2 - 8, sz / 2 - 8);
                break;

            case 'cannon':
                // Base
                ctx.fillStyle = '#475569';
                ctx.beginPath(); ctx.arc(0, 0, sz / 2 - 4, 0, Math.PI * 2); ctx.fill();
                // Barrel
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, -6, sz / 2 + 4, 12);
                break;

            case 'mg':
                // Base
                ctx.fillStyle = '#334155';
                ctx.fillRect(-8, -8, 16, 16);
                // Barrels (Twin)
                ctx.fillStyle = '#fbbf24'; // Amber-400
                ctx.fillRect(0, -6, sz / 2 + 2, 4);
                ctx.fillRect(0, 2, sz / 2 + 2, 4);
                break;

            case 'sniper':
                // Long Barrel
                ctx.fillStyle = '#4ade80'; // Green-400
                ctx.fillRect(0, -3, sz / 2 + 10, 6);
                // Scope
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                break;

            case 'poison':
                // Sludge Base
                ctx.fillStyle = '#a3e635'; // Lime-400
                ctx.beginPath(); ctx.arc(0, 0, sz / 2 - 2, 0, Math.PI * 2); ctx.fill();
                // Bubbles
                ctx.fillStyle = '#365314';
                ctx.beginPath(); ctx.arc(4, -4, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(-5, 5, 2, 0, Math.PI * 2); ctx.fill();
                break;

            case 'aa':
                // Missiles (Pointing Right)
                ctx.fillStyle = '#ef4444'; // Red-500
                // Top Missile
                ctx.fillRect(-2, -6, 12, 4);
                // Bottom Missile
                ctx.fillRect(-2, 2, 12, 4);
                // Base
                ctx.fillStyle = '#64748b';
                ctx.beginPath(); ctx.arc(-4, 0, 8, 0, Math.PI * 2); ctx.fill();
                break;

            case 'mine':
                // Spiked mine look
                ctx.fillStyle = '#f87171'; // Red-400
                ctx.beginPath(); ctx.arc(0, 0, sz / 3, 0, Math.PI * 2); ctx.fill();
                // Spikes (simple)
                ctx.strokeStyle = '#7f1d1d';
                ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath(); ctx.moveTo(-sz / 2, 0); ctx.lineTo(sz / 2, 0); ctx.stroke();
                }
                break;

            case 'bazooka':
                // Large tube
                ctx.fillStyle = '#f97316'; // Orange-500
                ctx.fillRect(-4, -8, sz / 2 + 8, 16);
                // Back
                ctx.fillStyle = '#7c2d12';
                ctx.fillRect(-8, -10, 8, 20);
                break;

            case 'bowling':
                // Black ball with 3 holes
                ctx.fillStyle = '#0f172a'; // Slate-900
                ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(2, -2, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 2, 1.5, 0, Math.PI * 2); ctx.fill();
                break;

            case 'dice':
                // White cube with dots
                ctx.fillStyle = '#fff';
                ctx.fillRect(-sz / 2 + 2, -sz / 2 + 2, sz - 4, sz - 4);
                ctx.fillStyle = '#000';

                // Draw Question Mark or Random Dots
                ctx.font = '20px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', 0, 0);
                break;

            case 'heart':
                // Red Heart
                ctx.fillStyle = '#ef4444';
                const hsz = sz * 0.4;
                ctx.beginPath();
                ctx.moveTo(0, hsz / 2);
                ctx.bezierCurveTo(0, -hsz / 2, -hsz, -hsz / 2, -hsz, 0);
                ctx.bezierCurveTo(-hsz, hsz, 0, hsz * 1.5, 0, hsz * 2);
                ctx.bezierCurveTo(0, hsz * 1.5, hsz, hsz, hsz, 0);
                ctx.bezierCurveTo(hsz, -hsz / 2, 0, -hsz / 2, 0, hsz / 2);
                ctx.fill();
                // Fire effect (simple pulse)
                if (state.active && Math.random() < 0.3) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath(); ctx.arc((Math.random() - 0.5) * 10, -10, 2, 0, Math.PI * 2); ctx.fill();
                }
                break;

            case 'lollipop':
                // Stick and spiral
                ctx.fillStyle = '#fce7f3'; // Stick
                ctx.fillRect(-1, 0, 2, 12);
                // Candy
                ctx.fillStyle = '#ec4899'; // Pink
                ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -6, 4, 0, Math.PI * 1.5);
                ctx.stroke();
                break;

            case 'pacman':
                // Yellow circle with mouth
                ctx.fillStyle = '#eab308'; // Yellow-500
                ctx.beginPath();
                // Mouth opens/closes based on time or random
                const mouth = 0.2 + Math.sin(Date.now() / 100) * 0.15;
                ctx.arc(0, 0, sz / 2, mouth, Math.PI * 2 - mouth);
                ctx.lineTo(0, 0);
                ctx.fill();
                break;

            case 'powerup':
                // Blue arrow up
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, 0);
                ctx.lineTo(3, 0);
                ctx.lineTo(3, 10);
                ctx.lineTo(-3, 10);
                ctx.lineTo(-3, 0);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill();
                break;

            case 'promoted':
                // Gold chevron/star with Aura
                // Aura
                ctx.fillStyle = 'rgba(250, 204, 21, 0.3)'; // Yellow-400 transparent
                const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
                ctx.beginPath(); ctx.arc(0, 0, (sz / 2) * pulse, 0, Math.PI * 2); ctx.fill();

                // Floating Star
                const fy = Math.sin(Date.now() / 300) * 3;
                ctx.translate(0, -5 + fy);

                // Star Shape
                ctx.fillStyle = '#facc15'; // Yellow-300
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 12, -Math.sin((18 + i * 72) * Math.PI / 180) * 12);
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 5, -Math.sin((54 + i * 72) * Math.PI / 180) * 5);
                }
                ctx.closePath();
                ctx.fill();

                // Outline
                ctx.strokeStyle = '#854d0e'; // Yellow-900
                ctx.lineWidth = 1;
                ctx.stroke();
                break;

            default:
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(-sz / 4, -sz / 4, sz / 2, sz / 2);
        }

        // Range indicator if selected
        if (state.selection === this) {
            ctx.beginPath();
            ctx.arc(0, 0, this.range * TILE_SIZE, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
        }

        ctx.restore();

        // Level text
        if (this.lvl > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.floor(TILE_SIZE * 0.3)}px monospace`;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.lvl, x + TILE_SIZE / 3, y + TILE_SIZE / 3);
            ctx.fillText(this.lvl, x + TILE_SIZE / 3, y + TILE_SIZE / 3);
        }
    }


}

class Enemy {
    constructor(wave, flying) {
        this.flying = flying;
        let mult = Math.pow(1.15, wave);
        if (flying) {
            this.hp = 60 * mult; this.speed_base = 0.104; this.color = '#94a3b8';
            this.reward = 100 + Math.floor(wave * 1.1);
        } else {
            this.hp = 30 * mult; this.speed_base = 0.052 + (wave * 0.001); this.color = '#ef4444';
            this.reward = 10 + Math.floor(wave * 1.15);
        }
        this.hp_max = this.hp;
        this.gx = state.spawn.x; this.gy = state.spawn.y;
        this.slow_factor = 1.0;
        this.slow_timer = 0;
    }
    apply_slow(factor, duration) {
        this.slow_factor = Math.min(this.slow_factor, factor);
        this.slow_timer = Math.max(this.slow_timer, duration);
    }
    hit(dmg, src_type) {
        if (this.flying && (src_type !== 'aa' && src_type !== 'sniper' && src_type !== 'bazooka' && src_type !== 'poison')) return;
        this.hp -= dmg;
        if (this.hp <= 0) { state.money += this.reward; create_explosion(this.gx, this.gy, 0.5, this.color); update_ui(); }
    }
    update() {
        let spd = this.speed_base;
        if (this.slow_timer > 0) {
            spd *= this.slow_factor;
            this.slow_timer--;
        } else {
            this.slow_factor = 1.0;
        }

        if (this.flying) {
            // Flying units move straight to exit
            let tx = state.exit.x, ty = state.exit.y;
            let dx = tx - this.gx, dy = ty - this.gy;
            let d = Math.hypot(dx, dy);
            if (d < spd) this.finish();
            else { this.gx += (dx / d) * spd; this.gy += (dy / d) * spd; }
        } else {
            // Ground units follow Flow Field
            // Check current tile distance
            let cx = Math.floor(this.gx);
            let cy = Math.floor(this.gy);

            // If at center of tile, look for best neighbor
            // Simple approach: move towards center of neighbor with lowest distance

            // Find lowest neighbor
            let best = { x: cx, y: cy, dist: state.flow_field[cy][cx] };

            [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => {
                let nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                    let d = state.flow_field[ny][nx];
                    if (d < best.dist) {
                        best = { x: nx, y: ny, dist: d };
                    }
                }
            });

            if (best.x === cx && best.y === cy) {
                // Already at lowest tile (likely exit or stuck)
                if (cx === state.exit.x && cy === state.exit.y) {
                    // move to center of exit
                    let dx = state.exit.x - this.gx, dy = state.exit.y - this.gy;
                    let d = Math.hypot(dx, dy);
                    if (d < spd) this.finish();
                    else { this.gx += (dx / d) * spd; this.gy += (dy / d) * spd; }
                }
                // else: Stuck? Or at end of path?
                // Just move towards center of current tile if stuck

            } else {
                // Move towards center of best neighbor
                let tx = best.x;
                let ty = best.y;
                let dx = tx - this.gx, dy = ty - this.gy;

                // Allow diagonal movement feeling by not snapping strictly to grid logic every frame
                // But Flow Field is grid based.
                // Smooth movement: 
                // Vector field would be better, but simple neighbor checking works.

                let dist = Math.hypot(dx, dy);
                if (dist < spd) {
                    this.gx = tx; this.gy = ty; // Snap? No, just move
                } else {
                    this.gx += (dx / dist) * spd;
                    this.gy += (dy / dist) * spd;
                }
            }
        }
    }
    finish() {
        if (state.game_over) return;
        this.hp = 0;
        state.lives--;
        if (state.lives <= 0) {
            state.lives = 0;
            game_over();
        }
        update_ui();
    }
    draw(ctx) {
        const x = this.gx * TILE_SIZE + TILE_SIZE / 2;
        const y = this.gy * TILE_SIZE + TILE_SIZE / 2;
        const sz = TILE_SIZE * 0.6;

        ctx.save();
        ctx.translate(x, y);

        // HEALTH BAR
        const pct = Math.max(0, this.hp / this.hp_max);
        ctx.fillStyle = 'red'; ctx.fillRect(-sz / 2, -sz, sz, 4);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(-sz / 2, -sz, sz * pct, 4);

        if (this.flying) {
            // PLANE SHAPE
            ctx.rotate(Math.atan2(state.exit.y - this.gy, state.exit.x - this.gx));

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(sz * 0.6, 20); ctx.lineTo(-sz * 0.4, sz * 0.7 + 20); ctx.lineTo(-sz * 0.2, 20); ctx.lineTo(-sz * 0.4, -sz * 0.7 + 20);
            ctx.fill();

            // Body
            ctx.fillStyle = this.slow_timer > 0 ? '#bae6fd' : '#cbd5e1'; // Slate-300
            ctx.beginPath();
            ctx.moveTo(sz * 0.6, 0); // Nose
            ctx.lineTo(-sz * 0.4, sz * 0.7); // Wing L
            ctx.lineTo(-sz * 0.2, 0); // Body center
            ctx.lineTo(-sz * 0.4, -sz * 0.7); // Wing R
            ctx.fill();

            // Detail
            ctx.fillStyle = '#64748b'; // Slate-500
            ctx.fillRect(-sz * 0.2, -1, sz * 0.4, 2);

        } else {
            // TANK SHAPE
            ctx.rotate(Math.atan2(state.exit.y - this.gy, state.exit.x - this.gx)); // Face direction? Or just static?
            // Ground units often look better static or facing movement. Let's face movement.
            // But they follow flow field, so dy/dx might be jittery. Let's just face simple direction based on movement if we track it, 
            // OR just be a top-down tank that rotates.

            // Let's use simple rotation for now based on neighbor check or just 0.
            // Actually, let's make it a detailed square (Tank)

            ctx.fillStyle = this.slow_timer > 0 ? '#bae6fd' : this.color;

            // Tracks
            ctx.fillStyle = '#1e293b'; // Dark tracks
            ctx.fillRect(-sz / 2 - 2, -sz / 2, 4, sz);
            ctx.fillRect(sz / 2 - 2, -sz / 2, 4, sz);

            // Body
            ctx.fillStyle = this.slow_timer > 0 ? '#bae6fd' : (this.color === '#ef4444' ? '#b91c1c' : this.color);
            ctx.fillRect(-sz / 2 + 2, -sz / 2 + 2, sz - 4, sz - 4);

            // Turret
            ctx.fillStyle = '#f87171';
            ctx.beginPath(); ctx.arc(0, 0, sz / 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(0, -2, sz / 2, 4); // Gun barrel
        }
        ctx.restore();
    }
}

class Projectile {
    constructor(gx, gy, target, dmg, type) {
        this.gx = gx; this.gy = gy;
        this.target = target;
        this.dmg = dmg;
        this.type = type;
        this.speed = (type === 'sniper') ? 1.0 : 0.4;
        this.hit = false;
        const d = TOWERS[type];
        this.aoe = d.aoe || 0;
    }
    update() {
        if (this.target.hp <= 0 && this.type !== 'bazooka') { this.hit = true; return; }

        let tx, ty;
        // Handle target moving or being just coordinates (for bazooka?) 
        // Bazooka tracking target until hit
        if (this.target.gx !== undefined) { tx = this.target.gx; ty = this.target.gy; }
        else { this.hit = true; return; }

        let dx = tx - this.gx, dy = ty - this.gy;
        let d = Math.hypot(dx, dy);
        if (d < this.speed) {
            this.hit = true;
            if (this.aoe > 0 || this.type === 'bazooka') {
                create_explosion(tx, ty, this.aoe, '#f97316');
                // AoE
                state.enemies.forEach(e => {
                    let dist = Math.hypot(e.gx - tx, e.gy - ty);
                    if (dist <= this.aoe) {
                        if (this.type === 'bazooka') e.hit(this.dmg, 'bazooka');
                        else e.hit(this.dmg, this.type);
                    }
                });
            } else {
                this.target.hit(this.dmg, this.type);
            }
        } else {
            this.gx += (dx / d) * this.speed; this.gy += (dy / d) * this.speed;
        }
    }
    draw(ctx) {
        const x = this.gx * TILE_SIZE + TILE_SIZE / 2;
        const y = this.gy * TILE_SIZE + TILE_SIZE / 2;
        // Projectile graphics
        if (this.type === 'bazooka') {
            ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'sniper') {
            // Invisible or fast trace
            ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 2, 2);
        } else {
            ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function create_explosion(gx, gy, radius_grid, color) {
    state.particles.push({ gx, gy, life: 30, max_life: 30, color, size: 0, max_size: radius_grid, type: 'shockwave' });
}

// --- CONTROLLER ---

function get_grid_pos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: Math.floor((clientX - rect.left) * scaleX / TILE_SIZE),
        y: Math.floor((clientY - rect.top) * scaleY / TILE_SIZE)
    };
}

canvas.addEventListener('mousedown', handle_input);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handle_input(e); }, { passive: false });

function handle_input(e) {
    if (state.paused || state.game_over) return;
    const p = get_grid_pos(e);
    if (p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS) return;
    const t = state.towers.find(t => t.gx === p.x && t.gy === p.y);
    if (t) {
        // Special case for Promoted: Build ON TOP of tower
        if (state.build_type === 'promoted' && t.type !== 'wall' && t.type !== 'mine' && t.type !== 'promoted') {
            build_tower(p.x, p.y);
        } else {
            open_menu(t, e);
        }
    } else {
        close_menu();
        build_tower(p.x, p.y);
    }
}

window.select_tower = function (type) {
    state.build_type = type;
    document.querySelectorAll('.tower_btn').forEach(b => b.classList.remove('active'));
    // Fixed Map matching HTML order exactly
    const map = ['wall', 'cannon', 'mg', 'sniper', 'poison', 'aa', 'mine', 'bazooka', 'bowling', 'dice', 'pacman', 'lollipop', 'promoted', 'powerup', 'heart'];
    // indices: 0..14
    const idx = map.indexOf(type);
    if (idx >= 0 && document.querySelectorAll('.tower_btn')[idx]) {
        document.querySelectorAll('.tower_btn')[idx].classList.add('active');
    }
}

function build_tower(gx, gy) {
    // BOWLING BALL LOGIC
    if (state.build_type === 'bowling') {
        if (state.money < 10) return;
        state.money -= 10;
        if (!state.balls) state.balls = [];
        state.balls.push(new BowlingBall());
        update_ui();
        return;
    }

    // PROMOTED LOGIC (Must be on top of tower)
    if (state.build_type === 'promoted') {
        // Find tower at pos
        const host = state.towers.find(t => t.gx === gx && t.gy === gy && t.type !== 'promoted' && t.type !== 'mine');
        if (!host) return; // Must be on a tower
        if (host.type === 'wall') return;

        const data = TOWERS['promoted'];
        if (state.money < data.cost) return;

        // Build Promoted
        state.money -= data.cost;
        const p = new Tower(gx, gy, 'promoted');
        p.host = host; // Link
        state.towers.push(p);
        update_ui();
        return;
    }

    // NORMAL TOWER LOGIC
    if (state.grid[gy][gx] === 1) return;
    if ((gx === state.spawn.x && gy === state.spawn.y) || (gx === state.exit.x && gy === state.exit.y)) return;
    const data = TOWERS[state.build_type];
    if (state.money < data.cost) return;
    const is_mine = data.is_trap;
    const is_pacman = (state.build_type === 'pacman');

    if (!is_mine && !is_pacman) {
        state.grid[gy][gx] = 1;
        recalc_path();

        if (state.path_blocked) {
            state.grid[gy][gx] = 0;
            recalc_path();
            return;
        }

        let trapped = false;
        for (let e of state.enemies) {
            if (!e.flying) {
                let d = state.flow_field[Math.floor(e.gy)][Math.floor(e.gx)];
                if (d >= 999) { trapped = true; break; }
            }
        }

        if (trapped) {
            state.grid[gy][gx] = 0;
            recalc_path();
            return;
        }
    }

    state.money -= data.cost;
    state.towers.push(new Tower(gx, gy, state.build_type));
    update_ui();
}

window.open_menu = function (tower, e) {
    if (state.selection === tower) { close_menu(); return; }
    state.selection = tower;
    const menu = document.getElementById('upgrade_menu');
    const data = TOWERS[tower.type];

    // Title
    document.getElementById('upg_title').innerText = `${data.name} (LV.${tower.lvl})`;

    // Stats Current
    document.getElementById('stat_dmg').innerText = tower.dmg > 1000 ? (tower.dmg / 1000).toFixed(1) + 'k' : Math.floor(tower.dmg);
    document.getElementById('stat_rng').innerText = tower.range.toFixed(1);

    // Stats Next (Prediction)
    const factor = data.upgrade_factor || 1.25;
    const next_dmg = tower.dmg * factor;
    const next_rng = tower.range;

    document.getElementById('stat_dmg_next').innerText = next_dmg > 1000 ? (next_dmg / 1000).toFixed(1) + 'k' : Math.floor(next_dmg);
    document.getElementById('stat_rng_next').innerText = next_rng.toFixed(1);

    // Costs
    const cost = Math.floor(data.cost * Math.pow(1.5, tower.lvl - 1));
    const sell = Math.floor(cost * 0.7);

    const btn_upgrade = document.getElementById('btn_upgrade');

    if (tower.type === 'mine' || tower.type === 'bowling' || tower.type === 'powerup' || tower.type === 'promoted' || tower.type === 'heart') {
        if (!data.upgrade_factor) {
            btn_upgrade.classList.add('hidden');
            document.getElementById('stat_dmg_next').innerText = '-';
        } else {
            btn_upgrade.classList.remove('hidden');
            document.getElementById('val_upg').innerText = cost;
            btn_upgrade.onclick = () => { if (state.money >= cost) { state.money -= cost; tower.upgrade(); close_menu(); update_ui(); } };
        }
    } else {
        btn_upgrade.classList.remove('hidden');
        document.getElementById('val_upg').innerText = cost;
        btn_upgrade.onclick = () => { if (state.money >= cost) { state.money -= cost; tower.upgrade(); close_menu(); update_ui(); } };
    }

    document.getElementById('val_sell').innerText = sell;
    document.getElementById('btn_sell').onclick = () => {
        state.money += sell;
        state.grid[tower.gy][tower.gx] = 0;
        state.towers = state.towers.filter(t => t !== tower);
        recalc_path();
        close_menu();
        update_ui();
    };

    menu.classList.remove('hidden');
}

function open_menu(tower, event) {
    // if(tower.type === 'mine') return; // REMOVED: Allow selecting mines
    state.selection = tower;
    const menu = document.getElementById('upgrade_menu');
    const data = TOWERS[tower.type];

    document.getElementById('upg_title').innerText = `${data.name} Lv.${tower.lvl}`;
    document.getElementById('stat_dmg').innerText = Math.floor(tower.dmg);
    document.getElementById('stat_rng').innerText = tower.range.toFixed(1);

    const cost = Math.floor(data.cost * tower.lvl);
    const sell = Math.floor(data.cost * 0.5 * tower.lvl);

    // Upgrade Button Logic
    const btn_upgrade = document.getElementById('btn_upgrade');
    if (tower.type === 'mine') {
        btn_upgrade.classList.add('hidden'); // Mines can't upgrade
    } else {
        btn_upgrade.classList.remove('hidden');
        document.getElementById('val_upg').innerText = cost;
        btn_upgrade.onclick = () => { if (state.money >= cost) { state.money -= cost; tower.upgrade(); close_menu(); update_ui(); } };
    }

    document.getElementById('val_sell').innerText = sell;
    document.getElementById('btn_sell').onclick = () => {
        state.money += sell;
        state.grid[tower.gy][tower.gx] = 0;
        state.towers = state.towers.filter(t => t !== tower);
        recalc_path();
        close_menu();
        update_ui();
    };

    menu.classList.remove('hidden');

    // Posicionamento inteligente (CLAMP dentro do game_area)
    const rect = canvas.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect(); // Need current size or guess
    const menuW = 150; // Aprox
    const menuH = 120; // Aprox

    const tx = (tower.gx * TILE_SIZE) + rect.left;
    const ty = (tower.gy * TILE_SIZE) + rect.top;

    // Default: Right of tower
    let mx = tx + TILE_SIZE + 10;
    let my = ty - (menuH / 2) + (TILE_SIZE / 2);

    // Check Right Edge
    if (mx + menuW > rect.right) {
        mx = tx - menuW - 10; // Flip to left
    }

    // Check Top/Bottom Edge
    if (my < rect.top) my = rect.top + 5;
    if (my + menuH > rect.bottom) my = rect.bottom - menuH - 5;

    menu.style.left = mx + 'px';
    menu.style.top = my + 'px';
}

window.close_menu = function () { document.getElementById('upgrade_menu').classList.add('hidden'); state.selection = null; }

// --- GAME LOOP ---

window.start_wave = function () {
    if (state.active || state.game_over || state.spawning) return;
    state.active = true;
    state.spawning = true;
    state.spawn_max = 20 + Math.floor(state.wave * 1.3);
    state.spawn_count = 0;
    state.spawn_timer = 0;
    state.spawn_delay = Math.floor(60 - Math.min(50, state.wave * 1.5)); // In frames (~1s down to ~0.16s)
}

// Spawn Logic
if (state.spawning) {
    if (state.spawn_timer <= 0) {
        // Air units only after Wave 10
        let fly = (state.wave >= 10 && state.wave % 3 === 0 && Math.random() < 0.4);
        state.enemies.push(new Enemy(state.wave, fly));
        state.spawn_count++;
        state.spawn_timer = state.spawn_delay;

        if (state.spawn_count >= state.spawn_max) {
            state.spawning = false;
        }
    } else {
        state.spawn_timer--;
    }
}

// Entities Update
state.towers.forEach(t => t.update());
for (let i = state.enemies.length - 1; i >= 0; i--) {
    let e = state.enemies[i];
    e.update();
    if (e.hp <= 0) state.enemies.splice(i, 1);
}
for (let i = state.projectiles.length - 1; i >= 0; i--) {
    let p = state.projectiles[i];
    p.update();
    if (p.hit) state.projectiles.splice(i, 1);
}
for (let i = state.particles.length - 1; i >= 0; i--) {
    let p = state.particles[i];
    p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
}

// Auto Wave Logic
// --- GAME LOGIC ---

function update_logic() {
    // Spawn Logic
    if (state.spawning) {
        if (state.spawn_timer <= 0) {
            // Air units only after Wave 10
            let fly = (state.wave >= 10 && state.wave % 3 === 0 && Math.random() < 0.4);
            state.enemies.push(new Enemy(state.wave, fly));
            state.spawn_count++;
            state.spawn_timer = state.spawn_delay;

            if (state.spawn_count >= state.spawn_max) {
                state.spawning = false;
            }
        } else {
            state.spawn_timer--;
        }
    }

    // Entities Update
    state.towers.forEach(t => t.update());
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();
        if (e.hp <= 0) state.enemies.splice(i, 1);
    }
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        let p = state.projectiles[i];
        p.update();
        if (p.hit) state.projectiles.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    if (state.balls) {
        for (let i = state.balls.length - 1; i >= 0; i--) {
            let b = state.balls[i];
            b.update();
            if (b.dead) state.balls.splice(i, 1);
        }
    }

    // Auto Wave Logic
    if (state.active && !state.spawning && state.enemies.length === 0) {
        state.active = false;
        if (!state.game_over) {
            state.wave++;
            update_ui();
            if (state.auto_wave) setTimeout(window.start_wave, 2000);

            // --- WAVE END LOGIC (Heart, Promoted) ---
            apply_wave_end_effects();
        }
    }
}

function apply_wave_end_effects() {
    state.towers.forEach(t => {
        // HEART: Burn Life, Double Money
        if (t.type === 'heart') {
            if (state.lives > 0) {
                state.lives--;
                state.money *= 2;
                create_explosion(t.gx, t.gy, 1, '#f43f5e'); // Effect
                if (state.lives <= 0) game_over();
            }
        }

        // PROMOTED: Upgrade host tower
        if (t.type === 'promoted' && t.host) {
            t.host.upgrade();
            create_explosion(t.gx, t.gy, 0.5, '#fbbf24'); // Level Up Effect

            // Check money for upkeep? "quando o usuário fica sem dinheiro, a torre é eliminada"
            // Does it consume money? User description: "quando o usuário fica sem dinheiro, a torre é eliminada".
            // Takes no money? Maybe it means "if money == 0"? Or it COSTS money to upgrade?
            // "cada onda faz o upgrade... Custo: $600 (to build)". 
            // Maybe it consumes the upgrade cost? "Promoted... quando o usuário fica sem dinheiro".
            // I will assume it consumes the UPGRADE COST of the host tower.
            // If can't pay, Promoted is destroyed.

            // Actually, standard upgrade has no cost variable here, it's formula.
            // Let's blindly upgrade. But the condition "sem dinheiro" implies consumption.
            // Let's make it consume $100 per wave? Or nothing?
            // User: "quando o usuário fica sem dinheiro". This implies it drains money?
            // I'll make it FREE upgrade, but if Money <= 0 it dies? That's rare.
            // Let's assume it consumes the upgrade value.

            /* Re-reading: "instala sobre uma torre. cada onda faz o upgrade da torre em 1. quando o usuário fica sem dinheiro, a torre é eliminada."
               Interpretation: It acts as an auto-upgrader that SPENDS your money.
            */

            const cost = Math.floor(TOWERS[t.host.type].cost * t.host.lvl);
            if (state.money >= cost) {
                state.money -= cost;
                // upgrade done above
            } else {
                // Can't afford, destroy promoted
                t.dead = true;
            }
        }
    });

    // Cleanup dead promoted
    state.towers = state.towers.filter(t => !t.dead);
    update_ui();
}



function draw_game() {
    // Background
    if (BG_IMG.complete) {
        ctx.drawImage(BG_IMG, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Grid
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; // Slate-700
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * TILE_SIZE, 0); ctx.lineTo(x * TILE_SIZE, canvas.height); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * TILE_SIZE); ctx.lineTo(canvas.width, y * TILE_SIZE); }
    ctx.stroke();

    // Spawn / Exit
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; ctx.fillRect(state.spawn.x * TILE_SIZE, state.spawn.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; ctx.fillRect(state.exit.x * TILE_SIZE, state.exit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    // Draw Entities
    state.towers.filter(t => t.type === 'mine').forEach(t => t.draw(ctx));
    state.enemies.forEach(e => { if (!e.flying) e.draw(ctx); });
    if (state.balls) state.balls.forEach(b => b.draw(ctx));
    state.towers.filter(t => t.type !== 'mine' && t.type !== 'bowling').forEach(t => t.draw(ctx));
    state.enemies.forEach(e => { if (e.flying) e.draw(ctx); });
    state.projectiles.forEach(p => p.draw(ctx));

    // Draw Particles
    state.particles.forEach(p => {
        const x = p.gx * TILE_SIZE + TILE_SIZE / 2;
        const y = p.gy * TILE_SIZE + TILE_SIZE / 2;
        ctx.fillStyle = p.color;
        if (p.type === 'shockwave') {
            let r = (1 - p.life / p.max_life) * p.max_size * TILE_SIZE;
            ctx.globalAlpha = p.life / p.max_life;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else {
            let sz = p.size * TILE_SIZE;
            ctx.fillRect(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, sz, sz);
        }
    });
}

// BOWLING BALL ENTITY
class BowlingBall {
    constructor() {
        this.gx = state.spawn.x;
        this.gy = state.spawn.y;
        this.speed = 0.15;
        this.dead = false;
        this.trail = 0;
    }

    update() {
        // Simple Movement: Just pick a random valid neighbor that isn't backwards?
        // Or pure random? "caminho ... é aleatorio"
        // Let's pick a random neighbor (up, down, left, right) that is within bounds.
        // To ensure it eventually reaches exit, maybe bias? 
        // "atravessa ... ate a saida". If pure random, it might never reach.
        // Let's use Flow Field but with noise?
        // Or just move towards exit but randomly deviate?

        // Let's do: 50% chance to follow flow field, 50% random neighbor.

        if (Math.abs(this.gx - Math.round(this.gx)) < 0.1 && Math.abs(this.gy - Math.round(this.gy)) < 0.1) {
            // Center of tile, pick new direction
            this.gx = Math.round(this.gx);
            this.gy = Math.round(this.gy);

            // Check collisions at center
            this.check_collision(); // Kill items

            if (this.gx === state.exit.x && this.gy === state.exit.y) {
                this.dead = true;
                return;
            }

            // Pick next tile
            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(d => ({ x: this.gx + d[0], y: this.gy + d[1] }))
                .filter(n => n.x >= 0 && n.x < COLS && n.y >= 0 && n.y < ROWS);

            // Bias: Flow Field
            const best = neighbors.sort((a, b) => state.flow_field[a.y][a.x] - state.flow_field[b.y][b.x])[0];

            if (Math.random() < 0.5 && best) {
                this.target = best;
            } else {
                this.target = neighbors[Math.floor(Math.random() * neighbors.length)];
            }
        }

        if (this.target) {
            let dx = this.target.x - this.gx;
            let dy = this.target.y - this.gy;
            let d = Math.hypot(dx, dy);
            if (d < this.speed) {
                this.gx = this.target.x;
                this.gy = this.target.y;
            } else {
                this.gx += (dx / d) * this.speed;
                this.gy += (dy / d) * this.speed;
            }
        }

        if (this.dead) return;
        // Continuous collision check for enemies
        this.check_collision_enemies();
    }

    check_collision() {
        // Hit Tower?
        const t = state.towers.find(t => t.gx === this.gx && t.gy === this.gy && t.type !== 'promoted');
        if (t) {
            if (t.type === 'wall') {
                // Eliminate BOTH
                this.dead = true;
            }
            // Elimina a torre
            state.grid[t.gy][t.gx] = 0;
            state.towers = state.towers.filter(x => x !== t);
            create_explosion(t.gx, t.gy, 0.5, 'black');
            update_ui();
            recalc_path();
        }
    }

    check_collision_enemies() {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let e = state.enemies[i];
            if (!e.flying && Math.hypot(e.gx - this.gx, e.gy - this.gy) < 0.5) {
                e.hit(99999, 'bowling');
                create_explosion(this.gx, this.gy, 0.3, 'black');
            }
        }
    }

    draw(ctx) {
        const x = this.gx * TILE_SIZE + TILE_SIZE / 2;
        const y = this.gy * TILE_SIZE + TILE_SIZE / 2;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x, y, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();

        // Holes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3, y - 3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + 3, 2, 0, Math.PI * 2); ctx.fill();
    }
}

function game_loop() {
    requestAnimationFrame(game_loop);
    if (state.paused) return;

    // Multi-step update for speed control
    for (let i = 0; i < state.speed; i++) {
        update_logic();
    }

    draw_game();
}

function update_ui() {
    document.getElementById('money').innerText = Math.floor(state.money);
    document.getElementById('lives').innerText = state.lives;
    document.getElementById('wave').innerText = state.wave;
}

// --- CONTROLS EXT ---

window.toggle_speed = function () {
    if (state.speed === 1) state.speed = 2;
    else if (state.speed === 2) state.speed = 4;
    else state.speed = 1;
    update_speed_btn();
}

function update_speed_btn() {
    const btn = document.getElementById('btn_speed');
    if (btn) {
        btn.innerHTML = `${state.speed}x`;
        btn.classList.remove('text-slate-400', 'text-yellow-400', 'text-red-500');
        if (state.speed === 1) btn.classList.add('text-slate-400');
        if (state.speed === 2) btn.classList.add('text-yellow-400');
        if (state.speed === 4) btn.classList.add('text-red-500');
    }
}



// --- DICE LOGIC & ANIMATION ---
window.show_dice_roll = function (tower) {
    // Inject CSS if not present
    if (!document.getElementById('dice_style')) {
        const css = `
        .dice-wrap { perspective: 1000px; }
        .dice { width: 100px; height: 100px; position: relative; transform-style: preserve-3d; animation: spin 0.5s infinite linear; }
        .face { position: absolute; width: 100px; height: 100px; background: white; border: 4px solid #333; border-radius: 16px; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; box-shadow: inset 0 0 20px rgba(0,0,0,0.2); }
        .face:nth-child(1) { transform: rotateY(0deg) translateZ(50px); }
        .face:nth-child(2) { transform: rotateY(90deg) translateZ(50px); }
        .face:nth-child(3) { transform: rotateY(180deg) translateZ(50px); }
        .face:nth-child(4) { transform: rotateY(-90deg) translateZ(50px); }
        .face:nth-child(5) { transform: rotateX(90deg) translateZ(50px); }
        .face:nth-child(6) { transform: rotateX(-90deg) translateZ(50px); }
        @keyframes spin { 0% { transform: rotateX(0deg) rotateY(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg); } }
        `;
        const style = document.createElement('style');
        style.id = 'dice_style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    // Modal
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in";
    modal.innerHTML = `
        <div class="flex flex-col items-center">
            <div class="dice-wrap mb-10 scale-150">
                <div class="dice" id="dice_anim">
                    <div class="face text-slate-800">1</div><div class="face text-slate-800">2</div><div class="face text-slate-800">3</div>
                    <div class="face text-slate-800">4</div><div class="face text-slate-800">5</div><div class="face text-slate-800">6</div>
                </div>
            </div>
            <h2 class="text-white text-4xl font-black animate-pulse text-shadow-lg tracking-widest" id="dice_status">ROLANDO...</h2>
        </div>
    `;
    document.body.appendChild(modal);

    // Pause Game
    const was_paused = state.paused;
    state.paused = true;

    setTimeout(() => {
        // Result
        const roll = Math.floor(Math.random() * 6) + 1;
        const dice = document.getElementById('dice_anim');
        dice.style.animation = 'none';

        // Show Face (Manual Rotation)
        const rot = [
            'rotateY(0deg)', 'rotateY(-90deg)', 'rotateY(180deg)', 'rotateY(90deg)', 'rotateX(-90deg)', 'rotateX(90deg)'
        ];
        dice.style.transform = rot[roll - 1];
        dice.style.transition = 'transform 0.5s ease-out';

        // Text
        const st = document.getElementById('dice_status');
        st.innerText = roll;
        st.className = "text-8xl font-black text-white scale-150 transition duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]";

        if (roll === 6) {
            st.innerHTML += '<br><div class="text-red-500 text-3xl mt-4 animate-bounce">💀 MATA TUDO! 💀</div>';
            modal.querySelector('.face').style.borderColor = '#ef4444';
        } else if (roll === 1) {
            st.innerHTML += '<br><div class="text-green-500 text-3xl mt-4 animate-bounce">💊 CURA TUDO! 💊</div>';
            modal.querySelector('.face').style.borderColor = '#22c55e';
        } else {
            st.innerHTML += '<br><div class="text-slate-400 text-2xl mt-4">NADA ACONTECE...</div>';
        }

        setTimeout(() => {
            // Apply Effect
            if (roll === 6) {
                state.enemies.forEach(e => e.hit(99999, 'dice'));
                create_explosion(tower.gx, tower.gy, 0.5, 'white');
            } else if (roll === 1) {
                state.enemies.forEach(e => e.hp = e.hp_max);
                create_explosion(tower.gx, tower.gy, 0.5, 'green');
            }

            // Remove Tower
            state.grid[tower.gy][tower.gx] = 0;
            state.towers = state.towers.filter(t => t !== tower);
            recalc_path();
            update_ui();

            // Unpause if wasn't paused
            if (!was_paused) state.paused = false;

            // Destroy Modal
            document.body.removeChild(modal);
            if (state.selection === tower) close_menu();

        }, 2000);

    }, 2000);
}

// --- LONG PRESS DETAIL LOGIC ---

function setup_long_press() {
    const btns = document.querySelectorAll('.tower_btn');
    btns.forEach(btn => {
        // Extract type from onclick="select_tower('xyz')"
        const onClickStr = btn.getAttribute('onclick');
        if (!onClickStr) return;

        let type = onClickStr.match(/'([^']+)'/)[1];
        if (!type) return;

        // Remove inline onclick to handle it manually
        btn.removeAttribute('onclick');

        let pressTimer;
        let isLongPress = false;

        const start = (e) => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                show_tower_detail(type);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500); // 500ms Long Press
        };

        const cancel = () => {
            clearTimeout(pressTimer);
        };

        // Handle Click (Selection)
        btn.onclick = (e) => {
            if (isLongPress) {
                // Handled by timer, do nothing
                isLongPress = false;
                return;
            }
            select_tower(type);
        };

        // Touch/Mouse Events
        btn.addEventListener('mousedown', start);
        btn.addEventListener('touchstart', start, { passive: true });

        btn.addEventListener('mouseup', cancel);
        btn.addEventListener('mouseleave', cancel);
        btn.addEventListener('touchend', cancel);
        btn.addEventListener('touchcancel', cancel);
    });
}

function show_tower_detail(type) {
    const modal = document.getElementById('tower_detail_modal');
    const t = TOWERS[type];
    if (!t) return;

    // Populate
    document.getElementById('detail_img').src = t.img;
    document.getElementById('detail_name').innerText = t.name;
    document.getElementById('detail_type').innerText = t.type.toUpperCase();
    document.getElementById('detail_desc').textContent = t.desc; // Use textContent for safety

    document.getElementById('detail_cost').innerText = '$' + t.cost;
    document.getElementById('detail_dmg').innerText = (t.dmg > 1000 ? (t.dmg / 1000).toFixed(1) + 'k' : t.dmg);
    document.getElementById('detail_rng').innerText = (t.rng || '-');
    document.getElementById('detail_rate').innerText = (t.rate || '-');

    modal.classList.remove('hidden');
}

window.close_tower_detail = function () {
    document.getElementById('tower_detail_modal').classList.add('hidden');
}

function init() {
    state.money = 600; // Starting money
    state.lives = 20;
    state.wave = 1;
    state.active = false;
    state.game_over = false;
    state.auto_wave = false;
    state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];

    // Initial Path
    recalc_path();

    // UI Updates
    document.getElementById('game_over').classList.add('hidden');

    // Start loop
    game_loop();
    update_ui();

    // Setup Long Press Details
    if (window.setup_long_press) setup_long_press();
}

// SETUP LONG PRESS
setup_long_press();
}
state.game_over = false;
state.spawning = false;
state.speed = 1;
state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
state.towers = [];
state.enemies = [];
state.projectiles = [];
state.particles = [];
state.balls = [];

// INHERITANCE LOGIC (Using Modal)
const inheritance = parseFloat(localStorage.getItem('td_inheritance'));
if (inheritance && inheritance > 0) {
    const bonus = Math.floor(inheritance);
    state.money += bonus;

    // Show Inheritance Modal
    const modal = document.getElementById('modal_inheritance');
    document.getElementById('inheritance_val').innerText = `+$${bonus}`;
    modal.classList.remove('hidden');

    localStorage.removeItem('td_inheritance');
}

state.auto_wave = document.getElementById('auto_wave').checked;
update_speed_btn();

resize();
recalc_path();
update_ui();
document.getElementById('game_over').classList.add('hidden');
}

// --- GAME OVER LOGIC ---

// --- GAME OVER LOGIC ---

function game_over() {
    if (state.game_over) return;
    state.game_over = true;
    state.active = false;
    state.spawning = false;

    // SAVE INHERITANCE
    // Formula: Money * (100 - Wave) / 200
    // If Wave >= 100, Inheritance is <= 0 -> "Deserdado"
    const inheritance = state.money * ((100 - state.wave) / 200.0);

    const el_inh = document.getElementById('final_inheritance');

    if (inheritance > 0) {
        localStorage.setItem('td_inheritance', inheritance);
        el_inh.innerText = `+$${Math.floor(inheritance)}`;
        el_inh.classList.remove('text-red-500');
        el_inh.classList.add('text-yellow-400');
    } else {
        localStorage.removeItem('td_inheritance');
        el_inh.innerText = "DESERDADO";
        el_inh.classList.remove('text-yellow-400');
        el_inh.classList.add('text-red-500');
    }

    // Populate Results
    document.getElementById('final_wave').innerText = state.wave;
    document.getElementById('final_money').innerText = `$${Math.floor(state.money)}`;
    document.getElementById('final_inheritance').innerText = `+$${Math.floor(inheritance)}`;

    // Show Game Over Screen (No High Scores)
    document.getElementById('game_over').classList.remove('hidden');
}

window.restart_game = function () {
    document.getElementById('game_over').classList.add('hidden');
    document.getElementById('auto_wave').checked = false;
    init();
}

window.toggle_pause = function () { state.paused = !state.paused; }

init();
game_loop();
// --- LONG PRESS DETAIL LOGIC ---

window.setup_long_press = function () {
    const btns = document.querySelectorAll('.tower_btn');
    btns.forEach(btn => {
        const onClickStr = btn.getAttribute('onclick');
        let type = btn.dataset.type;

        if (!type && onClickStr) {
            const match = onClickStr.match(/'([^']+)'/);
            if (match) type = match[1];
        }
        if (!type) return;

        btn.dataset.type = type;
        btn.removeAttribute('onclick');

        // Clone to clear old events
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        let pressTimer;
        let isLongPress = false;

        const start = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                show_tower_detail(type);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        };

        const cancel = () => { clearTimeout(pressTimer); };

        newBtn.addEventListener('mousedown', (e) => { start(e); newBtn.style.transform = 'scale(0.95)'; });
        newBtn.addEventListener('touchstart', (e) => { start(e); newBtn.style.transform = 'scale(0.95)'; }, { passive: true });

        newBtn.addEventListener('mouseup', () => { cancel(); newBtn.style.transform = 'scale(1)'; });
        newBtn.addEventListener('mouseleave', () => { cancel(); newBtn.style.transform = 'scale(1)'; });
        newBtn.addEventListener('touchend', () => { cancel(); newBtn.style.transform = 'scale(1)'; });

        newBtn.onclick = (e) => {
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
                isLongPress = false;
                return;
            }
            select_tower(type);
        };
    });
}

window.show_tower_detail = function (type) {
    const modal = document.getElementById('tower_detail_modal');
    const t = TOWERS[type];
    if (!t) return;

    document.getElementById('detail_img').src = t.img;
    document.getElementById('detail_name').innerText = t.name;
    document.getElementById('detail_type').innerText = t.type.toUpperCase();
    document.getElementById('detail_desc').textContent = t.desc;

    document.getElementById('detail_cost').innerText = '$' + t.cost;
    document.getElementById('detail_dmg').innerText = (t.dmg > 1000 ? (t.dmg / 1000).toFixed(1) + 'k' : t.dmg);
    document.getElementById('detail_rng').innerText = (t.rng || '-');
    document.getElementById('detail_rate').innerText = (t.rate || '-');

    modal.classList.remove('hidden');
}

window.close_tower_detail = function () {
    document.getElementById('tower_detail_modal').classList.add('hidden');
}
