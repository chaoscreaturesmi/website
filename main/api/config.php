<?php
/* ============================================================
   CHAOS CREATURES — DATABASE CONFIGURATION FILE
   IONOS MariaDB connection parameters
   ============================================================ */

define('DB_HOST', 'db5020613735.hosting-data.io');
define('DB_PORT', '3306');
define('DB_NAME', 'dbs15751025'); // The corrected database name
define('DB_USER', 'dbu5561476');
define('DB_PASS', 'Dqp85D2CQ!Jdi6X');

// Set PHP Session configuration for security
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    // If running on HTTPS, enable secure cookies
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// Function to establish a PDO Database Connection
function get_db_connection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // Return JSON error response if database connection fails
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit;
    }
}
?>
