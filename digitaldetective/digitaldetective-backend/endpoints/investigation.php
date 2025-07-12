<?php

require_once '../config.php';

function handleGetClues($case_id) {
    setCorsHeaders(); // Usar a função do config.php
    
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM case_clues 
            WHERE case_id = ?
            ORDER BY importance DESC, clue_name
        ");
        $stmt->execute([$case_id]);
        $clues = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'clues' => $clues]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get clues: ' . $e->getMessage()], 500);
    }
}

// Roteamento
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    if (preg_match('/\/investigation\/clues\/(\d+)/', $path, $matches)) {
        handleGetClues($matches[1]);
    }
}

// Endpoint para obter suspeitos do caso
function handleGetSuspects($case_id) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM case_suspects 
            WHERE case_id = ?
            ORDER BY suspect_name
        ");
        $stmt->execute([$case_id]);
        $suspects = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'suspects' => $suspects]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get suspects: ' . $e->getMessage()], 500);
    }
}

// Endpoint para analisar pista
function handleAnalyzeClue($user_id, $clue_id) {
    $pdo = getDBConnection();
    
    try {
        // Verificar se o usuário tem acesso à pista
        $stmt = $pdo->prepare("
            SELECT cc.* 
            FROM case_clues cc
            JOIN user_progress up ON cc.case_id = up.case_id
            WHERE cc.clue_id = ? AND up.user_id = ?
        ");
        $stmt->execute([$clue_id, $user_id]);
        $clue = $stmt->fetch();
        
        if (!$clue) {
            jsonResponse(['error' => 'Clue not found or access denied'], 404);
        }
        
        // Simular análise (em um sistema real, isso seria mais complexo)
        $analysis = [
            'success' => true,
            'clue_id' => $clue_id,
            'result' => $clue['is_red_herring'] 
                ? "Esta pista parece ser irrelevante para o caso." 
                : "Esta pista contém informações importantes para a investigação.",
            'new_info' => $clue['inspection_message']
        ];
        
        // Registrar análise no histórico
        $stmt = $pdo->prepare("
            INSERT INTO user_clue_analysis (user_id, clue_id, analysis_result, analysis_time)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$user_id, $clue_id, $analysis['result']]);
        
        jsonResponse($analysis);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to analyze clue: ' . $e->getMessage()], 500);
    }
}

// Endpoint para submeter solução
function handleSubmitSolution($user_id, $case_id, $suspect_id, $weapon_id) {
    $pdo = getDBConnection();
    
    try {
        // Verificar se o usuário está no caso correto
        $stmt = $pdo->prepare("SELECT case_id FROM user_progress WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $progress = $stmt->fetch();
        
        if (!$progress || $progress['case_id'] != $case_id) {
            jsonResponse(['error' => 'Invalid case for user'], 400);
        }
        
        // Obter solução correta
        $stmt = $pdo->prepare("
            SELECT murder_weapon_id, murderer_id 
            FROM cases 
            WHERE case_id = ?
        ");
        $stmt->execute([$case_id]);
        $case = $stmt->fetch();
        
        if (!$case) {
            jsonResponse(['error' => 'Case not found'], 404);
        }
        
        $isCorrect = ($suspect_id == $case['murderer_id']) && 
                     ($weapon_id == $case['murder_weapon_id']);
        
        // Registrar tentativa
        $stmt = $pdo->prepare("
            INSERT INTO user_solutions 
            (user_id, case_id, suspect_id, weapon_id, is_correct, submission_time)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$user_id, $case_id, $suspect_id, $weapon_id, $isCorrect]);
        
        // Atualizar progresso se correto
        if ($isCorrect) {
            $stmt = $pdo->prepare("
                UPDATE user_progress 
                SET is_completed = 1, completion_time = NOW()
                WHERE user_id = ? AND case_id = ?
            ");
            $stmt->execute([$user_id, $case_id]);
        }
        
        jsonResponse([
            'success' => true,
            'is_correct' => $isCorrect,
            'message' => $isCorrect 
                ? 'Parabéns! Você resolveu o caso!' 
                : 'Solução incorreta. Continue investigando!'
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to submit solution: ' . $e->getMessage()], 500);
    }
}

// Roteamento
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', $path);
    
    if (strpos($path, '/api/weapons') !== false && isset($_GET['case_id'])) {
        handleGetWeapons($_GET['case_id']);
    } 
    elseif (strpos($path, '/api/clues') !== false && isset($_GET['case_id'])) {
        handleGetClues($_GET['case_id']);
    }
    elseif (strpos($path, '/api/suspects') !== false && isset($_GET['case_id'])) {
        handleGetSuspects($_GET['case_id']);
    }
    elseif (strpos($path, '/api/chat') !== false && isset($_GET['user_id'])) {
        handleGetChatHistory($_GET['user_id']);
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonInput();
    
    if (strpos($_SERVER['REQUEST_URI'], '/api/analyze-clue') !== false) {
        handleAnalyzeClue($data['user_id'], $data['clue_id']);
    }
    elseif (strpos($_SERVER['REQUEST_URI'], '/api/submit-solution') !== false) {
        handleSubmitSolution(
            $data['user_id'],
            $data['case_id'],
            $data['suspect_id'],
            $data['weapon_id']
        );
    }
    elseif (strpos($_SERVER['REQUEST_URI'], '/api/send-message') !== false) {
        handleSendMessage();
    }
}
?>