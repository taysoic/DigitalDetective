// Digital Detective - Configuration
const CONFIG = {
    API_BASE_URL: window.location.origin + '/api',
    
    // Game settings
    GAME: {
        AUTO_SAVE_INTERVAL: 30000, // 30 seconds
        EMAIL_CHECK_INTERVAL: 10000, // 10 seconds
        CHAT_TYPING_DELAY: 1000, // 1 second
    },
    
    // Window settings
    WINDOWS: {
        DEFAULT_WIDTH: 600,
        DEFAULT_HEIGHT: 400,
        MIN_WIDTH: 300,
        MIN_HEIGHT: 200,
        TASKBAR_HEIGHT: 40,
    },
    
    // Minesweeper settings
    MINESWEEPER: {
        BEGINNER: { width: 9, height: 9, mines: 10 },
        INTERMEDIATE: { width: 16, height: 16, mines: 40 },
        EXPERT: { width: 30, height: 16, mines: 99 },
    },
    
    // Assistant IDs
    ASSISTANTS: {
        RICO_BELMONT: 1,
        CLARA_MAIA: 2,
        BARBARA_HACKER: 3,
        DONA_LURDES: 4,
        DRA_ICE: 5,
    },
    
    // App icons mapping
    ICONS: {
        email: 'assets/icons/email.png',
        chat: 'assets/icons/chat.png',
        news: 'assets/icons/news.png',
        notes: 'assets/icons/notes.png',
        investigation: 'assets/icons/investigation.png',
        minesweeper: 'assets/icons/minesweeper.png',
        start: 'assets/icons/start.png',
        about: 'assets/icons/about.png',
    },
    
    // Sound effects (placeholder)
    SOUNDS: {
        WINDOW_OPEN: 'assets/sounds/window_open.wav',
        WINDOW_CLOSE: 'assets/sounds/window_close.wav',
        BUTTON_CLICK: 'assets/sounds/button_click.wav',
        EMAIL_RECEIVED: 'assets/sounds/email_received.wav',
        CHAT_MESSAGE: 'assets/sounds/chat_message.wav',
        MINE_EXPLODE: 'assets/sounds/mine_explode.wav',
    },
    
    // Error messages
    MESSAGES: {
        CONNECTION_ERROR: 'Erro de conexão com o servidor. Tente novamente.',
        GAME_NOT_STARTED: 'Você precisa iniciar um novo jogo primeiro.',
        INVALID_INPUT: 'Entrada inválida. Verifique os dados e tente novamente.',
        SAVE_SUCCESS: 'Dados salvos com sucesso!',
        SAVE_ERROR: 'Erro ao salvar dados.',
        LOAD_ERROR: 'Erro ao carregar dados.',
    }
};

// Global game state
const GAME_STATE = {
    userId: null,
    caseId: null,
    assistantId: null,
    isGameStarted: false,
    currentCase: null,
    assistant: null,
    windows: new Map(),
    activeWindow: null,
    windowZIndex: 100,
    notifications: [],
};

// Utility functions
const Utils = {
    // Generate unique ID
    generateId: () => {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Format time
    formatTime: (date) => {
        return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },
    
    // Format date
    formatDate: (date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },
    
    // Escape HTML
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Show notification
    showNotification: (message, type = 'info', duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    },
    
    // Play sound (placeholder)
    playSound: (soundName) => {
        // Sound implementation would go here
        console.log(`Playing sound: ${soundName}`);
    },
    
    // Local storage helpers
    saveToStorage: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },
    
    loadFromStorage: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return null;
        }
    },
    
    removeFromStorage: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    }
};

// Event system
const EventBus = {
    events: {},
    
    on: (event, callback) => {
        if (!EventBus.events[event]) {
            EventBus.events[event] = [];
        }
        EventBus.events[event].push(callback);
    },
    
    off: (event, callback) => {
        if (EventBus.events[event]) {
            EventBus.events[event] = EventBus.events[event].filter(cb => cb !== callback);
        }
    },
    
    emit: (event, data) => {
        if (EventBus.events[event]) {
            EventBus.events[event].forEach(callback => callback(data));
        }
    }
};

