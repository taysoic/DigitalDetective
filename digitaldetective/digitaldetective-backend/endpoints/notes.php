<?php
function handleGetNotes($user_id) {
    if (!$user_id) {
        jsonResponse(['success' => false, 'error' => 'ID do utilizador é obrigatório'], 400);
    }
    try {
        $pdo = getDBConnection();
        // Assume uma tabela 'notes' com colunas 'note_id', 'user_id', 'title', 'content', 'last_modified'
        $stmt = $pdo->prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY last_modified DESC");
        $stmt->execute([$user_id]);
        $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'notes' => $notes]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao buscar notas: ' . $e->getMessage()], 500);
    }
}

function handleSaveNote($data) {
    $user_id = $data['user_id'] ?? null;
    $note_id = $data['note_id'] ?? null;
    $title = $data['title'] ?? 'Nova Nota';
    $content = $data['content'] ?? '';

    if (!$user_id) {
        jsonResponse(['success' => false, 'error' => 'ID do utilizador é obrigatório'], 400);
    }

    try {
        $pdo = getDBConnection();
        if ($note_id) {
            // Atualiza uma nota existente
            $stmt = $pdo->prepare(
                "UPDATE notes SET title = ?, content = ?, last_modified = NOW() WHERE note_id = ? AND user_id = ?"
            );
            $stmt->execute([$title, $content, $note_id, $user_id]);
            $message = 'Nota atualizada com sucesso';
        } else {
            // Insere uma nova nota
            $stmt = $pdo->prepare(
                "INSERT INTO notes (user_id, title, content, last_modified) VALUES (?, ?, ?, NOW())"
            );
            $stmt->execute([$user_id, $title, $content]);
            $note_id = $pdo->lastInsertId();
            $message = 'Nota guardada com sucesso';
        }
        jsonResponse(['success' => true, 'message' => $message, 'note_id' => $note_id]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao guardar nota: ' . $e->getMessage()], 500);
    }
}