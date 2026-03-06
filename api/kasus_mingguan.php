<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
    
    // Try kasus_mingguan table first
    if (in_array('kasus_mingguan', $tables)) {
        $stmt = $pdo->query("
            SELECT 
                k.id_kasus,
                k.id_penyakit,
                p.nama_penyakit,
                k.tahun,
                k.minggu,
                k.jumlah_kasus
            FROM kasus_mingguan k
            JOIN penyakit p ON k.id_penyakit = p.id_penyakit
            ORDER BY k.tahun DESC, k.minggu DESC
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
                id_laporan as id_kasus,
                NULL as id_penyakit,
                `Nama Penyakit` as nama_penyakit,
                Tahun as tahun,
                Minggu as minggu,
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
    
    // If no table found
    echo json_encode([
        'success' => false,
        'message' => 'No suitable table found in database'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

