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
                minggu,
                nama_penyakit as penyakit,
                tahun,
                SUM(jumlah_kasus) as jumlah_kasus
            FROM kasus_mingguan
            GROUP BY minggu, nama_penyakit, tahun
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
                Minggu as minggu,
                `Nama Penyakit` as nama_penyakit,
                `Nama Penyakit` as penyakit,
                Tahun as tahun,
                SUM(`Jml Kasus`) as jumlah_kasus
            FROM data
            GROUP BY Minggu, `Nama Penyakit`, Tahun
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

