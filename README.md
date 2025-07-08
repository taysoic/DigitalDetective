# Digital Detective - O Mistério da Mansão Blackwood

## Descrição
Jogo de investigação criminal ambientado no ano 2000, onde o detetive investiga remotamente através de e-mails, chats e arquivos digitais. O projeto foi desenvolvido com tema de cores vermelhas e cinzas conforme solicitado.

## Tecnologias Utilizadas
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript (estilo Windows 98)
- **Banco de Dados**: MySQL
- **Estilo**: Tema vermelho e cinza

## Estrutura do Projeto
```
digitaldetective-project/
├── digitaldetective-api/          # Aplicação Flask principal
│   ├── src/
│   │   ├── main.py               # Servidor Flask principal
│   │   └── static/               # Frontend integrado
│   └── requirements.txt          # Dependências Python
├── digitaldetective/             # Arquivos originais separados
│   ├── digitaldetective-frontend/
│   └── digitaldetective-backend/
└── upload/
    └── digitaldetective(3).sql   # Schema do banco de dados
```

## Configuração e Instalação

### 1. Requisitos
- Python 3.11+
- MySQL Server
- pip (gerenciador de pacotes Python)

### 2. Configuração do Banco de Dados
```bash
# Instalar MySQL
sudo apt update
sudo apt install mysql-server

# Iniciar MySQL
sudo service mysql start

# Criar banco de dados
sudo mysql -e "CREATE DATABASE digitaldetective;"
sudo mysql -e "CREATE USER 'root'@'localhost' IDENTIFIED BY 'digitaldetective123';"
sudo mysql -e "GRANT ALL PRIVILEGES ON digitaldetective.* TO 'root'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Importar schema
mysql -u root -pdigitaldetective123 digitaldetective < upload/digitaldetective\(3\).sql
```

### 3. Configuração da Aplicação
```bash
# Navegar para o diretório do projeto
cd digitaldetective-api

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python src/main.py
```

### 4. Acesso
- Aplicação estará disponível em: http://localhost:5000
- A aplicação serve tanto o frontend quanto a API

## Funcionalidades Implementadas

### Sistema de E-mails
- Interface estilo Outlook anos 2000
- Troca de mensagens com suspeitos
- Respostas com delay simulando tempo real

### Chat com Assistente
- 5 assistentes disponíveis com habilidades únicas
- Atualizações em tempo real
- Sistema de dicas baseado no assistente escolhido

### Sistema de Investigação
- Análise de pistas e evidências
- Interrogatório de suspeitos
- Sistema de progresso do jogador

### Outros Recursos
- Notícias dinâmicas
- Sistema de notas
- Minesweeper para entretenimento
- Interface Windows 98 autêntica

## Tema de Cores
O projeto utiliza exclusivamente tons de vermelho e cinza:
- **Vermelho principal**: #cc0000
- **Vermelho claro**: #ff4040
- **Cinza escuro**: #2a2a2a
- **Cinza médio**: #808080
- **Cinza claro**: #d0d0d0

## API Endpoints
- `GET /api/cases` - Lista de casos
- `GET /api/assistants` - Lista de assistentes
- `GET /api/suspects/<case_id>` - Suspeitos do caso
- `GET /api/clues/<case_id>` - Pistas do caso
- `GET /api/weapons/<case_id>` - Armas do caso
- `POST /api/start-game` - Iniciar novo jogo
- `GET /api/emails/<case_id>` - E-mails do caso
- `GET /api/dialogues/<case_id>` - Diálogos do caso

## Configuração de Produção
Para deploy em produção, certifique-se de:
1. Configurar variáveis de ambiente para credenciais do banco
2. Usar servidor WSGI como Gunicorn
3. Configurar proxy reverso (Nginx)
4. Habilitar HTTPS

## Suporte
Para dúvidas ou problemas, consulte a documentação do código ou entre em contato com a equipe de desenvolvimento.

