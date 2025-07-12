// Digital Detective - API Module
const API = {
    // Base request function - Versão corrigida
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        // Configuração padrão com headers de autenticação
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GAME_STATE.authToken || ''}`
            },
            credentials: 'include' // Para cookies de sessão
        };
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            
            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Resposta não-JSON:', text.substring(0, 200));
                throw new Error(`O servidor retornou um formato inválido (esperado JSON)`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Erro HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed (${endpoint}):`, error);
            
            // Mostrar mensagem mais amigável para o usuário
            let message = CONFIG.MESSAGES.CONNECTION_ERROR;
            if (error.message.includes('servidor retornou')) {
                message = 'Erro no formato da resposta do servidor';
            } else if (error.message.includes('HTTP')) {
                message = `Erro de comunicação (${error.message})`;
            }
            
            Utils.showNotification(message, 'error');
            throw error;
        }
    },

    
    // Game endpoints
    game: {
        async start(assistantId) {
            return await API.request('/game/start', {
                method: 'POST',
                body: JSON.stringify({ assistant_id: assistantId })
            });
        },
        
        async getStatus(userId) {
            return await API.request(`/game/status/${userId}`);
        },
        
        async solve(userId, suspectId, weaponId = null) {
            return await API.request('/game/solve', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    suspect_id: suspectId,
                    weapon_id: weaponId
                })
            });
        }
    },
    
    // Email endpoints
    email: {
        async send(userId, recipientId, subject, content) {
            return await API.request('/emails/send', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    recipient_id: recipientId,
                    subject: subject,
                    content: content
                })
            });
        },
        
        async getEmails(userId) {
            return await API.request(`/emails/${userId}`);
        },
        
        async reply(userId, originalEmailId, content) {
            return await API.request('/emails/reply', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    original_email_id: originalEmailId,
                    content: content
                })
            });
        }
    },
    
    // Chat endpoints
    chat: {
        async sendMessage(userId, message, assistantId) {
            return await API.request('/chat/message', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    message: message,
                    assistant_id: assistantId
                })
            });
        },
        
        async getHistory(userId) {
            return await API.request(`/chat/history/${userId}`);
        }
    },
    
    // News endpoints
    news: {
        async getNews(caseId) {
            return await API.request(`/news/${caseId}`);
        }
    },
    
    // Notes endpoints
    notes: {
        async save(userId, title, content, noteId = null) {
            return await API.request('/notes/save', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    title: title,
                    content: content,
                    note_id: noteId
                })
            });
        },
        
        async getNotes(userId) {
            return await API.request(`/notes/${userId}`);
        }
    },
    
    // Suspects endpoints
    suspects: {
        async getSuspects(caseId) {
            return await API.request(`/suspects/${caseId}`);
        }
    },
    // Investigation endpoints
    investigation: {
        async getClues(caseId) {
            return await API.request(`/investigation/clues/${caseId}`);
        },
        
        async analyzeClue(userId, clueId) {
            return await API.request('/investigation/analyze', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    clue_id: clueId
                })
            });
        },
        
        async analyzeWeapon(userId, weaponId) {
            return await API.request('/investigation/analyze', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    weapon_id: weaponId
                })
            });
        }
    }
};

// API response handlers
const APIHandlers = {
    // Handle game start response
    handleGameStart: (response) => {
        if (response.success) {
            GAME_STATE.userId = response.user_id;
            GAME_STATE.caseId = response.case_id;
            GAME_STATE.assistantId = response.assistant.assistente_id;
            GAME_STATE.isGameStarted = true;
            GAME_STATE.currentCase = response.case_info;
            GAME_STATE.assistant = response.assistant;
            
            // Save game state
            Utils.saveToStorage('gameState', {
                userId: GAME_STATE.userId,
                caseId: GAME_STATE.caseId,
                assistantId: GAME_STATE.assistantId,
                currentCase: GAME_STATE.currentCase,
                assistant: GAME_STATE.assistant
            });
            
            Utils.showNotification('Jogo iniciado com sucesso!', 'success');
            EventBus.emit('gameStarted', response);
        }
    },
    
    // Handle email response
    handleEmailSent: (response) => {
        if (response.success) {
            Utils.showNotification('E-mail enviado com sucesso!', 'success');
            EventBus.emit('emailSent', response);
        }
    },
    
    // Handle chat message response
    handleChatMessage: (response) => {
        if (response.success) {
            EventBus.emit('chatMessageReceived', {
                message: response.assistant_response,
                sender: 'assistant',
                timestamp: new Date()
            });
        }
    },
    
    // Handle note save response
    handleNoteSaved: (response) => {
        if (response.success) {
            Utils.showNotification('Nota salva com sucesso!', 'success');
            EventBus.emit('noteSaved', response);
        }
    },
    
    // Handle analysis response
    handleAnalysis: (response) => {
        if (response.success) {
            EventBus.emit('analysisComplete', response.analysis);
        }
    },
    
    // Handle case solution response
    handleCaseSolution: (response) => {
        if (response.success) {
            EventBus.emit('caseSolved', response);
            
            // Show result modal
            const resultMessage = response.message;
            
            setTimeout(() => {
                alert(`${resultMessage}\n\nCulpado correto: ${response.correct_culprit_name}\nArma: ${response.correct_weapon_name}`);
            }, 500);
        }
    }
};

// Auto-refresh functions
const AutoRefresh = {
    intervals: {},
    
    start: (name, callback, interval) => {
        AutoRefresh.stop(name);
        AutoRefresh.intervals[name] = setInterval(callback, interval);
    },
    
    stop: (name) => {
        if (AutoRefresh.intervals[name]) {
            clearInterval(AutoRefresh.intervals[name]);
            delete AutoRefresh.intervals[name];
        }
    },
    
    stopAll: () => {
        Object.keys(AutoRefresh.intervals).forEach(name => {
            AutoRefresh.stop(name);
        });
    }
};

// Initialize auto-refresh for emails when game starts
EventBus.on('gameStarted', () => {
    // Auto-refresh emails
    AutoRefresh.start('emails', async () => {
        if (GAME_STATE.userId && GAME_STATE.isGameStarted) {
            try {
                const response = await API.email.getEmails(GAME_STATE.userId);
                if (response.success) {
                    EventBus.emit('emailsUpdated', response.emails);
                }
            } catch (error) {
                console.error('Error auto-refreshing emails:', error);
            }
        }
    }, CONFIG.GAME.EMAIL_CHECK_INTERVAL);
    
    // Auto-refresh news
    AutoRefresh.start('news', async () => {
        if (GAME_STATE.caseId && GAME_STATE.isGameStarted) {
            try {
                const response = await API.news.getNews(GAME_STATE.caseId);
                if (response.success) {
                    EventBus.emit('newsUpdated', response.news);
                }
            } catch (error) {
                console.error('Error auto-refreshing news:', error);
            }
        }
    }, CONFIG.GAME.EMAIL_CHECK_INTERVAL * 2); // Less frequent than emails
});

