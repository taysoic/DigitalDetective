<?php
require_once 'config.php';

setCorsHeaders();

// Roteamento simples
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/digitaldetective-backend', '', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Remove trailing slash
$path = rtrim($path, '/');
if (empty($path)) {
    $path = '/';
}

// Roteamento
switch ($path) {
    case '/':
        jsonResponse([
            'message' => 'Digital Detective API',
            'version' => API_VERSION,
            'endpoints' => [
                'GET /game/start' => 'Iniciar novo jogo',
                'GET /game/status/{user_id}' => 'Status do jogo',
                'POST /emails/send' => 'Enviar email',
                'GET /emails/{user_id}' => 'Listar emails',
                'POST /emails/reply' => 'Responder email',
                'POST /chat/message' => 'Enviar mensagem no chat',
                'GET /chat/history/{user_id}' => 'Histórico do chat',
                'GET /news/{case_id}' => 'Notícias do caso',
                'POST /notes/save' => 'Salvar nota',
                'GET /notes/{user_id}' => 'Listar notas',
                'GET /investigation/clues/{case_id}' => 'Pistas disponíveis',
                'POST /investigation/analyze' => 'Analisar pista',
                'POST /game/solve' => 'Resolver caso'
            ]
        ]);
        break;
        
    case '/game/start':
        require_once 'endpoints/game.php';
        handleGameStart();
        break;
        
    case (preg_match('/^\/game\/status\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/game.php';
        handleGameStatus($matches[1]);
        break;
        
    case '/emails/send':
        require_once 'endpoints/emails.php';
        handleSendEmail();
        break;
        
    case (preg_match('/^\/emails\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/emails.php';
        handleGetEmails($matches[1]);
        break;
        
    case '/emails/reply':
        require_once 'endpoints/emails.php';
        handleReplyEmail();
        break;
        
    case '/chat/message':
        require_once 'endpoints/chat.php';
        handleSendMessage();
        break;
        
    case (preg_match('/^\/chat\/history\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/chat.php';
        handleGetChatHistory($matches[1]);
        break;
        
    case (preg_match('/^\/news\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/news.php';
        handleGetNews($matches[1]);
        break;
        
    case '/notes/save':
        require_once 'endpoints/notes.php';
        handleSaveNote();
        break;
        
    case (preg_match('/^\/notes\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/notes.php';
        handleGetNotes($matches[1]);
        break;
        
    case (preg_match('/^\/investigation\/clues\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/investigation.php';
        handleGetClues($matches[1]);
        break;
        
    case '/investigation/analyze':
        require_once 'endpoints/investigation.php';
        handleAnalyzeClue();
        break;
        
    case '/game/solve':
        require_once 'endpoints/game.php';
        handleSolveCase();
        break;
    case (preg_match('/^\/weapons\/(\d+)$/', $path, $matches) ? true : false):
        require_once 'endpoints/weapons.php';
        handleGetWeapons($matches[1]);
        break;
        
    default:
        jsonResponse(['error' => 'Endpoint not found'], 404);
        break;
}
?>

