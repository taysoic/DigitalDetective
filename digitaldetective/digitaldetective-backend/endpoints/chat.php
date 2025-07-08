<?php
require_once '../config.php';

function handleSendMessage() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $message = $data['message'] ?? '';
    $assistant_id = $data['assistant_id'] ?? 1;
    
    if (!$user_id || !$message) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar progresso do usuário
        $stmt = $pdo->prepare("SELECT case_id FROM user_progress WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $progress = $stmt->fetch();
        
        if (!$progress) {
            jsonResponse(['error' => 'User not found or no active game'], 404);
        }
        
        // Inserir mensagem do jogador
        $stmt = $pdo->prepare("
            INSERT INTO chat_messages (user_id, case_id, assistant_id, message, sender_type, sent_time)
            VALUES (?, ?, ?, ?, 'player', NOW())
        ");
        $stmt->execute([$user_id, $progress['case_id'], $assistant_id, $message]);
        
        // Gerar resposta do assistente
        $assistant_response = generateAssistantResponse($assistant_id, $message, $user_id, $pdo);
        
        $stmt = $pdo->prepare("
            INSERT INTO chat_messages (user_id, case_id, assistant_id, message, sender_type, sent_time)
            VALUES (?, ?, ?, ?, 'assistant', NOW())
        ");
        $stmt->execute([$user_id, $progress['case_id'], $assistant_id, $assistant_response]);
        
        jsonResponse([
            'success' => true,
            'assistant_response' => $assistant_response
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to send message: ' . $e->getMessage()], 500);
    }
}

function handleGetChatHistory($user_id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT cm.*, a.name as assistant_name
            FROM chat_messages cm
            LEFT JOIN assistentes a ON cm.assistant_id = a.assistente_id
            WHERE cm.user_id = ?
            ORDER BY cm.sent_time ASC
        ");
        $stmt->execute([$user_id]);
        $messages = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'messages' => $messages
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get chat history: ' . $e->getMessage()], 500);
    }
}

function generateAssistantResponse($assistant_id, $player_message, $user_id, $pdo) {
    // Buscar informações do assistente
    $stmt = $pdo->prepare("SELECT * FROM assistentes WHERE assistente_id = ?");
    $stmt->execute([$assistant_id]);
    $assistant = $stmt->fetch();
    
    if (!$assistant) {
        return "Assistente não encontrado.";
    }
    
    // Respostas baseadas no assistente e na mensagem
    $responses = [
        1 => [ // Rico Belmont
            'default' => "Deixa comigo, tenho contatos que podem ajudar... por um preço.",
            'investigate' => "Vou usar meus contatos para conseguir informações exclusivas.",
            'suspect' => "Conheço gente que pode me dar informações sobre esse suspeito.",
            'clue' => "Meus contatos na polícia podem ter mais detalhes sobre isso."
        ],
        2 => [ // Clara Maia
            'default' => "Vou tentar entender o lado humano dessa história...",
            'investigate' => "Deixe-me conversar com as pessoas, elas confiam em mim.",
            'suspect' => "Vou tentar criar empatia e descobrir a verdade.",
            'clue' => "Talvez eu consiga uma perspectiva diferente sobre essa pista."
        ],
        3 => [ // Bárbara Hacker
            'default' => "Hackear sistemas? Relaxa, já fiz coisa pior.",
            'investigate' => "Vou fuçar nos computadores e ver o que encontro.",
            'suspect' => "Deixa eu dar uma olhada no histórico digital dessa pessoa.",
            'clue' => "Posso tentar recuperar dados apagados relacionados a isso."
        ],
        4 => [ // Dona Lurdes
            'default' => "Quer saber a verdade? Eu sei tudo sobre essa gente...",
            'investigate' => "Vou espalhar a palavra e ver que fofocas aparecem.",
            'suspect' => "Ah, essa pessoa... eu sei umas coisas sobre ela...",
            'clue' => "Deixa eu perguntar por aí, sempre tem alguém que viu algo."
        ],
        5 => [ // Dra. Ice
            'default' => "Analisando o perfil... eles têm padrões comportamentais interessantes.",
            'investigate' => "Vou fazer uma análise psicológica da situação.",
            'suspect' => "O perfil psicológico dessa pessoa é fascinante...",
            'clue' => "Essa pista revela muito sobre a mente do criminoso."
        ]
    ];
    
    $assistant_responses = $responses[$assistant_id] ?? $responses[1];
    
    // Determinar tipo de resposta baseado na mensagem
    $message_lower = strtolower($player_message);
    
    if (strpos($message_lower, 'investig') !== false || strpos($message_lower, 'procur') !== false) {
        return $assistant_responses['investigate'];
    } elseif (strpos($message_lower, 'suspeito') !== false || strpos($message_lower, 'pessoa') !== false) {
        return $assistant_responses['suspect'];
    } elseif (strpos($message_lower, 'pista') !== false || strpos($message_lower, 'evidência') !== false) {
        return $assistant_responses['clue'];
    }
    
    return $assistant_responses['default'];
}
?>

