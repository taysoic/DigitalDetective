<?php
// Configuração do banco de dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'digitaldetective');
define('DB_USER', 'root');
define('DB_PASS', 'digitaldetective123');
define('DB_CHARSET', 'utf8mb4');

// Configurações gerais
define('API_VERSION', '1.0');
define('CORS_ORIGIN', '*');

// Configurações de tempo
define('EMAIL_DELAY_MIN', 60); // 1 minuto em segundos
define('EMAIL_DELAY_MAX', 300); // 5 minutos em segundos

// Headers CORS
function setCorsHeaders() {
    header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Função para conectar ao banco de dados
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

// Função para resposta JSON
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Função para validar entrada JSON
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(['error' => 'Invalid JSON input'], 400);
    }
    
    return $data;
}
?>

