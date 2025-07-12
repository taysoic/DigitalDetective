// Digital Detective - Investigation Application
const InvestigationApp = {
    clues: [],
    weapons: [],
    suspects: [],
    selectedClue: null,
    selectedWeapon: null,
    selectedSuspect: null,
    
    open() {
        const content = this.createInvestigationInterface();
        
        WindowManager.createWindow('investigation', 'Central de Investigação', content, {
            width: 900,
            height: 700,
            x: 150,
            y: 50
        });
        
        this.loadInvestigationData();
        this.setupEventListeners();
    },
    
    createInvestigationInterface() {
        return `
            <div class="investigation-client">
                <div class="investigation-toolbar">
                    <button class="toolbar-button" id="refresh-investigation" title="Atualizar">
                        🔄
                    </button>
                    <div class="toolbar-separator"></div>
                    <button class="toolbar-button" id="solve-case" title="Resolver Caso">
                        ⚖️
                    </button>
                </div>
                
                <div class="investigation-tabs">
                    <div class="tab-headers">
                        <div class="tab-header active" data-tab="clues">Pistas</div>
                        <div class="tab-header" data-tab="weapons">Armas</div>
                        <div class="tab-header" data-tab="suspects">Suspeitos</div>
                        <div class="tab-header" data-tab="analysis">Análise</div>
                    </div>
                    
                    <div class="tab-content">
                        <div class="tab-panel active" id="clues-panel">
                            <div class="panel-layout">
                                <div class="item-list scrollable" id="clues-list">
                                    <div class="loading">Carregando pistas...</div>
                                </div>
                                <div class="item-details scrollable" id="clues-details">
                                    <div class="no-selection">Selecione uma pista para analisar</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-panel" id="weapons-panel">
                            <div class="panel-layout">
                                <div class="item-list scrollable" id="weapons-list">
                                    <div class="loading">Carregando armas...</div>
                                </div>
                                <div class="item-details scrollable" id="weapons-details">
                                    <div class="no-selection">Selecione uma arma para analisar</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-panel" id="suspects-panel">
                            <div class="panel-layout">
                                <div class="item-list scrollable" id="suspects-list">
                                    <div class="loading">Carregando suspeitos...</div>
                                </div>
                                <div class="item-details scrollable" id="suspects-details">
                                    <div class="no-selection">Selecione um suspeito para analisar</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-panel" id="analysis-panel">
                            <div class="analysis-content">
                                <h3>Análise do Caso</h3>
                                <div class="case-summary" id="case-summary">
                                    <p>Use as abas acima para investigar pistas, armas e suspeitos.</p>
                                    <p>Quando estiver pronto, clique em "Resolver Caso" para fazer sua acusação.</p>
                                </div>
                                
                                <div class="solution-form" id="solution-form" style="display: none;">
                                    <h4>Quem é o culpado?</h4>
                                    <select id="suspect-select" class="dropdown">
                                        <option value="">Selecione o suspeito...</option>
                                    </select>
                                    
                                    <h4>Qual foi a arma do crime?</h4>
                                    <select id="weapon-select" class="dropdown">
                                        <option value="">Selecione a arma...</option>
                                    </select>
                                    
                                    <div class="solution-buttons">
                                        <button class="btn btn-primary" id="submit-solution">Fazer Acusação</button>
                                        <button class="btn btn-secondary" id="cancel-solution">Cancelar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .investigation-client {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .investigation-toolbar {
                    background: var(--color-background);
                    border-bottom: 1px solid var(--color-scroll);
                    padding: 4px;
                    display: flex;
                    gap: 2px;
                    align-items: center;
                }
                
                .investigation-tabs {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .tab-headers {
                    display: flex;
                    background: var(--color-background);
                    border-bottom: 1px solid var(--color-scroll);
                }
                
                .tab-header {
                    padding: 8px 16px;
                    border-right: 1px solid var(--color-scroll);
                    cursor: pointer;
                    font-size: 11px;
                    background: var(--color-background);
                }
                
                .tab-header.active {
                    background: white;
                    border-bottom: 1px solid white;
                }
                
                .tab-header:hover:not(.active) {
                    background: var(--color-scroll);
                }
                
                .tab-content {
                    flex: 1;
                    background: white;
                }
                
                .tab-panel {
                    display: none;
                    height: 100%;
                }
                
                .tab-panel.active {
                    display: block;
                }
                
                .panel-layout {
                    display: flex;
                    height: 100%;
                }
                
                .item-list {
                    width: 300px;
                    border-right: 1px solid var(--color-scroll);
                    background: #f8f8f8;
                }
                
                .item-details {
                    flex: 1;
                    padding: 16px;
                }
                
                .item {
                    padding: 12px;
                    border-bottom: 1px solid #ddd;
                    cursor: pointer;
                    font-size: 11px;
                }
                
                .item:hover {
                    background: #e0e0e0;
                }
                
                .item.selected {
                    background: var(--color-accents);
                    color: white;
                }
                
                .item-name {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                .item-type {
                    font-size: 10px;
                    color: #666;
                }
                
                .item.selected .item-type {
                    color: #ffcccc;
                }
                
                .loading, .no-selection {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                
                .detail-header {
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                    margin-bottom: 16px;
                }
                
                .detail-content {
                    line-height: 1.5;
                }
                
                .analyze-button {
                    margin-top: 16px;
                }
                
                .analysis-content {
                    padding: 16px;
                }
                
                .case-summary {
                    background: #f8f8f8;
                    padding: 16px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
                
                .solution-form {
                    background: #fff8dc;
                    padding: 16px;
                    border: 2px solid var(--color-accents);
                    border-radius: 4px;
                }
                
                .solution-form h4 {
                    margin: 16px 0 8px 0;
                    color: var(--color-accents);
                }
                
                .solution-form h4:first-child {
                    margin-top: 0;
                }
                
                .solution-buttons {
                    margin-top: 20px;
                    display: flex;
                    gap: 8px;
                }
                
                .dropdown {
                    width: 100%;
                    padding: 6px;
                    font-size: 11px;
                    margin-bottom: 8px;
                }
            </style>
        `;
    },
    
    setupEventListeners() {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const windowElement = invWindow.element;

        // Remove previous listeners by cloning nodes (prevents duplicate listeners)
        windowElement.querySelectorAll('.tab-header').forEach(header => {
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
        });
        const refreshBtn = windowElement.querySelector('#refresh-investigation');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
        }
        const solveBtn = windowElement.querySelector('#solve-case');
        if (solveBtn) {
            const newSolveBtn = solveBtn.cloneNode(true);
            solveBtn.parentNode.replaceChild(newSolveBtn, solveBtn);
        }

        // Tab switching
        windowElement.querySelectorAll('.tab-header').forEach(header => {
            header.addEventListener('click', (event) => {
                const tabName = event.currentTarget.dataset.tab;
                InvestigationApp.switchTab(tabName);
            });
        });

        // Refresh button
        const refreshButton = windowElement.querySelector('#refresh-investigation');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                InvestigationApp.loadInvestigationData();
            });
        }

        // Solve case button
        const solveCaseButton = windowElement.querySelector('#solve-case');
        if (solveCaseButton) {
            solveCaseButton.addEventListener('click', () => {
                InvestigationApp.showSolutionForm();
            });
        }

        // Listen for analysis results (register only once)
        if (!this._analysisListenerRegistered) {
            EventBus.on('analysisComplete', (analysis) => {
                this.showAnalysisResult(analysis);
            });
            this._analysisListenerRegistered = true;
        }
    },
    
