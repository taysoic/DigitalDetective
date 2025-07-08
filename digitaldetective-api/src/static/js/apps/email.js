// Digital Detective - Email Application
const EmailApp = {
    currentEmails: [],
    selectedEmail: null,
    isComposing: false,
    
    open() {
        const content = this.createEmailInterface();
        
        WindowManager.createWindow('email', 'Sistema de E-mails - Outlook 2000', content, {
            width: 800,
            height: 600,
            x: 50,
            y: 50
        });
        
        this.loadEmails();
        this.setupEventListeners();
    },
    
    createEmailInterface() {
        return `
            <div class="email-client">
                <div class="email-toolbar">
                    <button class="toolbar-button" id="compose-email" title="Novo E-mail">
                        📝
                    </button>
                    <button class="toolbar-button" id="reply-email" title="Responder" disabled>
                        ↩️
                    </button>
                    <button class="toolbar-button" id="refresh-emails" title="Atualizar">
                        🔄
                    </button>
                    <div class="toolbar-separator"></div>
                    <button class="toolbar-button" id="delete-email" title="Excluir" disabled>
                        🗑️
                    </button>
                </div>
                
                <div class="email-layout">
                    <div class="email-list scrollable" id="email-list">
                        <div style="padding: 20px; text-align: center; color: #666;">
                            Carregando e-mails...
                        </div>
                    </div>
                    
                    <div class="email-content scrollable" id="email-content">
                        <div style="padding: 20px; text-align: center; color: #666;">
                            Selecione um e-mail para visualizar
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .email-client {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .email-toolbar {
                    background: var(--color-background);
                    border-bottom: 1px solid var(--color-scroll);
                    padding: 4px;
                    display: flex;
                    gap: 2px;
                    align-items: center;
                }
                
                .email-layout {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                }
                
                .email-list {
                    width: 300px;
                    border-right: 1px solid var(--color-scroll);
                    background: white;
                }
                
                .email-content {
                    flex: 1;
                    background: white;
                    padding: 8px;
                }
                
                .email-item {
                    padding: 8px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    font-size: 11px;
                }
                
                .email-item:hover {
                    background: #e0e0e0;
                }
                
                .email-item.selected {
                    background: var(--color-accents);
                    color: white;
                }
                
                .email-item.unread {
                    font-weight: bold;
                }
                
                .email-from {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .email-subject {
                    margin-bottom: 2px;
                }
                
                .email-time {
                    font-size: 9px;
                    color: #666;
                }
                
                .email-header {
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                
                .email-body {
                    line-height: 1.4;
                    white-space: pre-wrap;
                }
                
                .compose-form {
                    padding: 8px;
                }
                
                .compose-form input,
                .compose-form textarea {
                    width: 100%;
                    margin-bottom: 8px;
                    padding: 4px;
                    border: 1px solid #ccc;
                    font-family: inherit;
                    font-size: 11px;
                }
                
                .compose-form textarea {
                    height: 200px;
                    resize: vertical;
                }
                
                .compose-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
            </style>
        `;
    },
    
    setupEventListeners() {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const windowElement = window.element;
        
        // Compose email
        windowElement.querySelector('#compose-email').addEventListener('click', () => {
            this.showComposeForm();
        });
        
        // Reply email
        windowElement.querySelector('#reply-email').addEventListener('click', () => {
            if (this.selectedEmail) {
                this.showReplyForm(this.selectedEmail);
            }
        });
        
        // Refresh emails
        windowElement.querySelector('#refresh-emails').addEventListener('click', () => {
            this.loadEmails();
        });
        
        // Delete email
        windowElement.querySelector('#delete-email').addEventListener('click', () => {
            if (this.selectedEmail) {
                this.deleteEmail(this.selectedEmail);
            }
        });
        
        // Listen for email updates
        EventBus.on('emailsUpdated', (emails) => {
            this.currentEmails = emails;
            this.renderEmailList();
        });
    },
    
    async loadEmails() {
        if (!GAME_STATE.userId) {
            Utils.showNotification('Jogo não iniciado', 'error');
            return;
        }
        
        try {
            const response = await API.email.getEmails(GAME_STATE.userId);
            if (response.success) {
                this.currentEmails = response.emails;
                this.renderEmailList();
            }
        } catch (error) {
            console.error('Error loading emails:', error);
            Utils.showNotification('Erro ao carregar e-mails', 'error');
        }
    },
    
    renderEmailList() {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const emailList = window.element.querySelector('#email-list');
        
        if (this.currentEmails.length === 0) {
            emailList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Nenhum e-mail encontrado</div>';
            return;
        }
        
        const emailsHtml = this.currentEmails.map(email => `
            <div class="email-item ${!email.read ? 'unread' : ''}" data-email-id="${email.id}">
                <div class="email-from">${Utils.escapeHtml(email.from)}</div>
                <div class="email-subject">${Utils.escapeHtml(email.subject)}</div>
                <div class="email-time">${new Date(email.timestamp).toLocaleString('pt-BR')}</div>
            </div>
        `).join('');
        
        emailList.innerHTML = emailsHtml;
        
        // Add click listeners
        emailList.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', () => {
                const emailId = parseInt(item.dataset.emailId);
                const email = this.currentEmails.find(e => e.id === emailId);
                if (email) {
                    this.selectEmail(email);
                }
            });
        });
    },
    
    selectEmail(email) {
        this.selectedEmail = email;
        
        // Mark as read
        email.read = true;
        
        // Update UI
        this.renderEmailList();
        this.renderEmailContent(email);
        
        // Enable reply and delete buttons
        const window = WindowManager.getWindow('email');
        if (window) {
            window.element.querySelector('#reply-email').disabled = false;
            window.element.querySelector('#delete-email').disabled = false;
        }
        
        // Highlight selected email
        const emailList = window.element.querySelector('#email-list');
        emailList.querySelectorAll('.email-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.emailId) === email.id) {
                item.classList.add('selected');
            }
        });
    },
    
    renderEmailContent(email) {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const emailContent = window.element.querySelector('#email-content');
        
        emailContent.innerHTML = `
            <div class="email-header">
                <div><strong>De:</strong> ${Utils.escapeHtml(email.from)}</div>
                ${email.to ? `<div><strong>Para:</strong> ${Utils.escapeHtml(email.to)}</div>` : ''}
                <div><strong>Assunto:</strong> ${Utils.escapeHtml(email.subject)}</div>
                <div><strong>Data:</strong> ${new Date(email.timestamp).toLocaleString('pt-BR')}</div>
            </div>
            <div class="email-body">${Utils.escapeHtml(email.content)}</div>
        `;
    },
    
    showComposeForm() {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const emailContent = window.element.querySelector('#email-content');
        
        emailContent.innerHTML = `
            <div class="compose-form">
                <h3>Novo E-mail</h3>
                <input type="text" id="compose-to" placeholder="Para:" />
                <input type="text" id="compose-subject" placeholder="Assunto:" />
                <textarea id="compose-content" placeholder="Digite sua mensagem..."></textarea>
                <div class="compose-buttons">
                    <button class="btn btn-primary" id="send-email">Enviar</button>
                    <button class="btn btn-secondary" id="cancel-compose">Cancelar</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        emailContent.querySelector('#send-email').addEventListener('click', () => {
            this.sendEmail();
        });
        
        emailContent.querySelector('#cancel-compose').addEventListener('click', () => {
            this.cancelCompose();
        });
        
        this.isComposing = true;
    },
    
    showReplyForm(originalEmail) {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const emailContent = window.element.querySelector('#email-content');
        
        const replySubject = originalEmail.subject.startsWith('Re: ') ? 
            originalEmail.subject : `Re: ${originalEmail.subject}`;
        
        emailContent.innerHTML = `
            <div class="compose-form">
                <h3>Responder E-mail</h3>
                <input type="text" id="compose-to" value="${Utils.escapeHtml(originalEmail.from)}" readonly />
                <input type="text" id="compose-subject" value="${Utils.escapeHtml(replySubject)}" />
                <textarea id="compose-content" placeholder="Digite sua resposta...">

--- Mensagem Original ---
De: ${originalEmail.from}
Assunto: ${originalEmail.subject}
Data: ${new Date(originalEmail.timestamp).toLocaleString('pt-BR')}

${originalEmail.content}</textarea>
                <div class="compose-buttons">
                    <button class="btn btn-primary" id="send-email">Enviar</button>
                    <button class="btn btn-secondary" id="cancel-compose">Cancelar</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        emailContent.querySelector('#send-email').addEventListener('click', () => {
            this.sendEmail();
        });
        
        emailContent.querySelector('#cancel-compose').addEventListener('click', () => {
            this.cancelCompose();
        });
        
        this.isComposing = true;
    },
    
    async sendEmail() {
        const window = WindowManager.getWindow('email');
        if (!window) return;
        
        const to = window.element.querySelector('#compose-to').value;
        const subject = window.element.querySelector('#compose-subject').value;
        const content = window.element.querySelector('#compose-content').value;
        
        if (!to || !subject || !content) {
            Utils.showNotification('Preencha todos os campos', 'error');
            return;
        }
        
        try {
            const response = await API.email.send(GAME_STATE.userId, to, subject, content);
            if (response.success) {
                Utils.showNotification('E-mail enviado com sucesso!', 'success');
                this.cancelCompose();
                this.loadEmails(); // Refresh email list
            }
        } catch (error) {
            console.error('Error sending email:', error);
            Utils.showNotification('Erro ao enviar e-mail', 'error');
        }
    },
    
    cancelCompose() {
        this.isComposing = false;
        
        if (this.selectedEmail) {
            this.renderEmailContent(this.selectedEmail);
        } else {
            const window = WindowManager.getWindow('email');
            if (window) {
                const emailContent = window.element.querySelector('#email-content');
                emailContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Selecione um e-mail para visualizar</div>';
            }
        }
    },
    
    deleteEmail(email) {
        // Remove from current emails array
        this.currentEmails = this.currentEmails.filter(e => e.id !== email.id);
        
        // Clear selection if deleted email was selected
        if (this.selectedEmail && this.selectedEmail.id === email.id) {
            this.selectedEmail = null;
            const window = WindowManager.getWindow('email');
            if (window) {
                window.element.querySelector('#reply-email').disabled = true;
                window.element.querySelector('#delete-email').disabled = true;
                const emailContent = window.element.querySelector('#email-content');
                emailContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Selecione um e-mail para visualizar</div>';
            }
        }
        
        // Re-render email list
        this.renderEmailList();
        
        Utils.showNotification('E-mail excluído', 'success');
    }
};

