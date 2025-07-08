<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true);
}

// Router
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', $path);
$endpoint = end($parts);

switch ($method) {
    case 'GET':
        if ($endpoint === 'notes' && isset($_GET['user_id'])) {
            handleGetNotes($_GET['user_id']);
        }
        break;
    case 'POST':
        if ($endpoint === 'notes') {
            handleSaveNote();
        }
        break;
    case 'DELETE':
        if ($endpoint === 'notes' && isset($_GET['user_id']) && isset($_GET['note_id'])) {
            handleDeleteNote($_GET['user_id'], $_GET['note_id']);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleSaveNote() {
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $title = $data['title'] ?? '';
    $content = $data['content'] ?? '';
    $note_id = $data['note_id'] ?? null;
    
    if (!$user_id || !$content) {
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
        
        if ($note_id) {
            // Atualizar nota existente
            $stmt = $pdo->prepare("
                UPDATE user_notes 
                SET title = ?, content = ?, updated_at = NOW()
                WHERE note_id = ? AND user_id = ?
            ");
            $stmt->execute([$title, $content, $note_id, $user_id]);
            
            jsonResponse([
                'success' => true,
                'message' => 'Nota atualizada com sucesso!',
                'note_id' => $note_id
            ]);
        } else {
            // Criar nova nota
            $stmt = $pdo->prepare("
                INSERT INTO user_notes (user_id, case_id, title, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([$user_id, $progress['case_id'], $title, $content]);
            $note_id = $pdo->lastInsertId();
            
            jsonResponse([
                'success' => true,
                'message' => 'Nota salva com sucesso!',
                'note_id' => $note_id
            ]);
        }
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to save note: ' . $e->getMessage()], 500);
    }
}

function handleGetNotes($user_id) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM user_notes 
            WHERE user_id = ? 
            ORDER BY updated_at DESC
        ");
        $stmt->execute([$user_id]);
        $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'notes' => $notes
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get notes: ' . $e->getMessage()], 500);
    }
}

function handleDeleteNote($user_id, $note_id) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            DELETE FROM user_notes 
            WHERE note_id = ? AND user_id = ?
        ");
        $stmt->execute([$note_id, $user_id]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse([
                'success' => true,
                'message' => 'Nota excluída com sucesso!'
            ]);
        } else {
            jsonResponse([
                'success' => false,
                'message' => 'Nota não encontrada ou já excluída'
            ]);
        }
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to delete note: ' . $e->getMessage()], 500);
    }
}
?>