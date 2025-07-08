// Digital Detective - Main Application
class DigitalDetectiveApp {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateClock();
        this.loadGameState();
        
        // Start clock update interval
        setInterval(() => this.updateClock(), 1000);
        
        console.log('Digital Detective initialized');
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this.toggleStartMenu();
        });
        
        // Desktop icons
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', () => {
                const app = icon.dataset.app;
                this.openApp(app);
            });
            
            icon.addEventListener('click', () => {
                this.selectDesktopIcon(icon);
            });
        });
        
        // Start menu items
        document.querySelectorAll('.start-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const app = item.dataset.app;
                const action = item.dataset.action;
                
                if (app) {
                    this.openApp(app);
                } else if (action) {
                    this.handleAction(action);
                }
                
                this.hideStartMenu();
            });
        });
        
        // Game setup modal
        this.setupGameModal();
        
        // Click outside to close start menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#start-button') && !e.target.closest('#start-menu')) {
                this.hideStartMenu();
            }
        });
        
        // Click outside to deselect desktop icons
        document.getElementById('desktop').addEventListener('click', (e) => {
            if (e.target.id === 'desktop') {
                this.deselectAllDesktopIcons();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }
    
    setupGameModal() {
        const modal = document.getElementById('game-setup-modal');
        const startButton = document.getElementById('start-game-btn');
        let selectedAssistant = null;
        
        // Assistant selection
        document.querySelectorAll('.assistant-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.assistant-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedAssistant = parseInt(card.dataset.assistant);
                startButton.disabled = false;
            });
        });
        
        // Start game button
        startButton.addEventListener('click', async () => {
            if (selectedAssistant) {
                try {
                    startButton.disabled = true;
                    startButton.textContent = 'Iniciando...';
                    
                    const response = await API.game.start(selectedAssistant);
                    APIHandlers.handleGameStart(response);
                    
                    modal.classList.add('hidden');
                    
                    // Open initial apps
                    setTimeout(() => {
                        this.openApp('news');
                        setTimeout(() => this.openApp('chat'), 500);
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error starting game:', error);
                    Utils.showNotification('Erro ao iniciar o jogo. Tente novamente.', 'error');
                } finally {
                    startButton.disabled = false;
                    startButton.textContent = 'Iniciar Jogo';
                }
            }
        });
        
        // Close modal
        document.querySelectorAll('[data-action="close-setup"]').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        });
        
        // Show modal on first load
        if (!GAME_STATE.isGameStarted) {
            setTimeout(() => {
                modal.classList.remove('hidden');
            }, 1000);
        }
    }
    
    updateClock() {
        const now = new Date();
        const timeString = Utils.formatTime(now);
        document.getElementById('clock').textContent = timeString;
    }
    
    toggleStartMenu() {
        const startMenu = document.getElementById('start-menu');
        startMenu.classList.toggle('hidden');
        Utils.playSound(CONFIG.SOUNDS.BUTTON_CLICK);
    }
    
    hideStartMenu() {
        document.getElementById('start-menu').classList.add('hidden');
    }
    
    selectDesktopIcon(icon) {
        this.deselectAllDesktopIcons();
        icon.classList.add('selected');
    }
    
    deselectAllDesktopIcons() {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.classList.remove('selected');
        });
    }
    
    openApp(appName) {
        if (!GAME_STATE.isGameStarted && appName !== 'minesweeper') {
            Utils.showNotification(CONFIG.MESSAGES.GAME_NOT_STARTED, 'error');
            return;
        }
        
        // Check if window already exists
        if (WindowManager.windowExists(appName)) {
            WindowManager.focusWindow(appName);
            return;
        }
        
        switch (appName) {
            case 'email':
                EmailApp.open();
                break;
            case 'chat':
                ChatApp.open();
                break;
            case 'news':
                NewsApp.open();
                break;
            case 'notes':
                NotesApp.open();
                break;
            case 'investigation':
                InvestigationApp.open();
                break;
            case 'minesweeper':
                MinesweeperApp.open();
                break;
            default:
                console.warn(`Unknown app: ${appName}`);
        }
        
        Utils.playSound(CONFIG.SOUNDS.BUTTON_CLICK);
    }
    
    handleAction(action) {
        switch (action) {
            case 'about':
                this.showAboutDialog();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }
    
    showAboutDialog() {
        const content = `
            <div style="text-align: center; padding: 20px;">
                <h2>Digital Detective</h2>
                <p>O Mistério da Mansão Blackwood</p>
                <br>
                <p>Uma experiência imersiva de investigação noir onde você assume o papel de um detetive dos anos 2000.</p>
                <br>
                <p>Desenvolvido Por Juliana e Thalyson</p>
                <br>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="WindowManager.closeWindow('about')">OK</button>
                </div>
            </div>
        `;
        
        WindowManager.createWindow('about', 'Sobre - Digital Detective', content, {
            width: 400,
            height: 300,
            resizable: false,
            maximizable: false
        });
    }
    
    handleKeyboard(e) {
        // Alt + Tab - Switch windows
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.switchWindow();
        }
        
        // Escape - Close active window or start menu
        if (e.key === 'Escape') {
            if (!document.getElementById('start-menu').classList.contains('hidden')) {
                this.hideStartMenu();
            } else if (GAME_STATE.activeWindow) {
                WindowManager.closeWindow(GAME_STATE.activeWindow);
            }
        }
        
        // F5 - Refresh current app
        if (e.key === 'F5') {
            e.preventDefault();
            this.refreshCurrentApp();
        }
    }
    
    switchWindow() {
        const windowIds = Array.from(GAME_STATE.windows.keys());
        if (windowIds.length === 0) return;
        
        const currentIndex = windowIds.indexOf(GAME_STATE.activeWindow);
        const nextIndex = (currentIndex + 1) % windowIds.length;
        WindowManager.focusWindow(windowIds[nextIndex]);
    }
    
    refreshCurrentApp() {
        if (!GAME_STATE.activeWindow) return;
        
        const windowData = WindowManager.getWindow(GAME_STATE.activeWindow);
        if (!windowData) return;
        
        // Emit refresh event for the current app
        EventBus.emit('refreshApp', GAME_STATE.activeWindow);
    }
    
    loadGameState() {
        const savedState = Utils.loadFromStorage('gameState');
        if (savedState) {
            GAME_STATE.userId = savedState.userId;
            GAME_STATE.caseId = savedState.caseId;
            GAME_STATE.assistantId = savedState.assistantId;
            GAME_STATE.currentCase = savedState.currentCase;
            GAME_STATE.assistant = savedState.assistant;
            GAME_STATE.isGameStarted = true;
            
            console.log('Game state loaded from storage');
            EventBus.emit('gameStateLoaded', savedState);
        }
    }
    
    saveGameState() {
        if (GAME_STATE.isGameStarted) {
            Utils.saveToStorage('gameState', {
                userId: GAME_STATE.userId,
                caseId: GAME_STATE.caseId,
                assistantId: GAME_STATE.assistantId,
                currentCase: GAME_STATE.currentCase,
                assistant: GAME_STATE.assistant
            });
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DigitalDetectiveApp();
});

// Auto-save game state periodically
setInterval(() => {
    if (window.app) {
        window.app.saveGameState();
    }
}, CONFIG.GAME.AUTO_SAVE_INTERVAL);

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.saveGameState();
    }
    AutoRefresh.stopAll();
});

