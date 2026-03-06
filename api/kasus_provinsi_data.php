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
    
    // Use kasus_provinsi table
    if (in_array('kasus_provinsi', $tables)) {
        $stmt = $pdo->query("
            SELECT 
                provinsi,
                penyakit,
                tahun,
                SUM(jumlah_kasus) as jumlah_kasus
            FROM kasus_provinsi
            GROUP BY provinsi, penyakit, tahun
            ORDER BY tahun DESC
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
                Provinsi as provinsi,
                `Nama Penyakit` as penyakit,
                Tahun as tahun,
                SUM(`Jml Kasus`) as jumlah_kasus
            FROM data
            GROUP BY Provinsi, `Nama Penyakit`, Tahun
            ORDER BY tahun DESC
        ");
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'No suitable table found. Available: ' . implode(', ', $tables)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

