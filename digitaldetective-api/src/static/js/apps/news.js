// Digital Detective - News Application
const NewsApp = {
    currentNews: [],
    
    open() {
        const content = this.createNewsInterface();
        
        WindowManager.createWindow('news', 'Jornal Local - Notícias', content, {
            width: 600,
            height: 500,
            x: 400,
            y: 150
        });
        
        this.loadNews();
        this.setupEventListeners();
    },
    
    createNewsInterface() {
        return `
            <div class="news-reader">
                <div class="news-header">
                    <h2>📰 JORNAL LOCAL - EDIÇÃO ESPECIAL</h2>
                    <div style="font-size: 10px; color: #666;">
                        Última atualização: <span id="news-last-update">Carregando...</span>
                    </div>
                </div>
                
                <div class="toolbar" style="border-bottom: 1px solid #ccc;">
                    <button class="toolbar-button" id="refresh-news" title="Atualizar Notícias">
                        🔄
                    </button>
                    <div class="toolbar-separator"></div>
                    <button class="toolbar-button" id="print-news" title="Imprimir">
                        🖨️
                    </button>
                    <button class="toolbar-button" id="save-news" title="Salvar">
                        💾
                    </button>
                </div>
                
                <div class="news-layout">
                    <div class="news-sidebar" id="news-sidebar">
                        <div class="sidebar-header">📈 NOTÍCIAS EM ALTA</div>
                        <div class="trending-news" id="trending-news">
                            <div style="padding: 10px; text-align: center; color: #666; font-size: 10px;">
                                Carregando...
                            </div>
                        </div>
                    </div>
                    
                    <div class="news-main" id="news-main">
                        <div class="main-article" id="main-article">
                            <div style="padding: 20px; text-align: center; color: #666;">
                                <div class="loading-spinner"></div>
                                Selecione uma notícia para ler
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .news-reader {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .news-header {
                    background: var(--color-background);
                    padding: 8px;
                    border-bottom: 1px solid var(--color-scroll);
                    text-align: center;
                }
                
                .news-header h2 {
                    margin: 0;
                    font-size: 14px;
                    color: #000080;
                }
                
                .news-layout {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                }
                
                .news-sidebar {
                    width: 200px;
                    background: #f8f8f8;
                    border-right: 1px solid var(--color-scroll);
                    overflow-y: auto;
                }
                
                .sidebar-header {
                    background: #e0e0e0;
                    padding: 6px 8px;
                    font-size: 10px;
                    font-weight: bold;
                    border-bottom: 1px solid #ccc;
                }
                
                .news-main {
                    flex: 1;
                    background: white;
                    overflow-y: auto;
                }
                
                .trending-item {
                    padding: 8px;
                    border-bottom: 1px solid #e0e0e0;
                    cursor: pointer;
                    font-size: 10px;
                    line-height: 1.3;
                }
                
                .trending-item:hover {
                    background: #e8e8e8;
                }
                
                .trending-item.selected {
                    background: var(--color-accents);
                    color: white;
                }
                
                .trending-title {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .trending-summary {
                    color: #666;
                    font-size: 9px;
                }
                
                .main-article {
                    padding: 16px;
                }
                
                .article-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #000080;
                }
                
                .article-meta {
                    font-size: 10px;
                    color: #666;
                    margin-bottom: 12px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                
                .article-content {
                    font-size: 11px;
                    line-height: 1.5;
                    text-align: justify;
                }
                
                .loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 8px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    },
    
    setupEventListeners() {
        const windowElement = document.getElementById('window-news');
        if (!windowElement) return;
        
        // Refresh news button
        windowElement.querySelector('#refresh-news').addEventListener('click', () => {
            this.loadNews();
        });
        
        // Print news button
        windowElement.querySelector('#print-news').addEventListener('click', () => {
            this.printNews();
        });
        
        // Save news button
        windowElement.querySelector('#save-news').addEventListener('click', () => {
            this.saveNews();
        });
        
        // Listen for news updates
        EventBus.on('newsUpdated', (news) => {
            this.currentNews = news;
            this.renderNews();
        });
        
        // Listen for app refresh
        EventBus.on('refreshApp', (appId) => {
            if (appId === 'news') {
                this.loadNews();
            }
        });
    },
    
    async loadNews() {
        if (!GAME_STATE.caseId) return;
        
        try {
            const response = await API.news.getNews(GAME_STATE.caseId);
            if (response.success) {
                // Normalize news data structure
                this.currentNews = response.news.map(news => ({
                    news_id: news.news_id || news.id,
                    case_id: news.case_id,
                    headline: news.headline,
                    content: news.content,
                    published_time: news.published_time,
                    priority: news.priority || 'medium'
                }));
                
                this.renderNews();
                this.updateLastUpdateTime();
            }
        } catch (error) {
            console.error('Error loading news:', error);
            this.showErrorMessage();
        }
    },
    
    renderNews() {
        const newsList = document.getElementById('trending-news');
        if (!newsList) return;
        
        if (this.currentNews.length === 0) {
            newsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <h3>📰 Nenhuma notícia disponível</h3>
                    <p>Aguarde por atualizações sobre o caso...</p>
                </div>
            `;
            return;
        }
        
        // Sort news by priority and time
        const sortedNews = [...this.currentNews].sort((a, b) => {
            const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
            const aPriority = priorityOrder[a.priority] || 2;
            const bPriority = priorityOrder[b.priority] || 2;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            return new Date(b.published_time) - new Date(a.published_time);
        });
        
        const newsHtml = sortedNews.map(news => {
            const publishTime = new Date(news.published_time);
            const timeString = publishTime.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const priorityClass = news.priority || 'medium';
            const priorityText = {
                'urgent': 'URGENTE',
                'high': 'IMPORTANTE',
                'medium': 'NORMAL',
                'low': 'INFORMATIVO'
            }[priorityClass] || 'NORMAL';
            
            return `
                <div class="trending-item" data-news-id="${news.news_id}">
                    <div class="trending-title">${Utils.escapeHtml(news.headline)}</div>
                    <div class="trending-summary">${Utils.escapeHtml(news.content.substring(0, 60) + '...')}</div>
                    <div style="font-size: 8px; color: #999; margin-top: 4px;">
                        ${timeString} • ${priorityText}
                    </div>
                </div>
            `;
        }).join('');
        
        newsList.innerHTML = newsHtml;
        
        // Add click listeners for news items
        newsList.querySelectorAll('.trending-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                newsList.querySelectorAll('.trending-item').forEach(i => {
                    i.classList.remove('selected');
                });
                
                // Add selection to clicked item
                item.classList.add('selected');
                
                this.showNewsDetail(parseInt(item.dataset.newsId));
            });
        });
    },
    
    showNewsDetail(newsId) {
        const news = this.currentNews.find(n => n.news_id == newsId);
        if (!news) return;
        
        const publishTime = new Date(news.published_time).toLocaleString('pt-BR');
        const priorityText = {
            'urgent': 'URGENTE',
            'high': 'IMPORTANTE',
            'medium': 'NORMAL',
            'low': 'INFORMATIVO'
        }[news.priority] || 'NORMAL';
        
        const mainArticle = document.getElementById('main-article');
        if (mainArticle) {
            mainArticle.innerHTML = `
                <div class="article-title">${Utils.escapeHtml(news.headline)}</div>
                <div class="article-meta">
                    Publicado em: ${publishTime} | Prioridade: ${priorityText}
                </div>
                <div class="article-content">
                    ${Utils.escapeHtml(news.content.replace(/\n/g, '<br>'))}
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-secondary" onclick="NewsApp.saveNewsToNotes(${news.news_id})" 
                        style="padding: 4px 8px; font-size: 10px;">
                        Salvar nas Notas
                    </button>
                </div>
            `;
        }
    },
    
    async saveNewsToNotes(newsId) {
        const news = this.currentNews.find(n => n.news_id == newsId);
        if (!news || !GAME_STATE.userId) return;
        
        try {
            const noteTitle = `Notícia: ${news.headline}`;
            const noteContent = `${news.headline}\n\nPublicado em: ${new Date(news.published_time).toLocaleString('pt-BR')}\nPrioridade: ${news.priority?.toUpperCase() || 'NORMAL'}\n\n${news.content}`;
            
            const response = await API.notes.save(GAME_STATE.userId, noteTitle, noteContent);
            if (response.success) {
                Utils.showNotification('Notícia salva nas notas!', 'success');
            }
        } catch (error) {
            console.error('Error saving news to notes:', error);
            Utils.showNotification('Erro ao salvar notícia', 'error');
        }
    },
    
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('news-last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    },
    
    showErrorMessage() {
        const newsList = document.getElementById('trending-news');
        if (newsList) {
            newsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff0000;">
                    <h3>❌ Erro ao carregar notícias</h3>
                    <p>Não foi possível conectar com o jornal local.</p>
                    <button class="btn btn-primary" onclick="NewsApp.loadNews()" 
                        style="padding: 4px 8px; font-size: 10px; margin-top: 8px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    },
    
    printNews() {
        const printContent = this.generatePrintContent();
        const printWindow = window.open('', '_blank');
        
        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    <title>Jornal Local - Notícias</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; font-size: 12px; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                        .news-item { margin-bottom: 20px; page-break-inside: avoid; }
                        .headline { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                        .meta { font-size: 10px; color: #666; margin-bottom: 10px; }
                        .content { line-height: 1.4; text-align: justify; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    },
    
    generatePrintContent() {
        const now = new Date().toLocaleString('pt-BR');
        
        let content = `
            <div class="header">
                <h1>JORNAL LOCAL - EDIÇÃO ESPECIAL</h1>
                <p>Caso: O Mistério da Mansão Blackwood</p>
                <p>Impresso em: ${now}</p>
            </div>
        `;
        
        this.currentNews.forEach(news => {
            const publishTime = new Date(news.published_time).toLocaleString('pt-BR');
            content += `
                <div class="news-item">
                    <div class="headline">${Utils.escapeHtml(news.headline)}</div>
                    <div class="meta">
                        ${publishTime} | Prioridade: ${news.priority?.toUpperCase() || 'NORMAL'}
                    </div>
                    <div class="content">${Utils.escapeHtml(news.content)}</div>
                </div>
            `;
        });
        
        return content;
    },
    
    saveNews() {
        const newsData = {
            case: 'O Mistério da Mansão Blackwood',
            exported_at: new Date().toISOString(),
            news: this.currentNews
        };
        
        const dataStr = JSON.stringify(newsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `noticias_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        Utils.showNotification('Notícias salvas com sucesso!', 'success');
    }
};