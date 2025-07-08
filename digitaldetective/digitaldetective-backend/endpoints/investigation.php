<?php
require_once '../config.php';

function handleGetClues($case_id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $pdo = getDBConnection();
    
    try {
        // Buscar pistas do caso
        $stmt = $pdo->prepare("
            SELECT cc.*, p.name as clue_name, p.description as clue_description,
                   p.type as clue_type, l.name as location_name, s.name as suspect_name
            FROM case_clue cc
            JOIN pista p ON cc.clue_id = p.clue_id
            LEFT JOIN local l ON cc.location_id = l.location_id
            LEFT JOIN suspeitos s ON cc.suspect_id = s.suspect_id
            WHERE cc.case_id = ?
            ORDER BY p.importance DESC
        ");
        $stmt->execute([$case_id]);
        $clues = $stmt->fetchAll();
        
        // Buscar armas do caso
        $stmt = $pdo->prepare("
            SELECT cw.*, a.name as weapon_name, a.description as weapon_description,
                   a.type as weapon_type, l.name as found_location_name
            FROM case_weapon cw
            JOIN arma a ON cw.weapon_id = a.weapon_id
            LEFT JOIN local l ON cw.found_at_location_id = l.location_id
            WHERE cw.case_id = ?
        ");
        $stmt->execute([$case_id]);
        $weapons = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'clues' => $clues,
            'weapons' => $weapons
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get clues: ' . $e->getMessage()], 500);
    }
}

function handleAnalyzeClue() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = getJsonInput();
    $user_id = $data['user_id'] ?? null;
    $clue_id = $data['clue_id'] ?? null;
    $weapon_id = $data['weapon_id'] ?? null;
    
    if (!$user_id || (!$clue_id && !$weapon_id)) {
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
        
        $analysis_result = [];
        
        if ($clue_id) {
            // Analisar pista
            $stmt = $pdo->prepare("
                SELECT cc.*, p.name, p.description, p.analysis_result, p.type
                FROM case_clue cc
                JOIN pista p ON cc.clue_id = p.clue_id
                WHERE cc.case_id = ? AND cc.clue_id = ?
            ");
            $stmt->execute([$progress['case_id'], $clue_id]);
            $clue = $stmt->fetch();
            
            if ($clue) {
                $analysis_result = [
                    'type' => 'clue',
                    'name' => $clue['name'],
                    'description' => $clue['description'],
                    'analysis' => $clue['analysis_result'] ?: generateClueAnalysis($clue),
                    'importance' => determineClueImportance($clue_id, $user_id, $pdo)
                ];
            }
        }
        
        if ($weapon_id) {
            // Analisar arma
            $stmt = $pdo->prepare("
                SELECT cw.*, a.name, a.description, a.inspection_message, a.type
                FROM case_weapon cw
                JOIN arma a ON cw.weapon_id = a.weapon_id
                WHERE cw.case_id = ? AND cw.weapon_id = ?
            ");
            $stmt->execute([$progress['case_id'], $weapon_id]);
            $weapon = $stmt->fetch();
            
            if ($weapon) {
                $analysis_result = [
                    'type' => 'weapon',
                    'name' => $weapon['name'],
                    'description' => $weapon['description'],
                    'analysis' => $weapon['inspection_message'],
                    'is_murder_weapon' => (bool)$weapon['murder_weapon'],
                    'weapon_type' => $weapon['type']
                ];
            }
        }
        
        if (empty($analysis_result)) {
            jsonResponse(['error' => 'Clue or weapon not found'], 404);
        }
        
        // Registrar análise
        $stmt = $pdo->prepare("
            INSERT INTO user_analysis (user_id, case_id, clue_id, weapon_id, analysis_time)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$user_id, $progress['case_id'], $clue_id, $weapon_id]);
        
        jsonResponse([
            'success' => true,
            'analysis' => $analysis_result
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to analyze: ' . $e->getMessage()], 500);
    }
}

function generateClueAnalysis($clue) {
    $analyses = [
        'Física' => 'Análise forense revela detalhes importantes sobre esta evidência física.',
        'Digital' => 'Análise digital mostra rastros eletrônicos significativos.',
        'Documental' => 'Exame do documento revela informações cruciais.',
        'Testemunhal' => 'Depoimento contém inconsistências que merecem investigação.',
        'Financeira' => 'Registros financeiros mostram transações suspeitas.'
    ];
    
    return $analyses[$clue['type']] ?? 'Análise em andamento...';
}
function handleGetWeapons($case_id) {
    // Example: Fetch weapons from database or static array
    // Replace this with your actual logic
    $weapons = [
        1 => ['id' => 1, 'name' => 'Knife', 'description' => 'A sharp kitchen knife.'],
        2 => ['id' => 2, 'name' => 'Pistol', 'description' => 'A standard 9mm pistol.'],
        3 => ['id' => 3, 'name' => 'Poison', 'description' => 'A vial of colorless poison.']
    ];

    // For demonstration, return all weapons (or filter by $case_id if needed)
    jsonResponse([
        'case_id' => $case_id,
        'weapons' => array_values($weapons)
    ]);
}
function determineClueImportance($clue_id, $user_id, $pdo) {
    // Verificar se a pista está relacionada ao culpado correto
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as relevance
        FROM game_solution gs
        JOIN user_progress up ON gs.case_id = up.case_id
        JOIN case_clue cc ON cc.case_id = gs.case_id
        WHERE up.user_id = ? AND cc.clue_id = ? 
        AND (cc.suspect_id = gs.culprit_id OR cc.clue_id IN (
            SELECT clue_id FROM pista WHERE type = 'Física' AND importance > 7
        ))
    ");
    $stmt->execute([$user_id, $clue_id]);
    $result = $stmt->fetch();
    
    return $result['relevance'] > 0 ? 'high' : 'medium';
}

