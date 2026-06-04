<?php
/* ============================================================
   CHAOS CREATURES — DATABASE SCHEMA INSTALLATION UTILITY
   Generates all MariaDB tables and seeds initial spreadsheet data
   ============================================================ */

require_once 'config.php';

// Prevent accidental run if already installed. (Only allow run if table "users" doesn't exist, or they click install)
$pdo = get_db_connection();
$isInstalled = false;

try {
    $stmt = $pdo->query("SELECT 1 FROM users LIMIT 1");
    if ($stmt) {
        $isInstalled = true;
    }
} catch (Exception $e) {
    // Users table does not exist, safe to run installation
}

if ($isInstalled && (!isset($_POST['force_install']) || $_POST['force_install'] !== 'yes')) {
    echo '<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Chaos Creatures · Database Installed</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
            body { font-family: "Inter", sans-serif; background: #06080d; color: #e8ecf2; text-align: center; padding: 50px; }
            .card { background: #111520; border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; max-width: 500px; margin: 0 auto; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { font-family: "Outfit", sans-serif; color: #22c55e; margin-bottom: 20px; }
            p { color: #8894a8; margin-bottom: 30px; line-height: 1.6; }
            .btn { background: #ef4444; color: #06080d; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Database Already Configured</h1>
            <p>The MariaDB tables are already set up and configured. Running the installer again will overwrite all existing animal care logs, feedings, pairings, and user profiles.</p>
            <form method="POST">
                <input type="hidden" name="force_install" value="yes">
                <button type="submit" class="btn">Force Re-Installation (Warning: Overwrites All Data)</button>
            </form>
        </div>
    </body>
    </html>';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['install']) && $_POST['install'] === 'start') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<pre style="background:#06080d; color:#22c55e; padding:20px; font-family:monospace; font-size:14px; border-radius:10px;">';
    echo "Starting Installation...\n";

    try {
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // 1. Drop existing tables
        echo "Dropping existing tables if they exist...\n";
        $tables = ['users', 'animals', 'health_notes', 'feedings', 'weight', 'pairings', 'eggs', 'hatchlings', 'rats', 'expenses'];
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        foreach ($tables as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `$t` cascade;");
        }
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

        // 2. Create tables
        echo "Creating table: users...\n";
        $pdo->exec("CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) NOT NULL
        ) ENGINE=InnoDB;");

        echo "Creating table: animals...\n";
        $pdo->exec("CREATE TABLE animals (
            animal_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            species VARCHAR(100) NOT NULL,
            gene_1 VARCHAR(100),
            gene_2 VARCHAR(100),
            gene_3 VARCHAR(100),
            hets_poss_hets VARCHAR(255),
            sex VARCHAR(20) NOT NULL,
            hatch_date DATE,
            weight VARCHAR(50),
            status VARCHAR(100) NOT NULL,
            rack_tub VARCHAR(50),
            last_fed VARCHAR(50),
            notes TEXT,
            feeding_alert VARCHAR(50),
            growth_trend VARCHAR(50)
        ) ENGINE=InnoDB;");

        echo "Creating table: health_notes...\n";
        $pdo->exec("CREATE TABLE health_notes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE,
            animal_id VARCHAR(50) NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            details_notes TEXT,
            photo_link VARCHAR(255),
            handled_by VARCHAR(50),
            FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;");

        echo "Creating table: feedings...\n";
        $pdo->exec("CREATE TABLE feedings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            animal_id VARCHAR(100) NOT NULL,
            food_item VARCHAR(100) NOT NULL,
            size VARCHAR(50),
            accepted VARCHAR(10) NOT NULL,
            notes TEXT
        ) ENGINE=InnoDB;");

        echo "Creating table: weight...\n";
        $pdo->exec("CREATE TABLE weight (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            animal_id VARCHAR(100) NOT NULL,
            weight_g DECIMAL(10,2) NOT NULL,
            notes TEXT
        ) ENGINE=InnoDB;");

        echo "Creating table: pairings...\n";
        $pdo->exec("CREATE TABLE pairings (
            pairing_id VARCHAR(50) PRIMARY KEY,
            male_id VARCHAR(50) NOT NULL,
            female_id VARCHAR(50) NOT NULL,
            species VARCHAR(100) NOT NULL,
            start_date DATE,
            locks_seen TEXT,
            ovulation DATE,
            lay_date DATE,
            notes TEXT
        ) ENGINE=InnoDB;");

        echo "Creating table: eggs...\n";
        $pdo->exec("CREATE TABLE eggs (
            clutch_id VARCHAR(50) PRIMARY KEY,
            pairing_id VARCHAR(50),
            sire VARCHAR(50),
            dam VARCHAR(50),
            eggs INT NOT NULL,
            slugs INT NOT NULL DEFAULT 0,
            incubation_start DATE,
            expected_hatch DATE,
            hatch_date DATE,
            notes TEXT
        ) ENGINE=InnoDB;");

        echo "Creating table: hatchlings...\n";
        $pdo->exec("CREATE TABLE hatchlings (
            baby_id VARCHAR(50) PRIMARY KEY,
            clutch_id VARCHAR(50) NOT NULL,
            egg_number INT,
            actual_morph VARCHAR(150),
            sex VARCHAR(20),
            hatch_date DATE,
            first_meal DATE,
            status VARCHAR(100),
            price DECIMAL(10,2),
            FOREIGN KEY (clutch_id) REFERENCES eggs(clutch_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;");

        echo "Creating table: rats...\n";
        $pdo->exec("CREATE TABLE rats (
            rat_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            colony VARCHAR(100) NOT NULL,
            sex VARCHAR(20) NOT NULL,
            birth_date DATE,
            breeding_status VARCHAR(100) NOT NULL,
            litters_produced INT DEFAULT 0,
            notes TEXT
        ) ENGINE=InnoDB;");

        echo "Creating table: expenses...\n";
        $pdo->exec("CREATE TABLE expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            category VARCHAR(100) NOT NULL,
            item VARCHAR(255) NOT NULL,
            cost DECIMAL(10,2) NOT NULL,
            vendor VARCHAR(150) NOT NULL,
            notes TEXT
        ) ENGINE=InnoDB;");

        // 3. Create Default User Accounts
        echo "Generating secure admin & handler credentials...\n";
        $users = [
            ['Admin', password_hash('chaoscreatures', PASSWORD_DEFAULT), 'System Owner'],
            ['Handler A', password_hash('handlerA123', PASSWORD_DEFAULT), 'Lead Breeder'],
            ['Handler B', password_hash('handlerB123', PASSWORD_DEFAULT), 'Facility Assistant']
        ];
        $userStmt = $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
        foreach ($users as $u) {
            $userStmt->execute($u);
        }
        echo "  Default users inserted successfully.\n";

        // 4. Seed Spreadsheet Initial Data
        $jsonPath = __DIR__ . '/../admin/initial_data.json';
        if (file_exists($jsonPath)) {
            echo "Loading initial_data.json from disk...\n";
            $initialData = json_decode(file_get_contents($jsonPath), true);
            
            // Seed Animals
            if (!empty($initialData['Animals'])) {
                echo "Seeding " . count($initialData['Animals']) . " animals...\n";
                $stmt = $pdo->prepare("INSERT INTO animals (animal_id, name, species, gene_1, gene_2, gene_3, hets_poss_hets, sex, hatch_date, weight, status, rack_tub, last_fed, notes, feeding_alert, growth_trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Animals'] as $a) {
                    $stmt->execute([
                        $a['Animal ID'], $a['Name'] ?? null, $a['Species'],
                        $a['Gene 1'] ?? null, $a['Gene 2'] ?? null, $a['Gene 3'] ?? null,
                        $a['Hets / Poss Hets'] ?? null, $a['Sex'], $a['Hatch Date'] ?? null,
                        $a['Weight'] ?? 'No Wt', $a['Status'], $a['Rack/Tub'] ?? null,
                        $a['Last Fed'] ?? 'Never', $a['Notes'] ?? null,
                        $a['Feeding Alert'] ?? 'Hungry', $a['Growth Trend'] ?? 'No Data'
                    ]);
                }
            }

            // Seed Feedings
            if (!empty($initialData['Feedings'])) {
                echo "Seeding " . count($initialData['Feedings']) . " feedings...\n";
                $stmt = $pdo->prepare("INSERT INTO feedings (date, animal_id, food_item, size, accepted, notes) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Feedings'] as $f) {
                    $stmt->execute([
                        $f['Date'], $f['Animal ID'], $f['Food Item'],
                        $f['Size'] ?? null, $f['Accepted?'] ?? 'Yes', $f['Notes'] ?? null
                    ]);
                }
            }

            // Seed Weight
            if (!empty($initialData['Weight'])) {
                echo "Seeding " . count($initialData['Weight']) . " weight logs...\n";
                $stmt = $pdo->prepare("INSERT INTO weight (date, animal_id, weight_g, notes) VALUES (?, ?, ?, ?)");
                foreach ($initialData['Weight'] as $w) {
                    $stmt->execute([
                        $w['Date'], $w['Animal ID'], $w['Weight (g)'], $w['Notes'] ?? null
                    ]);
                }
            }

            // Seed Pairings
            if (!empty($initialData['Pairings'])) {
                echo "Seeding " . count($initialData['Pairings']) . " pairings...\n";
                $stmt = $pdo->prepare("INSERT INTO pairings (pairing_id, male_id, female_id, species, start_date, locks_seen, ovulation, lay_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Pairings'] as $p) {
                    $stmt->execute([
                        $p['Pairing ID'], $p['Male ID'], $p['Female ID'], $p['Species'],
                        $p['Start Date'] ?? null, $p['Locks Seen'] ?? null,
                        $p['Ovulation'] ?? null, $p['Lay Date'] ?? null, $p['Notes'] ?? null
                    ]);
                }
            }

            // Seed Eggs
            if (!empty($initialData['Eggs'])) {
                echo "Seeding egg clutches...\n";
                $stmt = $pdo->prepare("INSERT INTO eggs (clutch_id, pairing_id, sire, dam, eggs, slugs, incubation_start, expected_hatch, hatch_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Eggs'] as $e) {
                    $stmt->execute([
                        $e['Clutch ID'], $e['Pairing ID'] ?? null, $e['Sire (Father)'] ?? null,
                        $e['Dam (Mother)'] ?? null, $e['Eggs'], $e['Slugs'] ?? 0,
                        $e['Incubation Start'] ?? null, $e['Expected Hatch'] ?? null,
                        $e['Hatch Date'] ?? null, $e['Notes'] ?? null
                    ]);
                }
            }

            // Seed Hatchlings
            if (!empty($initialData['Hatchlings'])) {
                echo "Seeding hatchlings...\n";
                $stmt = $pdo->prepare("INSERT INTO hatchlings (baby_id, clutch_id, egg_number, actual_morph, sex, hatch_date, first_meal, status, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Hatchlings'] as $hl) {
                    $stmt->execute([
                        $hl['Baby ID'], $hl['Clutch ID'], $hl['Egg #'] ?? null,
                        $hl['Actual Morph'] ?? null, $hl['Sex'] ?? null,
                        $hl['Hatch Date'] ?? null, $hl['First Meal'] ?? null,
                        $hl['Status'] ?? null, $hl['Price'] ?? null
                    ]);
                }
            }

            // Seed Rats
            if (!empty($initialData['Rats'])) {
                echo "Seeding " . count($initialData['Rats']) . " feeder rats...\n";
                $stmt = $pdo->prepare("INSERT INTO rats (rat_id, name, colony, sex, birth_date, breeding_status, litters_produced, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Rats'] as $r) {
                    $stmt->execute([
                        $r['Rat ID'], $r['Name'] ?? null, $r['Colony'], $r['Sex'],
                        $r['Birth Date'] ?? null, $r['Breeding Status'],
                        $r['Litters Produced'] ?? 0, $r['Notes'] ?? null
                    ]);
                }
            }

            // Seed Expenses
            if (!empty($initialData['Expenses'])) {
                echo "Seeding " . count($initialData['Expenses']) . " expense records...\n";
                $stmt = $pdo->prepare("INSERT INTO expenses (date, category, item, cost, vendor, notes) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($initialData['Expenses'] as $ex) {
                    $stmt->execute([
                        $ex['Date'], $ex['Category'], $ex['Item'], $ex['Cost'],
                        $ex['Vendor'], $ex['Notes'] ?? null
                    ]);
                }
            }
        } else {
            echo "Warning: initial_data.json not found. Database created but tables are empty.\n";
        }

        echo "\nDatabase Installation Completed Successfully!\n";
        echo "You can now sign in to the Administrative Portal using your default accounts.\n";
    } catch (Exception $err) {
        echo "\nDATABASE INSTALLATION ERROR: " . $err->getMessage() . "\n";
    }
    echo '</pre>';
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chaos Creatures · Database Setup</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: "Inter", sans-serif; background: #06080d; color: #e8ecf2; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #111520; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; max-width: 600px; width: 100%; padding: 40px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
        h1 { font-family: "Outfit", sans-serif; font-size: 2rem; font-weight: 800; color: #22c55e; margin-bottom: 12px; }
        h2 { font-size: 1.1rem; color: #8894a8; margin-bottom: 24px; font-weight: 500; }
        p { color: #8894a8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px; }
        .alert { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; padding: 16px; border-radius: 8px; font-size: 0.9rem; line-height: 1.5; margin-bottom: 30px; }
        .btn-install { background: #22c55e; color: #06080d; font-weight: 600; padding: 14px 28px; border-radius: 8px; cursor: pointer; width: 100%; border: none; font-size: 1rem; transition: background 0.2s; }
        .btn-install:hover { background: #4ade80; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Database Initial Setup Utility</h1>
        <h2>Chaos Creatures Breeding Facility Portal</h2>
        
        <p>This utility will connect to your IONOS MariaDB database using the configuration in <strong>api/config.php</strong>, auto-generate all required database tables, hash default handler passwords, and seed your historical husbandry data.</p>
        
        <div class="alert">
            <strong>⚠️ IMPORTANT:</strong> If you force re-installation on an active database, all custom logging history (feedings, weights, health updates) logged in this portal will be overwritten with the spreadsheet defaults.
        </div>
        
        <form method="POST">
            <input type="hidden" name="install" value="start">
            <button type="submit" class="btn-install">Run Installation &amp; Seed Database ➔</button>
        </form>
    </div>
</body>
</html>
