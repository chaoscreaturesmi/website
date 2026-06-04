<?php
/* ============================================================
   CHAOS CREATURES — REST HUSBANDRY DATA API
   Fetches entire DB schema and inserts new care log entries
   ============================================================ */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow CORS for local dev servers
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Secure Gate: Check if user is signed in
if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Please login first.']);
    exit;
}

$pdo = get_db_connection();
$action = $_GET['action'] ?? '';

// GET REQUEST: Dumps all tables in the exact format initial_data.json used
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $data = [];
        
        // 1. Fetch Animals
        $stmt = $pdo->query("SELECT * FROM animals");
        $data['Animals'] = [];
        while ($r = $stmt->fetch()) {
            $data['Animals'][] = [
                'Animal ID' => $r['animal_id'],
                'Name' => $r['name'],
                'Species' => $r['species'],
                'Gene 1' => $r['gene_1'],
                'Gene 2' => $r['gene_2'],
                'Gene 3' => $r['gene_3'],
                'Hets / Poss Hets' => $r['hets_poss_hets'],
                'Sex' => $r['sex'],
                'Hatch Date' => $r['hatch_date'],
                'Weight' => $r['weight'],
                'Status' => $r['status'],
                'Rack/Tub' => $r['rack_tub'],
                'Last Fed' => $r['last_fed'],
                'Notes' => $r['notes'],
                'Feeding Alert' => $r['feeding_alert'],
                'Growth Trend' => $r['growth_trend']
            ];
        }

        // 2. Fetch Feedings
        $stmt = $pdo->query("SELECT * FROM feedings");
        $data['Feedings'] = [];
        while ($r = $stmt->fetch()) {
            $data['Feedings'][] = [
                'Date' => $r['date'],
                'Animal ID' => $r['animal_id'],
                'Food Item' => $r['food_item'],
                'Size' => $r['size'],
                'Accepted?' => $r['accepted'],
                'Notes' => $r['notes']
            ];
        }

        // 3. Fetch Weights
        $stmt = $pdo->query("SELECT * FROM weight");
        $data['Weight'] = [];
        while ($r = $stmt->fetch()) {
            $data['Weight'][] = [
                'Date' => $r['date'],
                'Animal ID' => $r['animal_id'],
                'Weight (g)' => (float)$r['weight_g'],
                'Notes' => $r['notes']
            ];
        }

        // 4. Fetch Health Notes
        $stmt = $pdo->query("SELECT * FROM health_notes");
        $data['Health Notes'] = [];
        while ($r = $stmt->fetch()) {
            $data['Health Notes'][] = [
                'Date' => $r['date'],
                'Animal ID' => $r['animal_id'],
                'Event Type' => $r['event_type'],
                'Details / Notes' => $r['details_notes'],
                'Photo Link (optional)' => $r['photo_link'],
                'Handled by' => $r['handled_by']
            ];
        }

        // 5. Fetch Pairings
        $stmt = $pdo->query("SELECT * FROM pairings");
        $data['Pairings'] = [];
        while ($r = $stmt->fetch()) {
            $data['Pairings'][] = [
                'Pairing ID' => $r['pairing_id'],
                'Male ID' => $r['male_id'],
                'Female ID' => $r['female_id'],
                'Species' => $r['species'],
                'Start Date' => $r['start_date'],
                'Locks Seen' => $r['locks_seen'],
                'Ovulation' => $r['ovulation'],
                'Lay Date' => $r['lay_date'],
                'Notes' => $r['notes']
            ];
        }

        // 6. Fetch Eggs
        $stmt = $pdo->query("SELECT * FROM eggs");
        $data['Eggs'] = [];
        while ($r = $stmt->fetch()) {
            $data['Eggs'][] = [
                'Clutch ID' => $r['clutch_id'],
                'Pairing ID' => $r['pairing_id'],
                'Sire (Father)' => $r['sire'],
                'Dam (Mother)' => $r['dam'],
                'Eggs' => (int)$r['eggs'],
                'Slugs' => (int)$r['slugs'],
                'Incubation Start' => $r['incubation_start'],
                'Expected Hatch' => $r['expected_hatch'],
                'Hatch Date' => $r['hatch_date'],
                'Notes' => $r['notes']
            ];
        }

        // 7. Fetch Hatchlings
        $stmt = $pdo->query("SELECT * FROM hatchlings");
        $data['Hatchlings'] = [];
        while ($r = $stmt->fetch()) {
            $data['Hatchlings'][] = [
                'Baby ID' => $r['baby_id'],
                'Clutch ID' => $r['clutch_id'],
                'Egg #' => (int)$r['egg_number'],
                'Actual Morph' => $r['actual_morph'],
                'Sex' => $r['sex'],
                'Hatch Date' => $r['hatch_date'],
                'First Meal' => $r['first_meal'],
                'Status' => $r['status'],
                'Price' => $r['price'] !== null ? (float)$r['price'] : null
            ];
        }

        // 8. Fetch Rats
        $stmt = $pdo->query("SELECT * FROM rats");
        $data['Rats'] = [];
        while ($r = $stmt->fetch()) {
            $data['Rats'][] = [
                'Rat ID' => $r['rat_id'],
                'Name' => $r['name'],
                'Colony' => $r['colony'],
                'Sex' => $r['sex'],
                'Birth Date' => $r['birth_date'],
                'Breeding Status' => $r['breeding_status'],
                'Litters Produced' => (int)$r['litters_produced'],
                'Notes' => $r['notes']
            ];
        }

        // 9. Fetch Expenses
        $stmt = $pdo->query("SELECT * FROM expenses");
        $data['Expenses'] = [];
        while ($r = $stmt->fetch()) {
            $data['Expenses'][] = [
                'Date' => $r['date'],
                'Category' => $r['category'],
                'Item' => $r['item'],
                'Cost' => (float)$r['cost'],
                'Vendor' => $r['vendor'],
                'Notes' => $r['notes']
            ];
        }

        // Fetch helper reference lists (static reads from local fallback is fine, but we populate from memory)
        $jsonPath = __DIR__ . '/../admin/initial_data.json';
        if (file_exists($jsonPath)) {
            $initialData = json_decode(file_get_contents($jsonPath), true);
            $data['Dropdown Helper'] = $initialData['Dropdown Helper'] ?? [];
            $data['Morph Lists'] = $initialData['Morph Lists'] ?? [];
        } else {
            $data['Dropdown Helper'] = [];
            $data['Morph Lists'] = [];
        }

        echo json_encode($data);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

