// Digital Detective - Minesweeper Game
const MinesweeperApp = {
    game: null,
    gameState: 'ready', // ready, playing, won, lost
    
    open() {
        const content = this.createMinesweeperInterface();
        
        WindowManager.createWindow('minesweeper', 'Minesweeper', content, {
            width: 400,
            height: 500,
            x: 500,
            y: 100,
            resizable: false
        });
        
        this.initGame();
        this.setupEventListeners();
    },
    
    createMinesweeperInterface() {
        return `
            <div class="minesweeper-game">
                <div class="menu-bar">
                    <span class="menu-item" onclick="MinesweeperApp.showGameMenu()">Jogo</span>
                    <span class="menu-item" onclick="MinesweeperApp.showHelpMenu()">Ajuda</span>
                </div>
                
                <div class="minesweeper-header">
                    <div class="mine-counter" id="mine-counter">010</div>
                    <button class="smiley-button" id="smiley-button">🙂</button>
                    <div class="timer" id="timer">000</div>
                </div>
                
                <div class="minefield" id="minefield">
                    <!-- Minefield will be generated here -->
                </div>
                
                <div class="status-bar">
                    <span id="game-status">Clique no campo para começar</span>
                </div>
            </div>
        `;
    },
    
    setupEventListeners() {
        const windowElement = document.getElementById('window-minesweeper');
        if (!windowElement) return;
        
        // Smiley button (new game)
        windowElement.querySelector('#smiley-button').addEventListener('click', () => {
            this.newGame();
        });
        
        // Prevent context menu on minefield
        windowElement.querySelector('#minefield').addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Listen for app refresh
        EventBus.on('refreshApp', (appId) => {
            if (appId === 'minesweeper') {
                this.newGame();
            }
        });
    },
    
    initGame() {
        this.game = {
            width: CONFIG.MINESWEEPER.BEGINNER.width,
            height: CONFIG.MINESWEEPER.BEGINNER.height,
            mines: CONFIG.MINESWEEPER.BEGINNER.mines,
            board: [],
            revealed: [],
            flagged: [],
            firstClick: true,
            startTime: null,
            timer: null
        };
        
        this.gameState = 'ready';
        this.createBoard();
        this.renderBoard();
        this.updateDisplay();
    },
    
    newGame() {
        this.stopTimer();
        this.initGame();
        document.getElementById('smiley-button').textContent = '🙂';
        document.getElementById('game-status').textContent = 'Clique no campo para começar';
    },
    
    createBoard() {
        // Initialize empty board
        this.game.board = [];
        this.game.revealed = [];
        this.game.flagged = [];
        
        for (let y = 0; y < this.game.height; y++) {
            this.game.board[y] = [];
            this.game.revealed[y] = [];
            this.game.flagged[y] = [];
            for (let x = 0; x < this.game.width; x++) {
                this.game.board[y][x] = 0;
                this.game.revealed[y][x] = false;
                this.game.flagged[y][x] = false;
            }
        }
    },
    
    placeMines(firstClickX, firstClickY) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.game.mines) {
            const x = Math.floor(Math.random() * this.game.width);
            const y = Math.floor(Math.random() * this.game.height);
            
            // Don't place mine on first click or if already has mine
            if ((x === firstClickX && y === firstClickY) || this.game.board[y][x] === -1) {
                continue;
            }
            
            this.game.board[y][x] = -1; // -1 represents a mine
            minesPlaced++;
        }
        
        // Calculate numbers
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                if (this.game.board[y][x] !== -1) {
                    this.game.board[y][x] = this.countAdjacentMines(x, y);
                }
            }
        }
    },
    
    countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.game.width && ny >= 0 && ny < this.game.height) {
                    if (this.game.board[ny][nx] === -1) {
                        count++;
                    }
                }
            }
        }
        return count;
    },
    
    renderBoard() {
        const minefield = document.getElementById('minefield');
        if (!minefield) return;
        
        minefield.innerHTML = '';
        minefield.style.gridTemplateColumns = `repeat(${this.game.width}, 20px)`;
        
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Add event listeners
                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.cellClick(x, y, false);
                });
                
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.cellClick(x, y, true);
                });
                
                minefield.appendChild(cell);
            }
        }
        
        this.updateBoard();
    },
    
    updateBoard() {
        const cells = document.querySelectorAll('.mine-cell');
        
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            
            cell.className = 'mine-cell';
            cell.textContent = '';
            
            if (this.game.flagged[y][x]) {
                cell.classList.add('flagged');
                cell.textContent = '🚩';
            } else if (this.game.revealed[y][x]) {
                cell.classList.add('revealed');
                
                if (this.game.board[y][x] === -1) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (this.game.board[y][x] > 0) {
                    cell.textContent = this.game.board[y][x];
                    cell.classList.add(`number-${this.game.board[y][x]}`);
                }
            }
        });
    },
    
    cellClick(x, y, rightClick) {
        if (this.gameState === 'won' || this.gameState === 'lost') {
            return;
        }
        
        if (rightClick) {
            // Right click - toggle flag
            if (!this.game.revealed[y][x]) {
                this.game.flagged[y][x] = !this.game.flagged[y][x];
                this.updateBoard();
                this.updateDisplay();
            }
            return;
        }
        
        // Left click - reveal cell
        if (this.game.flagged[y][x] || this.game.revealed[y][x]) {
            return;
        }
        
        // First click - place mines
        if (this.game.firstClick) {
            this.placeMines(x, y);
            this.game.firstClick = false;
            this.startTimer();
            this.gameState = 'playing';
            document.getElementById('game-status').textContent = 'Jogo em andamento...';
        }
        
        // Reveal cell
        if (this.game.board[y][x] === -1) {
            // Hit a mine
            this.revealMines();
            this.gameState = 'lost';
            document.getElementById('smiley-button').textContent = '😵';
            document.getElementById('game-status').textContent = 'Você perdeu! Clique na carinha para jogar novamente.';
            this.stopTimer();
            Utils.playSound(CONFIG.SOUNDS.MINE_EXPLODE);
        } else {
            // Safe cell
            this.revealCell(x, y);
            
            if (this.checkWin()) {
                this.gameState = 'won';
                document.getElementById('smiley-button').textContent = '😎';
                document.getElementById('game-status').textContent = 'Parabéns! Você venceu!';
                this.stopTimer();
                
                // Flag all remaining mines
                this.flagAllMines();
            }
        }
        
        this.updateBoard();
        this.updateDisplay();
    },
    
    revealCell(x, y) {
        if (x < 0 || x >= this.game.width || y < 0 || y >= this.game.height) {
            return;
        }
        
        if (this.game.revealed[y][x] || this.game.flagged[y][x]) {
            return;
        }
        
        this.game.revealed[y][x] = true;
        
        // If empty cell, reveal adjacent cells
        if (this.game.board[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    this.revealCell(x + dx, y + dy);
                }
            }
        }
    },
    
    revealMines() {
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                if (this.game.board[y][x] === -1) {
                    this.game.revealed[y][x] = true;
                }
            }
        }
    },
    
    flagAllMines() {
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                if (this.game.board[y][x] === -1) {
                    this.game.flagged[y][x] = true;
                }
            }
        }
    },
    
    checkWin() {
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                if (this.game.board[y][x] !== -1 && !this.game.revealed[y][x]) {
                    return false;
                }
            }
        }
        return true;
    },
    
    updateDisplay() {
        // Update mine counter
        const flaggedCount = this.game.flagged.flat().filter(f => f).length;
        const remainingMines = this.game.mines - flaggedCount;
        document.getElementById('mine-counter').textContent = remainingMines.toString().padStart(3, '0');
        
        // Timer is updated by the timer interval
    },
    
    startTimer() {
        this.game.startTime = Date.now();
        this.game.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.game.startTime) / 1000);
            document.getElementById('timer').textContent = Math.min(elapsed, 999).toString().padStart(3, '0');
        }, 1000);
    },
    
    stopTimer() {
        if (this.game.timer) {
            clearInterval(this.game.timer);
            this.game.timer = null;
        }
    },
    
    showGameMenu() {
        const content = `
            <div style="padding: 16px;">
                <h3>Novo Jogo</h3>
                <div style="margin: 16px 0;">
                    <label class="radio">
                        <input type="radio" name="difficulty" value="beginner" checked>
                        Iniciante (9x9, 10 minas)
                    </label><br>
                    <label class="radio">
                        <input type="radio" name="difficulty" value="intermediate">
                        Intermediário (16x16, 40 minas)
                    </label><br>
                    <label class="radio">
                        <input type="radio" name="difficulty" value="expert">
                        Especialista (30x16, 99 minas)
                    </label>
                </div>
                <div style="margin-top: 16px; text-align: right;">
                    <button class="btn btn-primary" onclick="MinesweeperApp.changeDifficulty()">OK</button>
                    <button class="btn btn-secondary" onclick="WindowManager.closeWindow('minesweeper-menu')">Cancelar</button>
                </div>
            </div>
        `;
        
        WindowManager.createWindow('minesweeper-menu', 'Minesweeper - Novo Jogo', content, {
            width: 300,
            height: 200,
            x: 400,
            y: 200,
            resizable: false
        });
    },
    
    changeDifficulty() {
        const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked')?.value;
        
        if (selectedDifficulty) {
            const settings = CONFIG.MINESWEEPER[selectedDifficulty.toUpperCase()];
            this.game.width = settings.width;
            this.game.height = settings.height;
            this.game.mines = settings.mines;
            
            this.newGame();
            WindowManager.closeWindow('minesweeper-menu');
            
            // Resize window for different difficulties
            const windowElement = document.getElementById('window-minesweeper');
            if (windowElement) {
                const newWidth = Math.max(300, settings.width * 20 + 40);
                const newHeight = settings.height * 20 + 150;
                windowElement.style.width = `${newWidth}px`;
                windowElement.style.height = `${newHeight}px`;
            }
        }
    },
    
    showHelpMenu() {
        const content = `
            <div style="padding: 16px;">
                <h3>Como Jogar Minesweeper</h3>
                <div style="line-height: 1.6; font-size: 11px;">
                    <p><strong>Objetivo:</strong> Encontre todas as células sem minas.</p>
                    <br>
                    <p><strong>Controles:</strong></p>
                    <ul>
                        <li>Clique esquerdo: Revelar célula</li>
                        <li>Clique direito: Marcar/desmarcar bandeira</li>
                        <li>Carinha sorridente: Novo jogo</li>
                    </ul>
                    <br>
                    <p><strong>Números:</strong> Indicam quantas minas estão nas células adjacentes.</p>
                    <br>
                    <p><strong>Dica:</strong> Use as bandeiras para marcar onde você acha que há minas!</p>
                </div>
                <div style="margin-top: 16px; text-align: right;">
                    <button class="btn btn-primary" onclick="WindowManager.closeWindow('minesweeper-help')">OK</button>
                </div>
            </div>
        `;
        
        WindowManager.createWindow('minesweeper-help', 'Minesweeper - Ajuda', content, {
            width: 350,
            height: 300,
            x: 450,
            y: 150,
            resizable: false
        });
    }
};