async loadInvestigationData() {
    if (!GAME_STATE.caseId) {
        Utils.showNotification('Caso não carregado', 'error');
        return;
    }
    
    try {
        // Load data from API
        await Promise.all([
            this.loadWeaponsFromDB(),
            this.loadCluesFromDB(),
            this.loadSuspectsFromDB()
        ]);
        
        // Render all lists
        this.renderWeaponsList();
        this.renderCluesList();
        this.renderSuspectsList();
        
    } catch (error) {
        console.error('Error loading investigation data:', error);
        Utils.showNotification('Erro ao carregar dados da investigação', 'error');
        this.showErrorState();
    }
},

async loadWeaponsFromDB() {
    try {
        const data = await API.request(`/investigation/weapons/${GAME_STATE.caseId}`);
        this.weapons = data.weapons;
        return true;
        
    } catch (error) {
        console.error('Error loading weapons:', error);
        
        const invWindow = WindowManager.getWindow('investigation');
        if (invWindow) {
            invWindow.element.querySelector('#weapons-list').innerHTML = `
                <div class="error-message">
                    Erro ao carregar armas: ${Utils.escapeHtml(error.message)}<br>
                    <button onclick="InvestigationApp.loadWeaponsFromDB()">Tentar novamente</button>
                </div>
            `;
        }
        
        throw error;
    }
},

