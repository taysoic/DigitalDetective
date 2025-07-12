<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

try {
    // Verifica se o case_id foi fornecido
    if (!isset($_GET['case_id'])) {
        throw new Exception('Parâmetro case_id é obrigatório');
    }

    $case_id = intval($_GET['case_id']);
    
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("
        SELECT w.*, cw.found_location 
        FROM weapons w
        JOIN case_weapons cw ON w.weapon_id = cw.weapon_id
        WHERE cw.case_id = ?
    ");
    $stmt->execute([$case_id]);
    
    $weapons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Resposta de sucesso
    echo json_encode([
        'status' => 'success',
        'data' => $weapons,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Resposta de erro
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
?>