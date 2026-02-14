// chess - Phaser.js Game
// Tone.js music and AI chess

// ========= Tone.js background music =========
let musicStarted = false;
function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted = true;
  if (typeof Tone === 'undefined') return;
  Tone.start();
  const synth = new Tone.PolySynth().toDestination();
  const bass = new Tone.MonoSynth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.3, decay: 0.4, sustain: 0.6, release: 0.8 }
  }).toDestination();
  const pad = new Tone.PolySynth().toDestination();
  pad.set({ detune: -20, oscillator: { type: 'triangle' } });

  const chessTheme = [
    { time: '0:0', note: 'C4', dur: '8n' },
    { time: '0:0', note: 'E4', dur: '8n' },
    { time: '0:0', note: 'G4', dur: '8n' },
    { time: '0:1', note: 'C5', dur: '4n' },
    { time: '0:2', note: 'A4', dur: '8n' },
    { time: '0:3', note: 'G4', dur: '8n' },
    { time: '1:0', note: 'F4', dur: '8n' },
    { time: '1:1', note: 'E4', dur: '8n' },
    { time: '1:2', note: 'D4', dur: '8n' },
    { time: '1:3', note: 'E4', dur: '4n' },
    { time: '2:0', note: 'C4', dur: '8n' },
    { time: '2:1', note: 'E4', dur: '8n' },
    { time: '2:2', note: 'G4', dur: '8n' },
    { time: '2:3', note: 'B4', dur: '4n' },
    { time: '3:0', note: 'C5', dur: '2n' }
  ];
  const bassline = [
    { time: '0:0', note: 'C2', dur: '2n' },
    { time: '0:2', note: 'G2', dur: '2n' },
    { time: '1:0', note: 'A2', dur: '2n' },
    { time: '1:2', note: 'E2', dur: '2n' },
    { time: '2:0', note: 'F2', dur: '2n' },
    { time: '2:2', note: 'C2', dur: '2n' },
    { time: '3:0', note: 'G2', dur: '1n' }
  ];
  const padChords = [
    { time: '0:0', notes: ['C4','E4','G4'], dur: '1m' },
    { time: '1:0', notes: ['A4','C5','E5'], dur: '1m' },
    { time: '2:0', notes: ['F4','A4','C5'], dur: '1m' },
    { time: '3:0', notes: ['G4','B4','D5'], dur: '1m' }
  ];
  const part = new Tone.Part(function(time, event) {
    if (event.note) synth.triggerAttackRelease(event.note, event.dur, time);
  }, chessTheme).start(0);
  const bassPart = new Tone.Part(function(time, event) {
    bass.triggerAttackRelease(event.note, event.dur, time);
  }, bassline).start(0);
  const padPart = new Tone.Part(function(time, event) {
    pad.triggerAttackRelease(event.notes, event.dur, time);
  }, padChords).start(0);
  part.loop = true;
  part.loopEnd = '4m';
  bassPart.loop = true;
  bassPart.loopEnd = '4m';
  padPart.loop = true;
  padPart.loopEnd = '4m';
  Tone.Transport.bpm.value = 90;
  Tone.Transport.start('+' + 0.1);
}

// ========= Chess logic =========
const PIECE_SCORES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';
const RANKS = '87654321';

function fileRankToXY(f, r) {
  return { x: FILES.indexOf(f), y: RANKS.indexOf(r) };
}
function xyToFileRank(x, y) {
  return { f: FILES[x], r: RANKS[y] };
}

// Simple move generator & AI
function generateMoves(board, color) {
  const moves = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;
      if ((color === 'w' && piece.toUpperCase() === piece) || (color === 'b' && piece.toLowerCase() === piece)) {
        const pseudo = generatePseudo(piece, x, y, board);
        for (const m of pseudo) moves.push({ from: { x, y }, to: m });
      }
    }
  }
  return moves;
}

