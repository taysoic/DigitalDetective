<?php

function handleGetNews($case_id) {
    if (!isset($case_id)) {
        jsonResponse(['error' => 'case_id parameter is required'], 400);
    }
    
    $case_id = intval($case_id);
    $pdo = getDBConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM noticias 
            WHERE case_id = ? 
            ORDER BY published_time DESC
        ");
        $stmt->execute([$case_id]);
        $news = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse([
            'success' => true,
            'news' => $news
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get news: ' . $e->getMessage()], 500);
    }
}
?>