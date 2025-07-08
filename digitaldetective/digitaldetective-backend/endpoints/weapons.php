<?php
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $case_id = $_GET['case_id'] ?? null;
    if (!$case_id) {
        jsonResponse(['error' => 'Missing case_id'], 400);
    }

    $pdo = getDBConnection();
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
        'weapons' => $weapons
    ]);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
?>