function generatePseudo(piece, x, y, board) {
  const moves = [];
  const isWhite = piece.toUpperCase() === piece;
  const me = isWhite ? piece.toLowerCase() : piece;
  const enemy = isWhite ? (c) => c && c === c.toLowerCase() && c !== '' : (c) => c && c === c.toUpperCase() && c !== '';
  const empty = (c) => c === '';
  const addLine = (dx, dy) => {
    for (let i = 1; i < 8; i++) {
      const nx = x + dx * i, ny = y + dy * i;
      if (nx < 0 || nx > 7 || ny < 0 || ny > 7) break;
      const target = board[ny][nx];
      if (empty(target)) moves.push({ x: nx, y: ny });
      else { if (enemy(target)) moves.push({ x: nx, y: ny }); break; }
    }
  };
  if (me === 'p') {
    const dir = isWhite ? -1 : 1;
    if (y + dir >= 0 && y + dir < 8) {
      if (empty(board[y + dir][x])) moves.push({ x, y: y + dir });
      if (x > 0 && enemy(board[y + dir][x - 1])) moves.push({ x: x - 1, y: y + dir });
      if (x < 7 && enemy(board[y + dir][x + 1])) moves.push({ x: x + 1, y: y + dir });
    }
  }
  if (me === 'n') {
    const jumps = [
      { dx: 2, dy: 1 }, { dx: 1, dy: 2 }, { dx: -1, dy: 2 }, { dx: -2, dy: 1 },
      { dx: -2, dy: -1 }, { dx: -1, dy: -2 }, { dx: 1, dy: -2 }, { dx: 2, dy: -1 }
    ];
    for (const j of jumps) {
      const nx = x + j.dx, ny = y + j.dy;
      if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
      const target = board[ny][nx];
      if (empty(target) || enemy(target)) moves.push({ x: nx, y: ny });
    }
  }
  if (me === 'k') {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
        const target = board[ny][nx];
        if (empty(target) || enemy(target)) moves.push({ x: nx, y: ny });
      }
    }
  }
  if (me === 'b' || me === 'q') {
    addLine(1, 1); addLine(1, -1); addLine(-1, 1); addLine(-1, -1);
  }
  if (me === 'r' || me === 'q') {
    addLine(1, 0); addLine(-1, 0); addLine(0, 1); addLine(0, -1);
  }
  return moves;
}

function evaluateBoard(board) {
  let score = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = board[y][x];
      if (!p) continue;
      const type = p.toLowerCase();
      const value = PIECE_SCORES[type] || 0;
      score += (p === p.toUpperCase() ? value : -value);
    }
  }
  return score;
}

function makeMove(board, move) {
  const newBoard = board.map(r => r.slice());
  const piece = newBoard[move.from.y][move.from.x];
  newBoard[move.from.y][move.from.x] = '';
  newBoard[move.to.y][move.to.x] = piece;
  return newBoard;
}

