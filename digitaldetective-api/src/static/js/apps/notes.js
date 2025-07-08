// Digital Detective - Notes Application
const NotesApp = {
    currentNotes: [],
    selectedNote: null,
    isEditing: false,
    autoSaveTimer: null,
    
    open() {
        const content = this.createNotesInterface();
        
        WindowManager.createWindow('notes', 'Bloco de Notas - Investigação', content, {
            width: 700,
            height: 500,
            x: 150,
            y: 200
        });
        
        this.loadNotes();
        this.setupEventListeners();
    },
    
    createNotesInterface() {
        return `
            <div class="notes-editor">
                <div class="notes-toolbar">
                    <button class="toolbar-button" id="new-note" title="Nova Nota">
                        <img src="assets/icons/new.png" alt="Nova">
                    </button>
                    <button class="toolbar-button" id="save-note" title="Salvar" disabled>
                        <img src="assets/icons/save.png" alt="Salvar">
                    </button>
                    <button class="toolbar-button" id="delete-note" title="Excluir" disabled>
                        <img src="assets/icons/delete.png" alt="Excluir">
                    </button>
                    <div class="toolbar-separator"></div>
                    <button class="toolbar-button" id="search-notes" title="Buscar">
                        <img src="assets/icons/search.png" alt="Buscar">
                    </button>
                    <button class="toolbar-button" id="export-notes" title="Exportar">
                        <img src="assets/icons/export.png" alt="Exportar">
                    </button>
                </div>
                
                <div style="display: flex; height: calc(100% - 40px);">
                    <div class="notes-list scrollable" id="notes-list" style="width: 250px; border-right: 1px solid #ccc;">
                        <div style="padding: 20px; text-align: center; color: #666;">
                            Carregando notas...
                        </div>
                    </div>
                    
                    <div class="note-editor" id="note-editor" style="flex: 1; display: flex; flex-direction: column;">
                        <input type="text" id="note-title-input" class="note-title-input" placeholder="Título da nota..." disabled>
                        <textarea id="note-content-input" class="note-content-input" placeholder="Digite suas anotações aqui..." disabled></textarea>
                        
                        <div class="status-bar">
                            <span id="note-status">Selecione uma nota para editar</span>
                            <span id="note-word-count">0 palavras</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .notes-editor {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: white;
                }
                
                .notes-toolbar {
                    display: flex;
                    padding: 5px;
                    background: #f0f0f0;
                    border-bottom: 1px solid #ccc;
                }
                
                .toolbar-button {
                    width: 30px;
                    height: 30px;
                    margin: 0 2px;
                    background: none;
                    border: 1px solid transparent;
                    border-radius: 3px;
                    cursor: pointer;
                }
                
                .toolbar-button:hover {
                    background: #e0e0e0;
                }
                
                .toolbar-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .toolbar-button img {
                    width: 16px;
                    height: 16px;
                }
                
                .toolbar-separator {
                    width: 1px;
                    background: #ccc;
                    margin: 0 5px;
                }
                
                .notes-list {
                    background: #f8f8f8;
                    overflow-y: auto;
                }
                
                .note-item {
                    padding: 10px;
                    border-bottom: 1px solid #e0e0e0;
                    cursor: pointer;
                }
                
                .note-item:hover {
                    background: #e8e8e8;
                }
                
                .note-item.selected {
                    background: var(--color-accents);
                    color: white;
                }
                
                .note-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                .note-preview {
                    font-size: 11px;
                    color: #666;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .note-editor {
                    padding: 10px;
                }
                
                .note-title-input {
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    font-size: 14px;
                }
                
                .note-content-input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    resize: none;
                    font-family: inherit;
                    font-size: 12px;
                    line-height: 1.5;
                }
                
                .status-bar {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #eee;
                    margin-top: 5px;
                }
                
                .scrollable {
                    overflow-y: auto;
                }
            </style>
        `;
    },
    
    setupEventListeners() {
        const windowElement = document.getElementById('window-notes');
        if (!windowElement) return;
        
        // Toolbar buttons
        windowElement.querySelector('#new-note').addEventListener('click', () => {
            this.createNewNote();
        });
        
        windowElement.querySelector('#save-note').addEventListener('click', () => {
            this.saveCurrentNote();
        });
        
        windowElement.querySelector('#delete-note').addEventListener('click', () => {
            this.deleteCurrentNote();
        });
        
        windowElement.querySelector('#search-notes').addEventListener('click', () => {
            this.showSearchDialog();
        });
        
        windowElement.querySelector('#export-notes').addEventListener('click', () => {
            this.exportNotes();
        });
        
        // Note editing
        const titleInput = windowElement.querySelector('#note-title-input');
        const contentInput = windowElement.querySelector('#note-content-input');
        
        titleInput.addEventListener('input', () => {
            this.onNoteChanged();
        });
        
        contentInput.addEventListener('input', () => {
            this.onNoteChanged();
            this.updateWordCount();
        });
        
        // Auto-save every 30 seconds
        this.startAutoSave();
        
        // Listen for note saved
        EventBus.on('noteSaved', () => {
            this.loadNotes();
        });
        
        // Listen for app refresh
        EventBus.on('refreshApp', (appId) => {
            if (appId === 'notes') {
                this.loadNotes();
            }
        });
        
        // Keyboard shortcuts
        windowElement.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveCurrentNote();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNewNote();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.showSearchDialog();
                        break;
                }
            }
        });
    },
    
    async loadNotes() {
        if (!GAME_STATE.userId) return;
        
        try {
            const response = await API.notes.getNotes(GAME_STATE.userId);
            if (response.success) {
                this.currentNotes = response.notes;
                this.renderNotesList();
                
                // If there's a selected note, keep it selected after refresh
                if (this.selectedNote) {
                    const noteExists = this.currentNotes.some(n => n.note_id === this.selectedNote.note_id);
                    if (noteExists) {
                        this.selectNote(this.selectedNote.note_id);
                    } else {
                        this.selectedNote = null;
                        this.disableEditing();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showErrorMessage();
        }
    },
    
    renderNotesList() {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;
        
        if (this.currentNotes.length === 0) {
            notesList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <h3>📝 Nenhuma nota</h3>
                    <p>Clique em "Nova Nota" para começar</p>
                </div>
            `;
            return;
        }
        
        // Sort notes by update time (most recent first)
        const sortedNotes = [...this.currentNotes].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );
        
        const notesHtml = sortedNotes.map(note => {
            const updateTime = new Date(note.updated_at);
            const timeString = updateTime.toLocaleDateString('pt-BR') + ' ' + 
                              updateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const preview = note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
            
            return `
                <div class="note-item ${this.selectedNote?.note_id === note.note_id ? 'selected' : ''}" 
                     data-note-id="${note.note_id}">
                    <div class="note-title">${Utils.escapeHtml(note.title || 'Nota sem título')}</div>
                    <div class="note-preview">${Utils.escapeHtml(preview)}</div>
                    <div style="font-size: 8px; color: #999; margin-top: 4px;">${timeString}</div>
                </div>
            `;
        }).join('');
        
        notesList.innerHTML = notesHtml;
        
        // Add click listeners
        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectNote(parseInt(item.dataset.noteId));
            });
        });
    },
    
    selectNote(noteId) {
        // Save current note if editing
        if (this.isEditing && this.selectedNote) {
            this.saveCurrentNote();
        }
        
        const note = this.currentNotes.find(n => n.note_id === noteId);
        if (!note) return;
        
        this.selectedNote = note;
        this.isEditing = false;
        
        // Update UI
        this.renderNotesList(); // Refresh to show selection
        this.loadNoteInEditor(note);
        this.enableEditing();
    },
    
    loadNoteInEditor(note) {
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        const statusElement = document.getElementById('note-status');
        
        if (titleInput && contentInput && statusElement) {
            titleInput.value = note.title || '';
            contentInput.value = note.content || '';
            statusElement.textContent = `Editando: ${note.title || 'Nota sem título'}`;
            this.updateWordCount();
        }
    },
    
    enableEditing() {
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        const saveButton = document.getElementById('save-note');
        const deleteButton = document.getElementById('delete-note');
        
        if (titleInput && contentInput && saveButton && deleteButton) {
            titleInput.disabled = false;
            contentInput.disabled = false;
            saveButton.disabled = false;
            deleteButton.disabled = false;
            
            // Focus on content
            contentInput.focus();
        }
    },
    
    disableEditing() {
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        const saveButton = document.getElementById('save-note');
        const deleteButton = document.getElementById('delete-note');
        const statusElement = document.getElementById('note-status');
        
        if (titleInput && contentInput && saveButton && deleteButton && statusElement) {
            titleInput.disabled = true;
            contentInput.disabled = true;
            saveButton.disabled = true;
            deleteButton.disabled = true;
            titleInput.value = '';
            contentInput.value = '';
            statusElement.textContent = 'Selecione uma nota para editar';
        }
    },
    
    createNewNote() {
        // Save current note if editing
        if (this.isEditing && this.selectedNote) {
            this.saveCurrentNote();
        }
        
        const newNote = {
            note_id: null,
            title: '',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.selectedNote = newNote;
        this.isEditing = true;
        
        // Clear selection in list
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Load in editor
        this.loadNoteInEditor(newNote);
        this.enableEditing();
        
        // Focus on title
        const titleInput = document.getElementById('note-title-input');
        if (titleInput) {
            titleInput.focus();
        }
        
        document.getElementById('note-status').textContent = 'Nova nota';
    },
    
    async saveCurrentNote() {
        if (!this.selectedNote || !GAME_STATE.userId) return;
        
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim() || 'Nota sem título';
        const content = contentInput.value.trim();
        
        if (!content) {
            Utils.showNotification('A nota não pode estar vazia', 'error');
            return;
        }
        
        try {
            const response = await API.notes.save(
                GAME_STATE.userId,
                title,
                content,
                this.selectedNote.note_id
            );
            
            if (response.success) {
                this.selectedNote.note_id = response.note_id;
                this.selectedNote.title = title;
                this.selectedNote.content = content;
                this.selectedNote.updated_at = new Date().toISOString();
                
                this.isEditing = false;
                document.getElementById('note-status').textContent = 'Nota salva';
                
                // Refresh notes list
                this.loadNotes();
                
                Utils.showNotification('Nota salva com sucesso!', 'success');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            Utils.showNotification('Erro ao salvar nota', 'error');
        }
    },
    
    async deleteCurrentNote() {
        if (!this.selectedNote || !this.selectedNote.note_id || !GAME_STATE.userId) return;
        
        if (confirm('Tem certeza que deseja excluir esta nota?')) {
            try {
                const response = await API.notes.delete(GAME_STATE.userId, this.selectedNote.note_id);
                
                if (response.success) {
                    // Remove from current list
                    this.currentNotes = this.currentNotes.filter(n => n.note_id !== this.selectedNote.note_id);
                    this.selectedNote = null;
                    this.isEditing = false;
                    
                    this.renderNotesList();
                    this.disableEditing();
                    
                    Utils.showNotification('Nota excluída com sucesso!', 'success');
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                Utils.showNotification('Erro ao excluir nota', 'error');
            }
        }
    },
    
    onNoteChanged() {
        this.isEditing = true;
        document.getElementById('note-status').textContent = 'Modificado (não salvo)';
        
        // Reset auto-save timer
        this.startAutoSave();
    },
    
    updateWordCount() {
        const contentInput = document.getElementById('note-content-input');
        const wordCountElement = document.getElementById('note-word-count');
        
        if (contentInput && wordCountElement) {
            const text = contentInput.value.trim();
            const wordCount = text ? text.split(/\s+/).length : 0;
            const charCount = text.length;
            
            wordCountElement.textContent = `${wordCount} palavras, ${charCount} caracteres`;
        }
    },
    
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (this.isEditing && this.selectedNote) {
                this.saveCurrentNote();
            }
        }, 30000); // 30 seconds
    },
    
    showSearchDialog() {
        const content = `
            <div style="padding: 16px;">
                <h3>Buscar nas Notas</h3>
                <div style="margin: 16px 0;">
                    <input type="text" id="search-input" class="input-field" 
                           placeholder="Digite o termo de busca..." style="width: 100%;">
                </div>
                <div id="search-results" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 8px;">
                    Digite algo para buscar...
                </div>
                <div style="margin-top: 16px; text-align: right;">
                    <button class="btn btn-primary" onclick="WindowManager.closeWindow('search-notes')">Fechar</button>
                </div>
            </div>
        `;
        
        const searchWindow = WindowManager.createWindow('search-notes', 'Buscar Notas', content, {
            width: 400,
            height: 350,
            x: 300,
            y: 250,
            resizable: false
        });
        
        // Setup search functionality
        const searchInput = searchWindow.element.querySelector('#search-input');
        const searchResults = searchWindow.element.querySelector('#search-results');
        
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.innerHTML = 'Digite algo para buscar...';
                return;
            }
            
            const matches = this.currentNotes.filter(note => 
                note.title.toLowerCase().includes(query) || 
                note.content.toLowerCase().includes(query)
            );
            
            if (matches.length === 0) {
                searchResults.innerHTML = 'Nenhuma nota encontrada.';
                return;
            }
            
            const resultsHtml = matches.map(note => `
                <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" 
                     onclick="NotesApp.selectNoteFromSearch(${note.note_id}); WindowManager.closeWindow('search-notes');">
                    <strong>${Utils.escapeHtml(note.title || 'Nota sem título')}</strong><br>
                    <small>${Utils.escapeHtml(note.content.substring(0, 100))}...</small>
                </div>
            `).join('');
            
            searchResults.innerHTML = resultsHtml;
        });
        
        searchInput.focus();
    },
    
    selectNoteFromSearch(noteId) {
        this.selectNote(noteId);
    },
    
    exportNotes() {
        if (this.currentNotes.length === 0) {
            Utils.showNotification('Nenhuma nota para exportar', 'error');
            return;
        }
        
        const exportData = {
            case: 'O Mistério da Mansão Blackwood',
            exported_at: new Date().toISOString(),
            notes: this.currentNotes.map(note => ({
                title: note.title,
                content: note.content,
                created_at: note.created_at,
                updated_at: note.updated_at
            }))
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `notas_investigacao_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        Utils.showNotification('Notas exportadas com sucesso!', 'success');
    },
    
    showErrorMessage() {
        const notesList = document.getElementById('notes-list');
        if (notesList) {
            notesList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff0000;">
                    <h3>❌ Erro ao carregar notas</h3>
                    <button class="btn btn-primary" onclick="NotesApp.loadNotes()">Tentar Novamente</button>
                </div>
            `;
        }
    }
};