// Digital Detective - Chat Application
const ChatApp = {
    chatHistory: [],
    isTyping: false,
    
    open() {
        const content = this.createChatInterface();
        
        WindowManager.createWindow('chat', 'Chat com Assistente', content, {
            width: 500,
            height: 600,
            x: 100,
            y: 100
        });
        
        this.loadChatHistory();
        this.setupEventListeners();
    },
    
    createChatInterface() {
        const assistantName = GAME_STATE.assistant ? GAME_STATE.assistant.name : 'Assistente';
        
        return `
            <div class="chat-client">
                <div class="chat-header">
                    <div class="assistant-info">
                        <strong>${assistantName}</strong>
                        <div class="status-indicator online"></div>
                    </div>
                </div>
                
                <div class="chat-messages scrollable" id="chat-messages">
                    <div class="system-message">
                        Chat iniciado com ${assistantName}
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <div class="typing-indicator" id="typing-indicator" style="display: none;">
                        ${assistantName} está digitando...
                    </div>
                    <div class="chat-input-container">
                        <input type="text" id="chat-input" placeholder="Digite sua mensagem..." maxlength="500" />
                        <button id="send-message" class="btn btn-primary">Enviar</button>
                    </div>
                </div>
            </div>
            
            <style>
                .chat-client {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .chat-header {
                    background: var(--color-background);
                    border-bottom: 1px solid var(--color-scroll);
                    padding: 8px;
                }
                
                .assistant-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                }
                
                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #00ff00;
                }
                
                .chat-messages {
                    flex: 1;
                    background: white;
                    padding: 8px;
                    overflow-y: auto;
                }
                
                .message {
                    margin-bottom: 12px;
                    max-width: 80%;
                }
                
                .message.user {
                    margin-left: auto;
                    text-align: right;
                }
                
                .message-bubble {
                    display: inline-block;
                    padding: 8px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    line-height: 1.4;
                    word-wrap: break-word;
                }
                
                .message.user .message-bubble {
                    background: var(--color-accents);
                    color: white;
                }
                
                .message.assistant .message-bubble {
                    background: #f0f0f0;
                    color: black;
                }
                
                .message-time {
                    font-size: 9px;
                    color: #666;
                    margin-top: 2px;
                }
                
                .system-message {
                    text-align: center;
                    color: #666;
                    font-size: 10px;
                    font-style: italic;
                    margin-bottom: 12px;
                }
                
                .chat-input-area {
                    border-top: 1px solid var(--color-scroll);
                    background: var(--color-background);
                }
                
                .typing-indicator {
                    padding: 4px 8px;
                    font-size: 10px;
                    color: #666;
                    font-style: italic;
                }
                
                .chat-input-container {
                    display: flex;
                    padding: 8px;
                    gap: 8px;
                }
                
                #chat-input {
                    flex: 1;
                    padding: 6px;
                    border: 1px solid #ccc;
                    font-size: 11px;
                    font-family: inherit;
                }
                
                #send-message {
                    padding: 6px 12px;
                    font-size: 11px;
                }
                
                #send-message:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            </style>
        `;
    },
    
    setupEventListeners() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const windowElement = window.element;
        const chatInput = windowElement.querySelector('#chat-input');
        const sendButton = windowElement.querySelector('#send-message');
        
        // Send message on button click
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Send message on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Listen for chat message responses
        EventBus.on('chatMessageReceived', (data) => {
            this.addMessage(data.message, 'assistant', data.timestamp);
            this.hideTypingIndicator();
        });
        
        // Focus input when window is focused
        EventBus.on('windowFocused', (windowId) => {
            if (windowId === 'chat') {
                setTimeout(() => chatInput.focus(), 100);
            }
        });
    },
    
    async loadChatHistory() {
        if (!GAME_STATE.userId) return;
        
        try {
            const response = await API.chat.getHistory(GAME_STATE.userId);
            if (response.success) {
                this.chatHistory = response.history;
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    },
    
    renderChatHistory() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const messagesContainer = window.element.querySelector('#chat-messages');
        
        // Clear existing messages except system message
        const systemMessage = messagesContainer.querySelector('.system-message');
        messagesContainer.innerHTML = '';
        if (systemMessage) {
            messagesContainer.appendChild(systemMessage);
        }
        
        // Render chat history
        this.chatHistory.forEach(msg => {
            this.addMessage(msg.message, msg.sender, new Date(msg.timestamp), false);
        });
        
        this.scrollToBottom();
    },
    
    async sendMessage() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const chatInput = window.element.querySelector('#chat-input');
        const sendButton = window.element.querySelector('#send-message');
        const message = chatInput.value.trim();
        
        if (!message || !GAME_STATE.userId || !GAME_STATE.assistantId) {
            return;
        }
        
        // Disable input while sending
        chatInput.disabled = true;
        sendButton.disabled = true;
        
        // Add user message to chat
        this.addMessage(message, 'user', new Date());
        
        // Clear input
        chatInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await API.chat.sendMessage(GAME_STATE.userId, message, GAME_STATE.assistantId);
            // Response will be handled by the event listener
        } catch (error) {
            console.error('Error sending chat message:', error);
            Utils.showNotification('Erro ao enviar mensagem', 'error');
            this.hideTypingIndicator();
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
        }
    },
    
    addMessage(message, sender, timestamp, shouldScroll = true) {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const messagesContainer = window.element.querySelector('#chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const timeString = timestamp instanceof Date ? 
            Utils.formatTime(timestamp) : 
            Utils.formatTime(new Date(timestamp));
        
        messageElement.innerHTML = `
            <div class="message-bubble">${Utils.escapeHtml(message)}</div>
            <div class="message-time">${timeString}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        
        if (shouldScroll) {
            this.scrollToBottom();
        }
        
        // Add to chat history if not already there
        const historyMessage = {
            sender: sender,
            message: message,
            timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp
        };
        
        if (!this.chatHistory.find(m => 
            m.sender === sender && 
            m.message === message && 
            Math.abs(new Date(m.timestamp) - new Date(historyMessage.timestamp)) < 1000
        )) {
            this.chatHistory.push(historyMessage);
        }
    },
    
    showTypingIndicator() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const typingIndicator = window.element.querySelector('#typing-indicator');
        typingIndicator.style.display = 'block';
        this.isTyping = true;
        
        // Simulate typing delay
        setTimeout(() => {
            if (this.isTyping) {
                this.hideTypingIndicator();
            }
        }, CONFIG.GAME.CHAT_TYPING_DELAY * 3);
    },
    
    hideTypingIndicator() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const typingIndicator = window.element.querySelector('#typing-indicator');
        typingIndicator.style.display = 'none';
        this.isTyping = false;
    },
    
    scrollToBottom() {
        const window = WindowManager.getWindow('chat');
        if (!window) return;
        
        const messagesContainer = window.element.querySelector('#chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

