<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database configuration
$host = 'localhost';
$dbname = 'analisa';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if tables exist
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    // Try kasus_provinsi table first, fallback to 'data' table
    if (in_array('kasus_provinsi', $tables)) {
        $stmt = $pdo->query("
            SELECT 
                id_provinsi,
                provinsi,
                penyakit,
                minggu,
                tahun,
                jumlah_kasus
            FROM kasus_provinsi
            ORDER BY tahun DESC, minggu DESC
        ");
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ]);
        exit;
    }
    
    // Fallback to 'data' table
    if (in_array('data', $tables)) {
        $stmt = $pdo->query("
            SELECT 
                id_laporan as id_provinsi,
                Provinsi as provinsi,
                `Nama Penyakit` as penyakit,
                Minggu as minggu,
                Tahun as tahun,
                `Jml Kasus` as jumlah_kasus
            FROM data
            ORDER BY Tahun DESC, Minggu DESC
        ");
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $data,
            'count' => count($data),
            'source' => 'data_table'
        ]);
        exit;
    }
    
    // If no suitable table found
    echo json_encode([
        'success' => false,
        'message' => 'Table kasus_provinsi or data not found. Available: ' . implode(', ', $tables)
    ]);
    exit;
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
