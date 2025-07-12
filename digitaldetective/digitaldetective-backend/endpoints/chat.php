<?php
function handleGetChatHistory($user_id) {
    if (!$user_id) {
        jsonResponse(['success' => false, 'error' => 'ID do utilizador é obrigatório'], 400);
    }
    try {
        $pdo = getDBConnection();
        // Assume que a tabela se chama 'chat_messages' com as colunas 'user_id', 'sender', 'message', 'timestamp'
        $stmt = $pdo->prepare("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY timestamp ASC");
        $stmt->execute([$user_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'history' => $history]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao buscar histórico do chat: ' . $e->getMessage()], 500);
    }
}

function handleSendMessage($data) {
    $user_id = $data['user_id'] ?? null;
    $message = $data['message'] ?? '';
    $sender = $data['sender'] ?? 'user'; // 'user' ou 'assistant'

    if (!$user_id || !$message) {
        jsonResponse(['success' => false, 'error' => 'Faltam dados para enviar a mensagem'], 400);
    }
    
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare(
            "INSERT INTO chat_messages (user_id, sender, message, timestamp) VALUES (?, ?, ?, NOW())"
        );
        $stmt->execute([$user_id, $sender, $message]);

        // Aqui você pode adicionar a lógica da resposta do assistente, se houver.
        // Por agora, apenas confirma o envio.
        jsonResponse(['success' => true, 'message' => 'Mensagem enviada com sucesso']);

    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao enviar mensagem: ' . $e->getMessage()], 500);
    }
}