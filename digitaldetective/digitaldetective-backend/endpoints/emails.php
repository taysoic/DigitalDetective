<?php
require_once '../config.php';

function handleSendEmail() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $recipient_id = $data['recipient_id'] ?? null;
    $subject = $data['subject'] ?? '';
    $content = $data['content'] ?? '';
    
    if (!$user_id || !$recipient_id || !$subject || !$content) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar progresso do usuário para obter case_id
        $stmt = $pdo->prepare("SELECT case_id FROM user_progress WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $progress = $stmt->fetch();
        
        if (!$progress) {
            jsonResponse(['error' => 'User not found or no active game'], 404);
        }
        
        // Inserir email na tabela user_emails
        $stmt = $pdo->prepare("
            INSERT INTO user_emails (user_id, case_id, sender_id, recipient_id, subject, content, sent_time, is_from_player)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)
        ");
        $stmt->execute([$user_id, $progress['case_id'], $user_id, $recipient_id, $subject, $content]);
        
        // Simular resposta automática do NPC (com delay)
        $delay = rand(EMAIL_DELAY_MIN, EMAIL_DELAY_MAX);
        $response_time = date('Y-m-d H:i:s', time() + $delay);
        
        // Gerar resposta baseada no suspeito
        $response_content = generateNPCEmailResponse($recipient_id, $content, $pdo);
        
        $stmt = $pdo->prepare("
            INSERT INTO user_emails (user_id, case_id, sender_id, recipient_id, subject, content, sent_time, is_from_player, scheduled_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        ");
        $stmt->execute([
            $user_id, 
            $progress['case_id'], 
            $recipient_id, 
            $user_id, 
            'Re: ' . $subject, 
            $response_content,
            $response_time,
            $response_time
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Email enviado com sucesso!',
            'response_expected_in' => $delay . ' segundos'
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to send email: ' . $e->getMessage()], 500);
    }
}

function handleGetEmails($user_id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar emails do usuário (incluindo os que já devem ter chegado)
        $stmt = $pdo->prepare("
            SELECT ue.*, s.name as sender_name, r.name as recipient_name
            FROM user_emails ue
            LEFT JOIN suspeitos s ON ue.sender_id = s.suspect_id
            LEFT JOIN suspeitos r ON ue.recipient_id = r.suspect_id
            WHERE ue.user_id = ? 
            AND (ue.scheduled_time IS NULL OR ue.scheduled_time <= NOW())
            ORDER BY ue.sent_time DESC
        ");
        $stmt->execute([$user_id]);
        $emails = $stmt->fetchAll();
        
        // Marcar emails como lidos
        $stmt = $pdo->prepare("UPDATE user_emails SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$user_id]);
        
        jsonResponse([
            'success' => true,
            'emails' => $emails
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get emails: ' . $e->getMessage()], 500);
    }
}

function handleReplyEmail() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $original_email_id = $data['original_email_id'] ?? null;
    $content = $data['content'] ?? '';
    
    if (!$user_id || !$original_email_id || !$content) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar email original
        $stmt = $pdo->prepare("SELECT * FROM user_emails WHERE email_id = ? AND user_id = ?");
        $stmt->execute([$original_email_id, $user_id]);
        $original_email = $stmt->fetch();
        
        if (!$original_email) {
            jsonResponse(['error' => 'Original email not found'], 404);
        }
        
        // Enviar resposta
        $recipient_id = $original_email['sender_id'];
        $subject = 'Re: ' . str_replace('Re: ', '', $original_email['subject']);
        
        $stmt = $pdo->prepare("
            INSERT INTO user_emails (user_id, case_id, sender_id, recipient_id, subject, content, sent_time, is_from_player, reply_to)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), 1, ?)
        ");
        $stmt->execute([$user_id, $original_email['case_id'], $user_id, $recipient_id, $subject, $content, $original_email_id]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Resposta enviada com sucesso!'
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to reply email: ' . $e->getMessage()], 500);
    }
}

function generateNPCEmailResponse($suspect_id, $player_message, $pdo) {
    // Buscar informações do suspeito
    $stmt = $pdo->prepare("SELECT * FROM suspeitos WHERE suspect_id = ?");
    $stmt->execute([$suspect_id]);
    $suspect = $stmt->fetch();
    
    if (!$suspect) {
        return "Desculpe, não posso responder no momento.";
    }
    
 
    
    $suspect_responses = $responses[$suspect_id] ?? ["Não posso comentar sobre isso no momento."];
    
    // Adicionar variação baseada no conteúdo da mensagem do jogador
    if (stripos($player_message, 'alibi') !== false) {
        return $suspect_responses[0] . " Quanto ao meu álibi, já expliquei onde estava.";
    } elseif (stripos($player_message, 'motivo') !== false) {
        return $suspect_responses[1] . " Não tinha motivo para fazer mal a Edmund.";
    } elseif (stripos($player_message, 'arma') !== false) {
        return $suspect_responses[2] . " Não sei nada sobre qualquer arma.";
    }
    
    return $suspect_responses[array_rand($suspect_responses)];
}
?>