async loadCluesFromDB() {
    try {
        const data = await API.request(`/investigation/clues/${GAME_STATE.caseId}`);
        this.clues = data.clues;
        return true;
    } catch (error) {
        console.error('Error loading clues:', error);
        
        const invWindow = WindowManager.getWindow('investigation');
        if (invWindow) {
            invWindow.element.querySelector('#clues-list').innerHTML = `
                <div class="error-message">
                    Erro ao carregar pistas<br>
                    <button onclick="InvestigationApp.loadCluesFromDB()">Tentar novamente</button>
                </div>
            `;
        }
        
        throw error;
    }
},

async loadSuspectsFromDB() {
    try {
        const data = await API.request(`/suspects/${GAME_STATE.caseId}`);
        this.suspects = data.suspects;
        return true;
    } catch (error) {
        console.error('Error loading suspects:', error);
        
        const invWindow = WindowManager.getWindow('investigation');
        if (invWindow) {
            invWindow.element.querySelector('#suspects-list').innerHTML = `
                <div class="error-message">
                    Erro ao carregar suspeitos<br>
                    <button onclick="InvestigationApp.loadSuspectsFromDB()">Tentar novamente</button>
                </div>
            `;
        }
        
        throw error;
    }
},
    
    showErrorState() {
        const window = WindowManager.getWindow('investigation');
        if (!window) return;
        
        const cluesList = window.element.querySelector('#clues-list');
        const weaponsList = window.element.querySelector('#weapons-list');
        const suspectsList = window.element.querySelector('#suspects-list');
        
        const errorMessage = '<div class="error-message">Erro ao carregar dados. Clique em Atualizar para tentar novamente.</div>';
        
        if (cluesList) cluesList.innerHTML = errorMessage;
        if (weaponsList) weaponsList.innerHTML = errorMessage;
        if (suspectsList) suspectsList.innerHTML = errorMessage;
    },
    
    switchTab(tabName) {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        // Update tab headers
        invWindow.element.querySelectorAll('.tab-header').forEach(header => {
            header.classList.remove('active');
            if (header.dataset.tab === tabName) {
                header.classList.add('active');
            }
        });
        
        // Update tab panels
        invWindow.element.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        invWindow.element.querySelector(`#${tabName}-panel`).classList.add('active');
    },
    
    renderCluesList() {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const cluesList = invWindow.element.querySelector('#clues-list');
        
        if (this.clues.length === 0) {
            cluesList.innerHTML = '<div class="loading">Nenhuma pista encontrada</div>';
            return;
        }
        
        const cluesHtml = this.clues.map(clue => `
            <div class="item" data-clue-id="${clue.clue_id}">
                <div class="item-name">${Utils.escapeHtml(clue.name)}</div>
                <div class="item-type">${Utils.escapeHtml(clue.type)} - ${Utils.escapeHtml(clue.importance)}</div>
            </div>
        `).join('');
        
        cluesList.innerHTML = cluesHtml;
        
        // Add click listeners
        cluesList.querySelectorAll('.item').forEach(item => {
            item.addEventListener('click', () => {
                const clueId = parseInt(item.dataset.clueId);
                const clue = this.clues.find(c => c.clue_id === clueId);
                if (clue) {
                    this.selectClue(clue);
                }
            });
        });
    },
    
    renderWeaponsList() {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const weaponsList = invWindow.element.querySelector('#weapons-list');
        
        if (this.weapons.length === 0) {
            weaponsList.innerHTML = '<div class="loading">Nenhuma arma encontrada</div>';
            return;
        }
        
        const weaponsHtml = this.weapons.map(weapon => `
            <div class="item" data-weapon-id="${weapon.weapon_id}">
                <div class="item-name">${Utils.escapeHtml(weapon.name)}</div>
                <div class="item-type">${Utils.escapeHtml(weapon.type)}</div>
            </div>
        `).join('');
        
        weaponsList.innerHTML = weaponsHtml;
        
        // Add click listeners
        weaponsList.querySelectorAll('.item').forEach(item => {
            item.addEventListener('click', () => {
                const weaponId = parseInt(item.dataset.weaponId);
                const weapon = this.weapons.find(w => w.weapon_id === weaponId);
                if (weapon) {
                    this.selectWeapon(weapon);
                }
            });
        });
    },
    
    renderSuspectsList() {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const suspectsList = invWindow.element.querySelector('#suspects-list');
        
        if (this.suspects.length === 0) {
            suspectsList.innerHTML = '<div class="loading">Nenhum suspeito encontrado</div>';
            return;
        }
        
        const suspectsHtml = this.suspects.map(suspect => `
            <div class="item" data-suspect-id="${suspect.suspect_id}">
                <div class="item-name">${Utils.escapeHtml(suspect.name)}</div>
                <div class="item-type">${Utils.escapeHtml(suspect.relationship_to_victim || 'Relacionamento desconhecido')}</div>
            </div>
        `).join('');
        
        suspectsList.innerHTML = suspectsHtml;
        
        // Add click listeners
        suspectsList.querySelectorAll('.item').forEach(item => {
            item.addEventListener('click', () => {
                const suspectId = parseInt(item.dataset.suspectId);
                const suspect = this.suspects.find(s => s.suspect_id === suspectId);
                if (suspect) {
                    this.selectSuspect(suspect);
                }
            });
        });
    },
    
    selectClue(clue) {
        this.selectedClue = clue;
        this.updateSelection('clues', clue.clue_id);
        this.showClueDetails(clue);
    },
    
    selectWeapon(weapon) {
        this.selectedWeapon = weapon;
        this.updateSelection('weapons', weapon.weapon_id);
        this.showWeaponDetails(weapon);
    },
    
    selectSuspect(suspect) {
        this.selectedSuspect = suspect;
        this.updateSelection('suspects', suspect.suspect_id);
        this.showSuspectDetails(suspect);
    },
    
    updateSelection(type, id) {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const list = invWindow.element.querySelector(`#${type}-list`);
        list.querySelectorAll('.item').forEach(item => {
            item.classList.remove('selected');
            const itemId = parseInt(item.dataset[`${type.slice(0, -1)}Id`]);
            if (itemId === id) {
                item.classList.add('selected');
            }
        });
    },
    
    showClueDetails(clue) {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const details = invWindow.element.querySelector('#clues-details');
        
        details.innerHTML = `
            <div class="detail-header">
                <h3>${Utils.escapeHtml(clue.name)}</h3>
                <div><strong>Tipo:</strong> ${Utils.escapeHtml(clue.type)}</div>
                <div><strong>Importância:</strong> ${Utils.escapeHtml(clue.importance)}</div>
                ${clue.is_red_herring ? '<div class="warning-tag">⚠️ PISTA FALSA</div>' : ''}
            </div>
            <div class="detail-content">
                <p><strong>Descrição:</strong> ${Utils.escapeHtml(clue.description)}</p>
                <p><strong>Local encontrado:</strong> ${Utils.escapeHtml(clue.found_message)}</p>
                <button class="btn btn-primary analyze-button" id="analyze-clue-btn">
                    Analisar Pista
                </button>
            </div>
        `;

        // Attach event listener after rendering
        const analyzeBtn = details.querySelector('#analyze-clue-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.analyzeClue(clue.clue_id);
            });
        }
    },
    
    showWeaponDetails(weapon) {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const details = invWindow.element.querySelector('#weapons-details');
        
        details.innerHTML = `
            <div class="detail-header">
                <h3>${Utils.escapeHtml(weapon.name)}</h3>
                <div><strong>Tipo:</strong> ${Utils.escapeHtml(weapon.type)}</div>
                ${weapon.found_location ? `<div><strong>Local encontrada:</strong> ${Utils.escapeHtml(weapon.found_location)}</div>` : ''}
            </div>
            <div class="detail-content">
                <p><strong>Descrição:</strong> ${Utils.escapeHtml(weapon.description)}</p>
                <p><strong>Análise:</strong> ${Utils.escapeHtml(weapon.inspection_message)}</p>
                <button class="btn btn-primary analyze-button" id="analyze-weapon-btn">
                    Analisar Arma
                </button>
            </div>
        `;

        // Attach event listener after rendering
        const analyzeBtn = details.querySelector('#analyze-weapon-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.analyzeWeapon(weapon.weapon_id);
            });
        }
    },
    
    showSuspectDetails(suspect) {
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const details = invWindow.element.querySelector('#suspects-details');
        
        details.innerHTML = `
            <div class="detail-header">
                <h3>${Utils.escapeHtml(suspect.name)}</h3>
                <div><strong>Relacionamento:</strong> ${Utils.escapeHtml(suspect.relationship_to_victim || 'Desconhecido')}</div>
            </div>
            <div class="detail-content">
                <p><strong>Descrição:</strong> ${Utils.escapeHtml(suspect.description)}</p>
                ${suspect.motive ? `<p><strong>Motivo:</strong> ${Utils.escapeHtml(suspect.motive)}</p>` : ''}
                ${suspect.alibi ? `<p><strong>Álibi:</strong> ${Utils.escapeHtml(suspect.alibi)}</p>` : ''}
                ${suspect.image ? `<img src="assets/images/suspects/${suspect.image}" alt="${suspect.name}" class="suspect-image">` : ''}
            </div>
        `;
    },
    
    async analyzeClue(clueId) {
        if (!GAME_STATE.userId) return;
        
        try {
            const response = await fetch('/api/analyze-clue', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GAME_STATE.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: GAME_STATE.userId,
                    clue_id: clueId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to analyze clue');
            }
            
            const analysis = await response.json();
            EventBus.emit('analysisComplete', analysis);
            
        } catch (error) {
            console.error('Error analyzing clue:', error);
            Utils.showNotification('Erro ao analisar pista', 'error');
        }
    },
    
    async analyzeWeapon(weaponId) {
        if (!GAME_STATE.userId) return;
        
        try {
            const response = await fetch('/api/analyze-weapon', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GAME_STATE.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: GAME_STATE.userId,
                    weapon_id: weaponId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to analyze weapon');
            }
            
            const analysis = await response.json();
            EventBus.emit('analysisComplete', analysis);
            
        } catch (error) {
            console.error('Error analyzing weapon:', error);
            Utils.showNotification('Erro ao analisar arma', 'error');
        }
    },
    
    showAnalysisResult(analysis) {
        Utils.showNotification('Análise concluída!', 'success');
        
        // Update the details view with the analysis result
        if (analysis.clue_id) {
            const clue = this.clues.find(c => c.clue_id === analysis.clue_id);
            if (clue) {
                this.selectClue(clue);
            }
        } else if (analysis.weapon_id) {
            const weapon = this.weapons.find(w => w.weapon_id === analysis.weapon_id);
            if (weapon) {
                this.selectWeapon(weapon);
            }
        }
    },
    
    showSolutionForm() {
        this.switchTab('analysis');
        
        const invWindow = WindowManager.getWindow('investigation');
        if (!invWindow) return;
        
        const solutionForm = invWindow.element.querySelector('#solution-form');
        const suspectSelect = invWindow.element.querySelector('#suspect-select');
        const weaponSelect = invWindow.element.querySelector('#weapon-select');
        
        // Populate suspect dropdown
        suspectSelect.innerHTML = '<option value="">Selecione o suspeito...</option>';
        this.suspects.forEach(suspect => {
            const option = document.createElement('option');
            option.value = suspect.suspect_id;
            option.textContent = suspect.name;
            suspectSelect.appendChild(option);
        });
        
        // Populate weapon dropdown
        weaponSelect.innerHTML = '<option value="">Selecione a arma...</option>';
        this.weapons.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.weapon_id;
            option.textContent = weapon.name;
            weaponSelect.appendChild(option);
        });
        
        // Show form
        solutionForm.style.display = 'block';
        
        // Add event listeners
        invWindow.element.querySelector('#submit-solution').addEventListener('click', () => {    
            this.submitSolution();
        });

        // Cancel button event listener
        invWindow.element.querySelector('#cancel-solution').addEventListener('click', () => {
            solutionForm.style.display = 'none';
        });
    },

    async submitSolution() {
        const window = WindowManager.getWindow('investigation');
        if (!window) return;

        const suspectId = parseInt(window.element.querySelector('#suspect-select').value);
        const weaponId = parseInt(window.element.querySelector('#weapon-select').value);

        if (!suspectId || !weaponId) {
            Utils.showNotification('Selecione um suspeito e uma arma', 'error');
            return;
        }

        try {
            const response = await fetch('/api/submit-solution', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GAME_STATE.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: GAME_STATE.userId,
                    case_id: GAME_STATE.caseId,
                    suspect_id: suspectId,
                    weapon_id: weaponId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit solution');
            }
            
            const result = await response.json();
            
            Utils.showNotification(result.message, result.is_correct ? 'success' : 'error');
            
            if (result.is_correct) {
                // Update game state if needed
                GAME_STATE.caseCompleted = true;
            }
            
            // Hide solution form
            window.element.querySelector('#solution-form').style.display = 'none';
            
        } catch (error) {
            console.error('Error submitting solution:', error);
            Utils.showNotification('Erro ao submeter solução', 'error');
        }
    }
};