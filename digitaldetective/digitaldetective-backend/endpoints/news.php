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
        // Buscar notícias do caso
        $stmt = $pdo->prepare("
            SELECT * FROM noticias 
            WHERE case_id = ? 
            ORDER BY published_time DESC
        ");
        $stmt->execute([$case_id]);
        $news = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Se não há notícias, gerar algumas padrão
        if (empty($news)) {
            $default_news = generateDefaultNews($case_id, $pdo);
            jsonResponse([
                'success' => true,
                'news' => $default_news
            ]);
        } else {
            jsonResponse([
                'success' => true,
                'news' => $news
            ]);
        }
        
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to get news: ' . $e->getMessage()], 500);
    }
}

function generateDefaultNews($case_id, $pdo) {
    // Buscar informações do caso
    $stmt = $pdo->prepare("SELECT * FROM casos WHERE case_id = ?");
    $stmt->execute([$case_id]);
    $case_info = $stmt->fetch();
    
    if (!$case_info) {
        return [];
    }
    
    $default_news = [
        [
            'news_id' => 1,
            'case_id' => $case_id,
            'headline' => 'TEMPESTADE ISOLA MANSÃO BLACKWOOD',
            'content' => 'Uma forte tempestade isolou completamente a Mansão Blackwood na noite passada. Todas as estradas de acesso estão bloqueadas e as linhas telefônicas foram derrubadas.',
            'published_time' => date('Y-m-d H:i:s', strtotime('-2 hours')),
            'priority' => 'high'
        ],
        [
            'news_id' => 2,
            'case_id' => $case_id,
            'headline' => 'MORTE MISTERIOSA NA MANSÃO BLACKWOOD',
            'content' => 'Lord Edmund Blackwood, 48 anos, foi encontrado morto em seu escritório. A polícia trata o caso como homicídio. Várias pessoas estavam presentes na mansão no momento do crime.',
            'published_time' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            'priority' => 'urgent'
        ],
        [
            'news_id' => 3,
            'case_id' => $case_id,
            'headline' => 'INVESTIGAÇÃO REMOTA AUTORIZADA',
            'content' => 'Devido ao isolamento causado pela tempestade, as autoridades autorizaram uma investigação remota do caso Blackwood. Um detetive especializado conduzirá a investigação à distância.',
            'published_time' => date('Y-m-d H:i:s', strtotime('-30 minutes')),
            'priority' => 'medium'
        ],
        [
            'news_id' => 4,
            'case_id' => $case_id,
            'headline' => 'FAMÍLIA BLACKWOOD SOB SUSPEITA',
            'content' => 'Fontes próximas à investigação revelam que membros da família Blackwood estão entre os principais suspeitos. Questões sobre herança e dívidas familiares podem estar envolvidas.',
            'published_time' => date('Y-m-d H:i:s', strtotime('-15 minutes')),
            'priority' => 'medium'
        ]
    ];
    
    // Inserir notícias no banco de dados
    foreach ($default_news as $news) {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO noticias (news_id, case_id, headline, content, published_time, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $news['news_id'],
            $news['case_id'],
            $news['headline'],
            $news['content'],
            $news['published_time'],
            $news['priority']
        ]);
    }
    
    return $default_news;
}
?>