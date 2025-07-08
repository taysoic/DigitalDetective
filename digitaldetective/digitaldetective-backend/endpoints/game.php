<?php
require_once '../config.php';

function handleGameStart() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $assistant_id = $data['assistant_id'] ?? 1;
    
    // Teste simples primeiro
    jsonResponse([
        'success' => true,
        'user_id' => 1,
        'case_id' => 1,
        'case_info' => [
            'case_id' => 1,
            'title' => 'O Mistério da Mansão Blackwood',
            'description' => 'Um caso de assassinato na mansão da família Blackwood.'
        ],
        'assistant' => [
            'assistente_id' => $assistant_id,
            'name' => 'Rico Belmont',
            'dialogo_padrao' => 'Olá, detetive! Vamos resolver este caso juntos.'
        ],
        'message' => 'Jogo iniciado com sucesso!'
    ]);
}

function handleGameStatus($user_id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar progresso do usuário
        $stmt = $pdo->prepare("
            SELECT up.*, c.title as case_title, c.description as case_description,
                   l.name as current_location_name
            FROM user_progress up
            JOIN casos c ON up.case_id = c.case_id
            LEFT JOIN local l ON up.current_location_id = l.location_id
            WHERE up.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $progress = $stmt->fetch();
        
        if (!$progress) {
            jsonResponse(['error' => 'User not found or no active game'], 404);
        }
        
        // Buscar solução atual do jogo
        $stmt = $pdo->prepare("
            SELECT gs.*, s.name as culprit_name, a.name as weapon_name
            FROM game_solution gs
            LEFT JOIN suspeitos s ON gs.culprit_id = s.suspect_id
            LEFT JOIN arma a ON gs.weapon_id = a.weapon_id
            WHERE gs.user_id = ? AND gs.case_id = ?
        ");
        $stmt->execute([$user_id, $progress['case_id']]);
        $solution = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'progress' => $progress,
            'solution' => $solution ? [
                'culprit_name' => $solution['culprit_name'],
                'weapon_name' => $solution['weapon_name']
            ] : null
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get game status: ' . $e->getMessage()], 500);
    }
}

function handleSolveCase() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $accused_suspect_id = $data['suspect_id'] ?? null;
    $weapon_id = $data['weapon_id'] ?? null;
    
    if (!$user_id || !$accused_suspect_id) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar progresso do usuário
        $stmt = $pdo->prepare("SELECT * FROM user_progress WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $progress = $stmt->fetch();
        
        if (!$progress) {
            jsonResponse(['error' => 'User not found or no active game'], 404);
        }
        
        // Buscar solução correta
        $stmt = $pdo->prepare("
            SELECT gs.*, s.name as culprit_name, a.name as weapon_name
            FROM game_solution gs
            LEFT JOIN suspeitos s ON gs.culprit_id = s.suspect_id
            LEFT JOIN arma a ON gs.weapon_id = a.weapon_id
            WHERE gs.user_id = ? AND gs.case_id = ?
        ");
        $stmt->execute([$user_id, $progress['case_id']]);
        $solution = $stmt->fetch();
        
        // Verificar se a acusação está correta
        $correct_culprit = ($accused_suspect_id == $solution['culprit_id']);
        $correct_weapon = ($weapon_id == $solution['weapon_id']);
        
        $result = [
            'success' => true,
            'correct_culprit' => $correct_culprit,
            'correct_weapon' => $correct_weapon,
            'accused_suspect_id' => $accused_suspect_id,
            'correct_culprit_id' => $solution['culprit_id'],
            'correct_culprit_name' => $solution['culprit_name'],
            'correct_weapon_name' => $solution['weapon_name']
        ];
        
        if ($correct_culprit && $correct_weapon) {
            $result['outcome'] = 'victory';
            $result['message'] = 'Parabéns! Você resolveu o caso corretamente e foi promovido na agência!';
        } elseif ($correct_culprit) {
            $result['outcome'] = 'partial';
            $result['message'] = 'Você acertou o culpado, mas errou a arma do crime. Caso parcialmente resolvido.';
        } else {
            $result['outcome'] = 'failure';
            $result['message'] = 'Você acusou a pessoa errada. O verdadeiro assassino fugiu e pode voltar para você...';
        }
        
        // Marcar caso como resolvido
        $stmt = $pdo->prepare("UPDATE user_progress SET is_solved = 1, solved_at = NOW() WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        jsonResponse($result);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to solve case: ' . $e->getMessage()], 500);
    }
}
?>

