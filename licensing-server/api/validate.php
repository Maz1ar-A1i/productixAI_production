<?php
// api/validate.php
// Central licensing verification API

require_once __DIR__ . '/../db_config.php';

// Allow CORS from any origin for this endpoint
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-License-Signature");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ensure it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// 1. Parse JSON POST Request Input
$input_raw = file_get_contents('php://input');
$input = json_decode($input_raw, true);

if (!isset($input['licenseKey'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing licenseKey parameter']);
    exit;
}

$licenseKey = trim($input['licenseKey']);
$machineId  = isset($input['machineId']) ? trim($input['machineId']) : null;

// Get Database Connection
$db = get_db_connection();

// Initialize variables for payload
$valid        = false;
$reason       = 'REVOKED';
$expiresAtVal = null;

try {
    // ── Step 1: Check Global Admin License Status First (Master Kill Switch) ──
    $stmt = $db->prepare("SELECT * FROM licenses WHERE role = 'global_admin' LIMIT 1");
    $stmt->execute();
    $global_admin_license = $stmt->fetch();

    if ($global_admin_license && $global_admin_license['status'] === 'revoked') {
        // Master kill switch is active — suspend all operations
        $valid        = false;
        $reason       = 'SYSTEM_SUSPENDED';
        $expiresAtVal = null;
    } else {
        // ── Step 2: Validate the Individual License Key ──
        $stmt = $db->prepare("SELECT * FROM licenses WHERE license_key = ? LIMIT 1");
        $stmt->execute([$licenseKey]);
        $license_record = $stmt->fetch();

        if (!$license_record) {
            $valid        = false;
            $reason       = 'REVOKED';
            $expiresAtVal = null;
        } elseif ($license_record['status'] === 'revoked') {
            $valid  = false;
            $reason = 'REVOKED';
            if (!empty($license_record['expires_at'])) {
                $expiresAtVal = str_replace(' ', 'T', $license_record['expires_at']);
            }
        } else {
            // Check expiry
            $is_expired = false;
            if (!empty($license_record['expires_at'])) {
                $expiresAtVal  = str_replace(' ', 'T', $license_record['expires_at']);
                $expiry_time   = strtotime($license_record['expires_at']);
                if ($expiry_time < time()) {
                    $is_expired = true;
                }
            }

            if ($is_expired) {
                // License has expired naturally
                $valid  = false;
                $reason = 'EXPIRED';

                // Update status to expired in the DB for data consistency
                $update_stmt = $db->prepare("UPDATE licenses SET status = 'expired' WHERE id = ?");
                $update_stmt->execute([$license_record['id']]);
            } else {
                // ── Step 3: OTP Machine-Binding Check ──
                // global_admin keys are exempt from machine binding
                if ($license_record['role'] !== 'global_admin' && !empty($machineId)) {
                    $bound_machine = $license_record['bound_machine_id'];

                    if (empty($bound_machine)) {
                        // ── First use: bind this key to this machine permanently ──
                        $bind_stmt = $db->prepare(
                            "UPDATE licenses SET bound_machine_id = ?, first_used_at = NOW() WHERE id = ?"
                        );
                        $bind_stmt->execute([$machineId, $license_record['id']]);
                        // License is valid — continue to ACTIVE below
                    } elseif ($bound_machine !== $machineId) {
                        // ── Key already claimed by a different machine — REJECT ──
                        $valid  = false;
                        $reason = 'MACHINE_MISMATCH';
                        if (!empty($license_record['expires_at'])) {
                            $expiresAtVal = str_replace(' ', 'T', $license_record['expires_at']);
                        }
                        // Skip to response — don't fall through to ACTIVE
                        goto build_response;
                    }
                    // Else: bound_machine === machineId — same machine, allow
                }

                // License is active and valid!
                $valid  = true;
                $reason = 'ACTIVE';
            }
        }
    }

    build_response:

    // ── Step 4: Serialize and cryptographically sign the response ──
    // Key order must match Python's json.dumps(res, sort_keys=True):
    // 1. expiresAt  2. reason  3. valid
    if ($expiresAtVal === null) {
        $serialized = '{"expiresAt": null, "reason": "' . $reason . '", "valid": ' . ($valid ? 'true' : 'false') . '}';
    } else {
        $serialized = '{"expiresAt": "' . $expiresAtVal . '", "reason": "' . $reason . '", "valid": ' . ($valid ? 'true' : 'false') . '}';
    }

    $signature = hash_hmac('sha256', $serialized, LICENSE_SIGNING_KEY);

    // Send the signature in the custom X-License-Signature response header
    header('X-License-Signature: ' . $signature);
    header('Content-Type: application/json');

    echo json_encode([
        'valid'     => $valid,
        'reason'    => $reason,
        'expiresAt' => $expiresAtVal,
        'signature' => $signature
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'valid'   => false,
        'reason'  => 'INTERNAL_SERVER_ERROR',
        'details' => $e->getMessage()
    ]);
}
