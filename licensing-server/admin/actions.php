<?php
// admin/actions.php
// AJAX API Actions handler for dashboard operations

require_once __DIR__ . '/../db_config.php';

// 1. Session Auth Check
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized access. Authentication required.']);
    exit;
}

header('Content-Type: application/json');

$action = isset($_GET['action']) ? trim($_GET['action']) : '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// Helper to generate formatted license keys: PX-XXXX-XXXX-XXXX-XXXX
function generate_license_key() {
    $bytes = random_bytes(8);
    $hex = strtoupper(bin2hex($bytes));
    return "PX-" . substr($hex, 0, 4) . "-" . substr($hex, 4, 4) . "-" . substr($hex, 8, 4) . "-" . substr($hex, 12, 4);
}

$db = get_db_connection();

try {
    switch ($action) {
        case 'create':
            $org_name      = isset($_POST['organization_name']) ? trim($_POST['organization_name']) : '';
            $duration_days = isset($_POST['duration_days']) ? intval($_POST['duration_days']) : 30;

            if (empty($org_name)) {
                http_response_code(400);
                echo json_encode(['error' => 'Organization name is required.']);
                exit;
            }

            // Start Transaction
            $db->beginTransaction();

            // 1. Resolve or Create Organization
            $stmt = $db->prepare("SELECT id FROM organizations WHERE name = ? LIMIT 1");
            $stmt->execute([$org_name]);
            $org = $stmt->fetch();

            if ($org) {
                $org_id = $org['id'];
            } else {
                $stmt = $db->prepare("INSERT INTO organizations (name, subscription_plan, status) VALUES (?, 'pro', 'active')");
                $stmt->execute([$org_name]);
                $org_id = $db->lastInsertId();
            }

            // 2. Generate and Insert License (fresh — no machine binding)
            $license_key = generate_license_key();

            if ($duration_days > 0) {
                $expires_at = date('Y-m-d H:i:s', strtotime("+$duration_days days"));
            } else {
                // 0 or negative means no expiry (permanent)
                $expires_at = null;
            }

            $stmt = $db->prepare(
                "INSERT INTO licenses (license_key, organization_id, role, status, expires_at, bound_machine_id, first_used_at)
                 VALUES (?, ?, 'org_admin', 'active', ?, NULL, NULL)"
            );
            $stmt->execute([$license_key, $org_id, $expires_at]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'License key generated successfully.',
                'license' => [
                    'license_key'       => $license_key,
                    'organization_name' => $org_name,
                    'expires_at'        => $expires_at ?? 'Never',
                    'bound_machine_id'  => null,
                    'first_used_at'     => null
                ]
            ]);
            break;

        case 'revoke':
            $license_id = isset($_POST['id']) ? intval($_POST['id']) : 0;

            $stmt = $db->prepare("SELECT role FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);
            $lic = $stmt->fetch();

            if (!$lic) {
                http_response_code(404);
                echo json_encode(['error' => 'License not found.']);
                exit;
            }

            if ($lic['role'] === 'global_admin') {
                http_response_code(400);
                echo json_encode(['error' => 'Global master license status cannot be revoked via individual controls.']);
                exit;
            }

            $stmt = $db->prepare("UPDATE licenses SET status = 'revoked' WHERE id = ?");
            $stmt->execute([$license_id]);

            echo json_encode(['success' => true, 'message' => 'License access revoked successfully.']);
            break;

        case 'reactivate':
            $license_id = isset($_POST['id']) ? intval($_POST['id']) : 0;

            $stmt = $db->prepare("SELECT * FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);
            $lic = $stmt->fetch();

            if (!$lic) {
                http_response_code(404);
                echo json_encode(['error' => 'License not found.']);
                exit;
            }

            // If reactivating, make sure it is not expired
            $status = 'active';
            if (!empty($lic['expires_at']) && strtotime($lic['expires_at']) < time()) {
                $status = 'expired';
            }

            $stmt = $db->prepare("UPDATE licenses SET status = ? WHERE id = ?");
            $stmt->execute([$status, $license_id]);

            $msg = ($status === 'expired')
                ? 'License reactivated, but remains marked as naturally EXPIRED.'
                : 'License reactivated and is now ACTIVE.';
            echo json_encode(['success' => true, 'message' => $msg, 'status' => $status]);
            break;

        case 'extend':
            $license_id = isset($_POST['id']) ? intval($_POST['id']) : 0;
            $days       = isset($_POST['days']) ? intval($_POST['days']) : 0;

            $stmt = $db->prepare("SELECT * FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);
            $lic = $stmt->fetch();

            if (!$lic) {
                http_response_code(404);
                echo json_encode(['error' => 'License not found.']);
                exit;
            }

            if ($lic['role'] === 'global_admin') {
                http_response_code(400);
                echo json_encode(['error' => 'Global master license cannot be extended.']);
                exit;
            }

            $current_expiry = strtotime($lic['expires_at']);
            $base_time      = ($current_expiry > time()) ? $current_expiry : time();
            $new_expiry     = date('Y-m-d H:i:s', strtotime("+$days days", $base_time));

            $stmt = $db->prepare("UPDATE licenses SET expires_at = ?, status = 'active' WHERE id = ?");
            $stmt->execute([$new_expiry, $license_id]);

            echo json_encode([
                'success'    => true,
                'message'    => "License extended by $days days.",
                'new_expiry' => $new_expiry
            ]);
            break;

        case 'delete':
            $license_id = isset($_POST['id']) ? intval($_POST['id']) : 0;

            $stmt = $db->prepare("SELECT role FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);
            $lic = $stmt->fetch();

            if (!$lic) {
                http_response_code(404);
                echo json_encode(['error' => 'License not found.']);
                exit;
            }

            if ($lic['role'] === 'global_admin') {
                http_response_code(400);
                echo json_encode(['error' => 'Global master license key cannot be deleted.']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);

            echo json_encode(['success' => true, 'message' => 'License deleted from system registry.']);
            break;

        case 'unbind':
            // Clear machine binding from a license (so a new machine can claim it)
            // Use this INSTEAD of revoke+regenerate if you just want to transfer to a new machine
            $license_id = isset($_POST['id']) ? intval($_POST['id']) : 0;

            $stmt = $db->prepare("SELECT role FROM licenses WHERE id = ?");
            $stmt->execute([$license_id]);
            $lic = $stmt->fetch();

            if (!$lic) {
                http_response_code(404);
                echo json_encode(['error' => 'License not found.']);
                exit;
            }

            if ($lic['role'] === 'global_admin') {
                http_response_code(400);
                echo json_encode(['error' => 'Global master license cannot be unbound.']);
                exit;
            }

            $stmt = $db->prepare("UPDATE licenses SET bound_machine_id = NULL, first_used_at = NULL WHERE id = ?");
            $stmt->execute([$license_id]);

            echo json_encode([
                'success' => true,
                'message' => 'Machine binding cleared. This license key can now be claimed by any machine.'
            ]);
            break;

        case 'toggle_kill':
            // Toggle Global Admin Master Kill Switch
            $stmt = $db->prepare("SELECT status FROM licenses WHERE role = 'global_admin' LIMIT 1");
            $stmt->execute();
            $global = $stmt->fetch();

            if (!$global) {
                http_response_code(404);
                echo json_encode(['error' => 'Global master license record not found.']);
                exit;
            }

            $new_status = ($global['status'] === 'active') ? 'revoked' : 'active';

            $stmt = $db->prepare("UPDATE licenses SET status = ? WHERE role = 'global_admin'");
            $stmt->execute([$new_status]);

            $msg = ($new_status === 'revoked')
                ? 'Global Master Kill Switch ACTIVATED. All grid clients suspended.'
                : 'Global Master Kill Switch DEACTIVATED. Normal grid operations restored.';
            echo json_encode(['success' => true, 'message' => $msg, 'new_status' => $new_status]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action requested.']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server database operation failed: ' . $e->getMessage()]);
}
