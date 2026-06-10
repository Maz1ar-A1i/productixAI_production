<?php
// admin/index.php
// Main Licensing Server Administrator Dashboard

require_once __DIR__ . '/../db_config.php';

// Auth Protection
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

$db = get_db_connection();

try {
    // 1. Fetch Global Admin Master Kill Switch Status
    $stmt = $db->query("SELECT status FROM licenses WHERE role = 'global_admin' LIMIT 1");
    $global_key = $stmt->fetch();
    $master_kill_active = ($global_key && $global_key['status'] === 'revoked');

    // 2. Fetch stats
    $total_count   = $db->query("SELECT COUNT(*) FROM licenses WHERE role != 'global_admin'")->fetchColumn();
    $active_count  = $db->query("SELECT COUNT(*) FROM licenses WHERE role != 'global_admin' AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())")->fetchColumn();
    $revoked_count = $db->query("SELECT COUNT(*) FROM licenses WHERE role != 'global_admin' AND status = 'revoked'")->fetchColumn();
    $expired_count = $db->query("SELECT COUNT(*) FROM licenses WHERE role != 'global_admin' AND (status = 'expired' OR (expires_at IS NOT NULL AND expires_at <= NOW() AND status != 'revoked'))")->fetchColumn();
    $bound_count   = $db->query("SELECT COUNT(*) FROM licenses WHERE role != 'global_admin' AND bound_machine_id IS NOT NULL")->fetchColumn();

    // 3. Fetch all licenses with organization names
    $licenses_stmt = $db->query("
        SELECT l.*, o.name AS organization_name 
        FROM licenses l
        LEFT JOIN organizations o ON l.organization_id = o.id
        WHERE l.role != 'global_admin'
        ORDER BY l.id DESC
    ");
    $licenses = $licenses_stmt->fetchAll();

} catch (Exception $e) {
    die("Database fetch error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Productix | Licensing Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <!-- Ionicons -->
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
    <style>
        /* Machine binding badge styles */
        .badge-bound   { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
        .badge-unbound { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
        .machine-id-short { font-family: monospace; font-size: 12px; color: var(--text-muted); cursor: default; }
        .btn-icon.unbind { color: #f59e0b; }
        .btn-icon.unbind:hover { background: rgba(245,158,11,0.15); color: #fbbf24; }
    </style>
</head>
<body>

    <!-- Toast Notifications -->
    <div id="toastContainer" class="toast-container"></div>

    <div class="dashboard-container">
        
        <!-- Header -->
        <header class="nav-header">
            <div class="auth-logo" style="margin-bottom: 0;">
                <div class="logo-icon">PX</div>
                <div class="logo-text">Productix <span style="font-size: 14px; font-weight: 400; color: var(--accent-cyan);">Licensing Server</span></div>
            </div>
            
            <div class="user-profile">
                <div class="user-info">
                    <div class="user-name"><?php echo htmlspecialchars($_SESSION['admin_user']); ?></div>
                    <div class="user-role">Super Administrator</div>
                </div>
                <a href="logout.php" class="btn-logout">Logout</a>
            </div>
        </header>

        <!-- Global Kill Switch Banner / Status -->
        <div class="main-card" style="margin-bottom: 40px; padding: 24px; border-left: 4px solid <?php echo $master_kill_active ? 'var(--status-revoked)' : 'var(--status-active)'; ?>;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="font-size: 36px; display: flex; align-items: center; color: <?php echo $master_kill_active ? 'var(--status-revoked)' : 'var(--status-active)'; ?>;">
                        <ion-icon name="<?php echo $master_kill_active ? 'shield-half-outline' : 'shield-checkmark-outline'; ?>"></ion-icon>
                    </div>
                    <div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Global Master Kill Switch</h3>
                        <p style="font-size: 14px; color: var(--text-muted);">
                            <?php if ($master_kill_active): ?>
                                <span style="color: #fda4af; font-weight: 500;">ACTIVE: All license keys are suspended.</span> Client applications will immediately reject operations and lock down until this is deactivated.
                            <?php else: ?>
                                <span style="color: #a7f3d0; font-weight: 500;">STANDBY: Grid operations running normally.</span> License validations will process individually.
                            <?php endif; ?>
                        </p>
                    </div>
                </div>
                
                <button type="button" class="btn-primary <?php echo $master_kill_active ? '' : 'btn-danger-outline'; ?>" 
                        style="<?php echo $master_kill_active ? 'background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 15px rgba(16,185,129,0.3);' : ''; ?>"
                        onclick="toggleMasterKill()">
                    <ion-icon name="power-outline"></ion-icon>
                    <span><?php echo $master_kill_active ? 'Restore Grid Operations' : 'Trigger Global Suspension'; ?></span>
                </button>
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <span>Active Licenses</span>
                    <ion-icon name="checkmark-circle-outline" style="color: var(--status-active); font-size: 20px;"></ion-icon>
                </div>
                <div class="stat-value"><?php echo $active_count; ?></div>
                <div class="stat-indicator stat-active"></div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <span>Machine-Bound</span>
                    <ion-icon name="lock-closed-outline" style="color: #f59e0b; font-size: 20px;"></ion-icon>
                </div>
                <div class="stat-value"><?php echo $bound_count; ?></div>
                <div class="stat-indicator" style="background: #f59e0b;"></div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span>Expired Licenses</span>
                    <ion-icon name="time-outline" style="color: var(--status-expired); font-size: 20px;"></ion-icon>
                </div>
                <div class="stat-value"><?php echo $expired_count; ?></div>
                <div class="stat-indicator stat-expired"></div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span>Revoked Licenses</span>
                    <ion-icon name="ban-outline" style="color: var(--status-revoked); font-size: 20px;"></ion-icon>
                </div>
                <div class="stat-value"><?php echo $revoked_count; ?></div>
                <div class="stat-indicator stat-revoked"></div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span>Total Registered</span>
                    <ion-icon name="key-outline" style="color: var(--accent-cyan); font-size: 20px;"></ion-icon>
                </div>
                <div class="stat-value"><?php echo $total_count; ?></div>
                <div class="stat-indicator stat-suspended" style="background-color: var(--accent-cyan);"></div>
            </div>
        </div>

        <!-- Machine-Lock Info Banner -->
        <div class="main-card" style="margin-bottom: 32px; padding: 16px 24px; border-left: 4px solid #f59e0b; display: flex; align-items: flex-start; gap: 16px;">
            <ion-icon name="information-circle-outline" style="font-size: 22px; color: #f59e0b; flex-shrink: 0; margin-top: 2px;"></ion-icon>
            <div>
                <p style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #fbbf24;">OTP Machine-Lock System Active</p>
                <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
                    Each license key is permanently bound to the <strong>first machine</strong> that uses it. Other machines are automatically rejected (<code>MACHINE_MISMATCH</code>).
                    To transfer access: either <strong>unbind</strong> the key (same key, new machine) or <strong>revoke &amp; generate a new key</strong>.
                </p>
            </div>
        </div>

        <!-- Main Datatable Card -->
        <div class="main-card">
            <div class="section-header">
                <div>
                    <h2 class="section-title">License Keys Registry</h2>
                    <p style="font-size: 14px; color: var(--text-muted); margin-top: 4px;">Monitor, extend expiries, manage machine bindings, and revoke customer keys</p>
                </div>
                
                <div style="display: flex; gap: 16px; align-items: center;">
                    <input type="text" id="licenseSearch" class="search-input" placeholder="Search organization or key..." onkeyup="filterLicenses()">
                    <button class="btn-primary" onclick="openModal('createModal')">
                        <ion-icon name="add-circle-outline" style="font-size: 18px;"></ion-icon>
                        Generate Key
                    </button>
                </div>
            </div>

            <!-- Datatable -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>License Key</th>
                            <th>Status</th>
                            <th>Machine Binding</th>
                            <th>Expires At</th>
                            <th style="text-align: right; padding-right: 24px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="licenseTableBody">
                        <?php if (empty($licenses)): ?>
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                                    No license keys registered. Click "Generate Key" to issue a new license.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($licenses as $lic): 
                                $isExpired = false;
                                if (!empty($lic['expires_at'])) {
                                    $isExpired = (strtotime($lic['expires_at']) < time());
                                }
                                
                                $statusBadgeClass = 'badge-active';
                                $statusLabel = 'Active';
                                
                                if ($lic['status'] === 'revoked') {
                                    $statusBadgeClass = 'badge-revoked';
                                    $statusLabel = 'Revoked';
                                } elseif ($lic['status'] === 'expired' || $isExpired) {
                                    $statusBadgeClass = 'badge-expired';
                                    $statusLabel = 'Expired';
                                }

                                // Machine binding display
                                $isBound = !empty($lic['bound_machine_id']);
                                $machineShort = $isBound ? substr($lic['bound_machine_id'], 0, 8) . '...' : 'Unbound';
                                $machineBadgeClass = $isBound ? 'badge-bound' : 'badge-unbound';
                                $machineBadgeIcon  = $isBound ? 'lock-closed-outline' : 'lock-open-outline';
                                $firstUsedLabel = !empty($lic['first_used_at']) ? date('Y-m-d H:i', strtotime($lic['first_used_at'])) : '—';
                            ?>
                                <tr data-org="<?php echo htmlspecialchars($lic['organization_name'] ?? ''); ?>" data-key="<?php echo htmlspecialchars($lic['license_key']); ?>">
                                    <td style="font-weight: 500; font-size: 15px;">
                                        <?php echo htmlspecialchars($lic['organization_name'] ?? 'Unassigned'); ?>
                                    </td>
                                    <td>
                                        <span class="key-code" onclick="copyToClipboard('<?php echo htmlspecialchars($lic['license_key']); ?>')">
                                            <?php echo htmlspecialchars($lic['license_key']); ?>
                                            <ion-icon name="copy-outline" style="font-size: 12px; margin-left: 4px; vertical-align: middle;"></ion-icon>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge <?php echo $statusBadgeClass; ?>"><?php echo $statusLabel; ?></span>
                                    </td>
                                    <td>
                                        <span class="badge <?php echo $machineBadgeClass; ?>" 
                                              title="<?php echo $isBound ? htmlspecialchars('Machine: ' . $lic['bound_machine_id'] . ' | First used: ' . $firstUsedLabel) : 'No machine has claimed this key yet'; ?>"
                                              style="cursor: help; display: inline-flex; align-items: center; gap: 4px;">
                                            <ion-icon name="<?php echo $machineBadgeIcon; ?>" style="font-size: 11px;"></ion-icon>
                                            <?php echo $isBound ? $machineShort : 'Unbound'; ?>
                                        </span>
                                        <?php if ($isBound): ?>
                                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">First used: <?php echo $firstUsedLabel; ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td style="font-family: monospace; font-size: 13px; color: <?php echo $isExpired ? 'var(--status-revoked)' : 'var(--text-primary)'; ?>;">
                                        <?php echo $lic['expires_at'] ? date('Y-m-d H:i', strtotime($lic['expires_at'])) : 'Never'; ?>
                                    </td>
                                    <td style="text-align: right; padding-right: 16px;">
                                        <div class="row-actions" style="justify-content: flex-end;">
                                            
                                            <?php if ($lic['status'] === 'revoked'): ?>
                                                <button class="btn-icon reactivate" title="Reactivate License" onclick="reactivateLicense(<?php echo $lic['id']; ?>)">
                                                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                                                </button>
                                            <?php else: ?>
                                                <button class="btn-icon revoke" title="Revoke License" onclick="revokeLicense(<?php echo $lic['id']; ?>)">
                                                    <ion-icon name="ban-outline"></ion-icon>
                                                </button>
                                            <?php endif; ?>

                                            <?php if ($isBound): ?>
                                                <button class="btn-icon unbind" title="Clear Machine Binding — allows a new machine to claim this key" onclick="unbindLicense(<?php echo $lic['id']; ?>, '<?php echo htmlspecialchars($lic['organization_name'] ?? ''); ?>')">
                                                    <ion-icon name="unlink-outline"></ion-icon>
                                                </button>
                                            <?php endif; ?>

                                            <button class="btn-icon edit" title="Extend License Duration" onclick="openExtendModal(<?php echo $lic['id']; ?>, '<?php echo htmlspecialchars($lic['organization_name']); ?>')">
                                                <ion-icon name="time-outline"></ion-icon>
                                            </button>

                                            <button class="btn-icon delete" title="Permanently Delete License" onclick="deleteLicense(<?php echo $lic['id']; ?>)">
                                                <ion-icon name="trash-outline"></ion-icon>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Generate License Modal -->
    <div id="createModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Generate License Key</h3>
                <button class="btn-close" onclick="closeModal('createModal')">&times;</button>
            </div>
            <form id="createLicenseForm" onsubmit="handleCreateLicense(event)">
                <div class="form-group">
                    <label for="organizationName" class="form-label">Customer Organization Name</label>
                    <input type="text" id="organizationName" name="organization_name" class="form-input" placeholder="e.g. Acme Corp" required>
                </div>

                <div class="form-group">
                    <label for="durationDays" class="form-label">Duration Days <span style="color: var(--text-muted); font-weight: 400;">(0 = never expires)</span></label>
                    <input type="number" id="durationDays" name="duration_days" class="form-input" value="30" min="0" required>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal('createModal')">Cancel</button>
                    <button type="submit" class="btn-primary">Generate &amp; Issue</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Extend Duration Modal -->
    <div id="extendModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Extend License Key</h3>
                <button class="btn-close" onclick="closeModal('extendModal')">&times;</button>
            </div>
            <form id="extendLicenseForm" onsubmit="handleExtendLicense(event)">
                <input type="hidden" id="extendLicenseId" name="id">
                
                <div class="form-group">
                    <label class="form-label">Customer</label>
                    <div id="extendOrgLabel" style="font-weight: 600; font-size: 16px; margin-top: 4px; color: var(--accent-cyan);"></div>
                </div>

                <div class="form-group">
                    <label for="extendDays" class="form-label">Add Duration (Days)</label>
                    <input type="number" id="extendDays" name="days" class="form-input" value="30" min="1" required>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal('extendModal')">Cancel</button>
                    <button type="submit" class="btn-primary">Apply Extension</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Logic Scripting -->
    <script>
        // Modal helpers
        function openModal(id) {
            document.getElementById(id).classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function openExtendModal(id, orgName) {
            document.getElementById('extendLicenseId').value = id;
            document.getElementById('extendOrgLabel').innerText = orgName;
            openModal('extendModal');
        }

        // Toast notifications helper
        function showToast(message, type = 'success') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const iconName = type === 'success' ? 'checkmark-circle' : 'alert-circle';
            toast.innerHTML = `
                <ion-icon name="${iconName}" style="font-size: 20px; flex-shrink: 0;"></ion-icon>
                <span>${message}</span>
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideUp 0.3s ease reverse forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Real-time table search filter
        function filterLicenses() {
            const query = document.getElementById('licenseSearch').value.toLowerCase();
            const rows = document.querySelectorAll('#licenseTableBody tr');
            
            rows.forEach(row => {
                const org = row.getAttribute('data-org');
                const key = row.getAttribute('data-key');
                if (org && key) {
                    if (org.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        }

        // Copy key utility
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('License key copied to clipboard!', 'success');
            }).catch(err => {
                showToast('Failed to copy key.', 'error');
            });
        }

        // AJAX: Toggle master kill switch
        function toggleMasterKill() {
            if (confirm("WARNING: Are you sure you want to toggle the Global Master Kill Switch? Doing so will suspend/restore all client applications instantly.")) {
                const formData = new FormData();
                formData.append('toggle', 'true');

                fetch('actions.php?action=toggle_kill', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast(data.error || 'Operation failed', 'error');
                    }
                })
                .catch(err => {
                    showToast('Connection error occurred.', 'error');
                });
            }
        }

        // AJAX: Create license
        function handleCreateLicense(e) {
            e.preventDefault();
            const form = document.getElementById('createLicenseForm');
            const formData = new FormData(form);

            fetch('actions.php?action=create', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    closeModal('createModal');
                    showToast(`${data.message} Key: ${data.license.license_key}`, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showToast(data.error || 'Could not generate license', 'error');
                }
            })
            .catch(err => {
                showToast('Connection error.', 'error');
            });
        }

        // AJAX: Revoke license
        function revokeLicense(id) {
            if (confirm("Are you sure you want to REVOKE this license? Access will be immediately blocked for the organization's clients.")) {
                const formData = new FormData();
                formData.append('id', id);

                fetch('actions.php?action=revoke', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast(data.error || 'Failed to revoke', 'error');
                    }
                })
                .catch(err => {
                    showToast('Connection error.', 'error');
                });
            }
        }

        // AJAX: Reactivate license
        function reactivateLicense(id) {
            const formData = new FormData();
            formData.append('id', id);

            fetch('actions.php?action=reactivate', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(data.error || 'Failed to reactivate', 'error');
                }
            })
            .catch(err => {
                showToast('Connection error.', 'error');
            });
        }

        // AJAX: Unbind machine from license (allows new machine to claim it)
        function unbindLicense(id, orgName) {
            if (confirm(`Clear machine binding for "${orgName}"?\n\nThis will allow ANY machine to claim this license key next time it is used. The license key itself remains the same and active.`)) {
                const formData = new FormData();
                formData.append('id', id);

                fetch('actions.php?action=unbind', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast(data.error || 'Failed to unbind', 'error');
                    }
                })
                .catch(err => {
                    showToast('Connection error.', 'error');
                });
            }
        }

        // AJAX: Extend license
        function handleExtendLicense(e) {
            e.preventDefault();
            const form = document.getElementById('extendLicenseForm');
            const formData = new FormData(form);

            fetch('actions.php?action=extend', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    closeModal('extendModal');
                    showToast(data.message, 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(data.error || 'Failed to extend', 'error');
                }
            })
            .catch(err => {
                showToast('Connection error.', 'error');
            });
        }

        // AJAX: Delete license
        function deleteLicense(id) {
            if (confirm("CAUTION: Are you sure you want to PERMANENTLY DELETE this license key? This cannot be undone and will erase the key registration data.")) {
                const formData = new FormData();
                formData.append('id', id);

                fetch('actions.php?action=delete', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast(data.error || 'Failed to delete', 'error');
                    }
                })
                .catch(err => {
                    showToast('Connection error.', 'error');
                });
            }
        }
    </script>
</body>
</html>