// POST REQUEST: Inserts record to specific SQL Table
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'append') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $sheetName = $input['sheetName'] ?? '';
        $row = $input['rowData'] ?? [];

        if (empty($sheetName) || empty($row)) {
            echo json_encode(['status' => 'error', 'message' => 'Sheet name and row data are required']);
            exit;
        }

        switch ($sheetName) {
            case 'Animals':
                $stmt = $pdo->prepare("INSERT INTO animals (animal_id, name, species, gene_1, gene_2, gene_3, hets_poss_hets, sex, hatch_date, weight, status, rack_tub, last_fed, notes, feeding_alert, growth_trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Animal ID'], $row['Name'] ?? null, $row['Species'],
                    $row['Gene 1'] ?? null, $row['Gene 2'] ?? null, $row['Gene 3'] ?? null,
                    $row['Hets / Poss Hets'] ?? null, $row['Sex'], $row['Hatch Date'] ?? null,
                    $row['Weight'] ?? 'No Wt', $row['Status'], $row['Rack/Tub'] ?? null,
                    $row['Last Fed'] ?? 'Never', $row['Notes'] ?? null,
                    $row['Feeding Alert'] ?? 'Hungry', $row['Growth Trend'] ?? 'No Data'
                ]);
                break;

            case 'Feedings':
                $stmt = $pdo->prepare("INSERT INTO feedings (date, animal_id, food_item, size, accepted, notes) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Date'], $row['Animal ID'], $row['Food Item'],
                    $row['Size'] ?? null, $row['Accepted?'], $row['Notes'] ?? null
                ]);
                break;

            case 'Weight':
                $stmt = $pdo->prepare("INSERT INTO weight (date, animal_id, weight_g, notes) VALUES (?, ?, ?, ?)");
                $stmt->execute([
                    $row['Date'], $row['Animal ID'], (float)$row['Weight (g)'], $row['Notes'] ?? null
                ]);
                break;

            case 'Health Notes':
                $stmt = $pdo->prepare("INSERT INTO health_notes (date, animal_id, event_type, details_notes, photo_link, handled_by) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Date'] ?? null, $row['Animal ID'], $row['Event Type'],
                    $row['Details / Notes'], $row['Photo Link (optional)'] ?? null,
                    $row['Handled by'] ?? $_SESSION['username']
                ]);
                break;

            case 'Pairings':
                $stmt = $pdo->prepare("INSERT INTO pairings (pairing_id, male_id, female_id, species, start_date, locks_seen, ovulation, lay_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Pairing ID'], $row['Male ID'], $row['Female ID'], $row['Species'],
                    $row['Start Date'] ?? null, $row['Locks Seen'] ?? null,
                    $row['Ovulation'] ?? null, $row['Lay Date'] ?? null, $row['Notes'] ?? null
                ]);
                break;

            case 'Eggs':
                $stmt = $pdo->prepare("INSERT INTO eggs (clutch_id, pairing_id, sire, dam, eggs, slugs, incubation_start, expected_hatch, hatch_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Clutch ID'], $row['Pairing ID'] ?? null, $row['Sire (Father)'] ?? null,
                    $row['Dam (Mother)'] ?? null, (int)$row['Eggs'], (int)($row['Slugs'] ?? 0),
                    $row['Incubation Start'] ?? null, $row['Expected Hatch'] ?? null,
                    $row['Hatch Date'] ?? null, $row['Notes'] ?? null
                ]);
                break;

            case 'Hatchlings':
                $stmt = $pdo->prepare("INSERT INTO hatchlings (baby_id, clutch_id, egg_number, actual_morph, sex, hatch_date, first_meal, status, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Baby ID'], $row['Clutch ID'], (int)$row['Egg #'],
                    $row['Actual Morph'] ?? null, $row['Sex'] ?? null,
                    $row['Hatch Date'] ?? null, $row['First Meal'] ?? null,
                    $row['Status'] ?? null, $row['Price'] !== null ? (float)$row['Price'] : null
                ]);
                break;

            case 'Rats':
                $stmt = $pdo->prepare("INSERT INTO rats (rat_id, name, colony, sex, birth_date, breeding_status, litters_produced, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Rat ID'], $row['Name'] ?? null, $row['Colony'], $row['Sex'],
                    $row['Birth Date'] ?? null, $row['Breeding Status'],
                    (int)($row['Litters Produced'] ?? 0), $row['Notes'] ?? null
                ]);
                break;

            case 'Expenses':
                $stmt = $pdo->prepare("INSERT INTO expenses (date, category, item, cost, vendor, notes) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $row['Date'], $row['Category'], $row['Item'], (float)$row['Cost'],
                    $row['Vendor'], $row['Notes'] ?? null
                ]);
                break;

            default:
                echo json_encode(['status' => 'error', 'message' => 'Table not supported for insertion']);
                exit;
        }

        echo json_encode(['status' => 'success', 'message' => 'Record successfully inserted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Invalid Request']);
?>