function miniMaxRoot(board, depth, isMaximizing) {
  const moves = generateMoves(board, isMaximizing ? 'w' : 'b');
  let bestMove = null;
  let bestValue = isMaximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const newBoard = makeMove(board, move);
    const value = miniMax(newBoard, depth - 1, !isMaximizing, -Infinity, Infinity);
    if (isMaximizing ? value > bestValue : value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  return bestMove;
}

function miniMax(board, depth, isMaximizing, alpha, beta) {
  if (depth === 0) return evaluateBoard(board);
  const moves = generateMoves(board, isMaximizing ? 'w' : 'b');
  if (moves.length === 0) return isMaximizing ? -1000 : 1000;
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const eval_ = miniMax(newBoard, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const eval_ = miniMax(newBoard, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ========= Phaser scene =========
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.script('tonejs', 'https://unpkg.com/tone@14.8.49/build/Tone.js');
    // Create chess piece textures
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const drawPiece = (color, letter, size) => {
      g.clear();
      g.fillStyle(color);
      g.fillRect(0, 0, size, size);
      g.fillStyle(0x000000);
      g.fillRect(1, 1, size - 2, size - 2);
      g.fillStyle(color);
      g.fillRect(4, 4, size - 8, size - 8);
      g.fillStyle(0x000000);
      g.fillStyle(0xffffff);
      g.fillRect(size / 2 - 2, 2, 4, size - 4);
      g.fillRect(2, size / 2 - 2, size - 4, 4);
      g.fillStyle(0x000000);
      g.fillText(letter, size / 2 - 4, size / 2 + 4);
    };
    drawPiece(0xffffff, 'P', 48);
    g.generateTexture('wP', 48, 48);
    drawPiece(0x000000, 'P', 48);
    g.generateTexture('bP', 48, 48);
    drawPiece(0xffffff, 'N', 48);
    g.generateTexture('wN', 48, 48);
    drawPiece(0x000000, 'N', 48);
    g.generateTexture('bN', 48, 48);
    drawPiece(0xffffff, 'B', 48);
    g.generateTexture('wB', 48, 48);
    drawPiece(0x000000, 'B', 48);
    g.generateTexture('bB', 48, 48);
    drawPiece(0xffffff, 'R', 48);
    g.generateTexture('wR', 48, 48);
    drawPiece(0x000000, 'R', 48);
    g.generateTexture('bR', 48, 48);
    drawPiece(0xffffff, 'Q', 48);
    g.generateTexture('wQ', 48, 48);
    drawPiece(0x000000, 'Q', 48);
    g.generateTexture('bQ', 48, 48);
    drawPiece(0xffffff, 'K', 48);
    g.generateTexture('wK', 48, 48);
    drawPiece(0x000000, 'K', 48);
    g.generateTexture('bK', 48, 48);
    // Board square
    g.clear();
    g.fillStyle(0x769656);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture('square', 64, 64);
    g.clear();
    g.fillStyle(0xeeeed2);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture('squareLight', 64, 64);
    // Selection
    g.clear();
    g.lineStyle(4, 0xff0000);
    g.strokeRect(2, 2, 60, 60);
    g.generateTexture('select', 64, 64);
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.boardContainer = this.add.container(100, 100);
    this.boardSprites = [];
    this.selected = null;
    this.turn = 'w';
    this.aiColor = 'b';
    this.depth = 3;
    this.board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    this.createBoard();
    this.input.on('gameobjectdown', (pointer, obj) => this.onSquareClick(obj));
    this.scoreText = this.add.text(600, 120, 'White: 0\nBlack: 0', { fontSize: '24px', fill: '#fff' });
    this.turnText = this.add.text(600, 200, 'Turn: White', { fontSize: '24px', fill: '#fff' });
    this.add.text(600, 260, 'Click to move\nAI plays Black', { fontSize: '18px', fill: '#ccc' });
    this.updateScore();
    this.events.on('wake', () => { if (!musicStarted) startBackgroundMusic(); });
    setTimeout(() => startBackgroundMusic(), 500);
  }

  createBoard() {
    this.boardContainer.removeAll(true);
    this.boardSprites = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 8; x++) {
        const color = (x + y) % 2 === 0 ? 'squareLight' : 'square';
        const sq = this.add.sprite(x * 64, y * 64, color).setInteractive();
        sq.gridX = x; sq.gridY = y;
        this.boardContainer.add(sq);
        const piece = this.board[y][x];
        const spr = piece ? this.add.sprite(x * 64, y * 64, (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toUpperCase()) : null;
        if (spr) this.boardContainer.add(spr);
        row.push({ square: sq, piece: spr });
      }
      this.boardSprites.push(row);
    }
  }

  updateBoard() {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cell = this.boardSprites[y][x];
        if (cell.piece) { cell.piece.destroy(); cell.piece = null; }
        const p = this.board[y][x];
        if (p) {
          cell.piece = this.add.sprite(x * 64, y * 64, (p === p.toUpperCase() ? 'w' : 'b') + p.toUpperCase());
          this.boardContainer.add(cell.piece);
        }
      }
    }
  }

  onSquareClick(square) {
    const x = square.gridX, y = square.gridY;
    if (this.turn !== 'w') return;
    if (this.selected) {
      const move = { from: { x: this.selected.x, y: this.selected.y }, to: { x, y } };
      const moves = generateMoves(this.board, 'w');
      const legal = moves.find(m => m.from.x === move.from.x && m.from.y === move.from.y && m.to.x === x && m.to.y === y);
      if (legal) {
        this.executeMove(legal);
        this.selected = null;
        this.clearHighlights();
        return;
      }
    }
    this.clearHighlights();
    const piece = this.board[y][x];
    if (piece && piece === piece.toUpperCase()) {
      this.selected = { x, y };
      this.boardSprites[y][x].square.setTexture('select');
    } else {
      this.selected = null;
    }
  }

  clearHighlights() {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const color = (x + y) % 2 === 0 ? 'squareLight' : 'square';
        this.boardSprites[y][x].square.setTexture(color);
      }
    }
  }

  executeMove(move) {
    const newBoard = makeMove(this.board, move);
    this.board = newBoard;
    this.updateBoard();
    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.turnText.setText('Turn: ' + (this.turn === 'w' ? 'White' : 'Black'));
    this.updateScore();
    if (this.turn === this.aiColor) {
      this.time.delayedCall(500, () => this.aiMove());
    }
  }

  aiMove() {
    if (this.turn !== this.aiColor) return;
    const move = miniMaxRoot(this.board, this.depth, false);
    if (move) this.executeMove(move);
  }

  updateScore() {
    let white = 0, black = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (!p) continue;
        const val = PIECE_SCORES[p.toLowerCase()] || 0;
        if (p === p.toUpperCase()) white += val; else black += val;
      }
    }
    this.scoreText.setText('White: ' + white + '\nBlack: ' + black);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: MainScene
};
const game = new Phaser.Game(config);