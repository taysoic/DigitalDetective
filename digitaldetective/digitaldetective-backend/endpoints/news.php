<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['case_id'])) {
        jsonResponse(['error' => 'case_id parameter is required'], 400);
    }
    
    $case_id = intval($_GET['case_id']);
    handleGetNews($case_id);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGetNews($case_id) {
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM noticias 
            WHERE case_id = ? 
            ORDER BY published_time DESC
        ");
        $stmt->execute([$case_id]);
        $news = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Apenas retorna o que estiver na base
        jsonResponse([
            'success' => true,
            'news' => $news
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get news: ' . $e->getMessage()], 500);
    }
}

function getDBConnection() {
    $host = 'localhost';
    $db = 'digitaldetective';
    $user   = 'root';
    $pass   = '';
    $charset = 'utf8mb4';
    
    
}
?>