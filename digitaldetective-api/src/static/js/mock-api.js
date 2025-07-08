// Digital Detective - Mock API for Demo
class MockAPI {
    constructor() {
        this.gameState = {
            user_id: 1,
            case_id: 1,
            assistant: null,
            emails: [],
            chatHistory: [],
            notes: [],
            news: [],
            clues: [],
            isGameStarted: false
        };
        
        this.initializeMockData();
    }
    
    initializeMockData() {
        // Mock emails
        this.gameState.emails = [
            {
                id: 1,
                from: 'delegado.santos@policia.gov.br',
                to: 'detetive@digitaldetective.com',
                subject: 'Caso Mansão Blackwood - Informações Iniciais',
                body: 'Detetive, temos um caso urgente. Lord Blackwood foi encontrado morto em sua mansão. Preciso que investigue imediatamente.',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: 2,
                from: 'viuva.blackwood@email.com',
                to: 'detetive@digitaldetective.com',
                subject: 'Meu marido...',
                body: 'Por favor, encontre quem fez isso com meu querido Edward. Ele não merecia morrer assim.',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                read: false
            }
        ];
        
        // Mock news
        this.gameState.news = [
            {
                id: 1,
                title: 'Magnata Encontrado Morto em Mansão',
                content: 'Lord Edward Blackwood, conhecido empresário, foi encontrado morto em sua mansão na madrugada de hoje.',
                timestamp: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 2,
                title: 'Polícia Investiga Morte Suspeita',
                content: 'As autoridades não descartam a possibilidade de homicídio no caso Blackwood.',
                timestamp: new Date(Date.now() - 5400000).toISOString()
            }
        ];
        
        // Mock clues
        this.gameState.clues = [
            {
                id: 1,
                name: 'Copo de Vinho',
                description: 'Um copo de vinho tinto encontrado na mesa do escritório.',
                location: 'Escritório',
                analyzed: false
            },
            {
                id: 2,
                name: 'Carta Rasgada',
                description: 'Fragmentos de uma carta encontrados na lareira.',
                location: 'Sala de Estar',
                analyzed: false
            }
        ];
    }
    
    async startGame(assistantId) {
        const assistants = {
            1: { id: 1, name: 'Rico Belmont', ability: 'Suborna autoridades', disadvantage: 'Policiais não cooperam' },
            2: { id: 2, name: 'Clara Maia', ability: 'Consegue empatia da viúva', disadvantage: 'Pistas podem atrasar' },
            3: { id: 3, name: 'Bárbara Hacker', ability: 'Acessa e-mails apagados', disadvantage: 'Atrai atenção da polícia' },
            4: { id: 4, name: 'Dona Lurdes', ability: 'Descobre fofocas cruciais', disadvantage: 'Análise lenta de provas' },
            5: { id: 5, name: 'Dra. Ice', ability: 'Convence suspeitos a confessarem', disadvantage: 'Irrita suspeitos' }
        };
        
        this.gameState.assistant = assistants[assistantId] || assistants[1];
        this.gameState.isGameStarted = true;
        
        return {
            success: true,
            user_id: this.gameState.user_id,
            case_id: this.gameState.case_id,
            case_info: {
                title: 'O Mistério da Mansão Blackwood',
                description: 'Um caso de assassinato na mansão da família Blackwood.'
            },
            assistant: this.gameState.assistant,
            message: 'Jogo iniciado com sucesso!'
        };
    }
    
    async getEmails() {
        return {
            success: true,
            emails: this.gameState.emails
        };
    }
    
    async sendEmail(to, subject, body) {
        const newEmail = {
            id: this.gameState.emails.length + 1,
            from: 'detetive@digitaldetective.com',
            to: to,
            subject: subject,
            body: body,
            timestamp: new Date().toISOString(),
            read: true
        };
        
        this.gameState.emails.push(newEmail);
        
        return {
            success: true,
            message: 'E-mail enviado com sucesso!'
        };
    }
    
    async getChatHistory() {
        return {
            success: true,
            messages: this.gameState.chatHistory
        };
    }
    
    async sendChatMessage(message) {
        const userMessage = {
            id: this.gameState.chatHistory.length + 1,
            sender: 'user',
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.gameState.chatHistory.push(userMessage);
        
        // Simulate assistant response
        setTimeout(() => {
            const responses = [
                'Interessante observação, detetive.',
                'Vamos investigar essa pista mais a fundo.',
                'Isso pode ser importante para o caso.',
                'Preciso pensar sobre isso...',
                'Boa dedução! Continue assim.'
            ];
            
            const assistantMessage = {
                id: this.gameState.chatHistory.length + 1,
                sender: 'assistant',
                message: responses[Math.floor(Math.random() * responses.length)],
                timestamp: new Date().toISOString()
            };
            
            this.gameState.chatHistory.push(assistantMessage);
            
            // Trigger chat update if chat window is open
            if (window.app && window.app.windows && window.app.windows.chat) {
                window.app.windows.chat.loadChatHistory();
            }
        }, 1000 + Math.random() * 2000);
        
        return {
            success: true,
            message: userMessage
        };
    }
    
    async getNews() {
        return {
            success: true,
            news: this.gameState.news
        };
    }
    
    async getNotes() {
        return {
            success: true,
            notes: this.gameState.notes
        };
    }
    
    async saveNote(title, content) {
        const newNote = {
            id: this.gameState.notes.length + 1,
            title: title,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        this.gameState.notes.push(newNote);
        
        return {
            success: true,
            note: newNote
        };
    }
    
    async getClues() {
        return {
            success: true,
            clues: this.gameState.clues
        };
    }
    
    async analyzeClue(clueId) {
        const clue = this.gameState.clues.find(c => c.id === clueId);
        if (!clue) {
            return {
                success: false,
                error: 'Pista não encontrada'
            };
        }
        
        clue.analyzed = true;
        
        const analyses = {
            1: 'Análise do copo: Encontradas impressões digitais de Lord Blackwood e vestígios de veneno.',
            2: 'Análise da carta: Fragmentos revelam uma ameaça de morte assinada com as iniciais "J.M."'
        };
        
        return {
            success: true,
            analysis: analyses[clueId] || 'Análise concluída. Nada de relevante encontrado.',
            clue: clue
        };
    }
}

// Initialize mock API
window.mockAPI = new MockAPI();

