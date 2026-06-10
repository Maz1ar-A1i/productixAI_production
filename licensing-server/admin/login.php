<?php
// admin/login.php
// Admin Login Page

require_once __DIR__ . '/../db_config.php';

// Redirect to dashboard if already logged in
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';

    if ($username === ADMIN_USER && $password === ADMIN_PASS) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $username;
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid administrative username or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Productix | Licensing Admin Login</title>
    <link rel="stylesheet" href="style.css">
    <!-- Ionicons for modern iconography -->
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-logo">
                <div class="logo-icon">PX</div>
                <div class="logo-text">Productix</div>
            </div>
            
            <h2 class="auth-title">Licensing Central</h2>
            <p class="auth-subtitle">Sign in to manage server license grid access</p>

            <?php if (!empty($error)): ?>
                <div class="alert-danger">
                    <ion-icon name="alert-circle-outline" style="font-size: 20px; flex-shrink: 0;"></ion-icon>
                    <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>

            <form action="login.php" method="POST">
                <div class="form-group">
                    <label for="username" class="form-label">Username</label>
                    <input type="text" id="username" name="username" class="form-input" placeholder="Enter administrative username" required autocomplete="username">
                </div>
                
                <div class="form-group">
                    <label for="password" class="form-label">Password</label>
                    <input type="password" id="password" name="password" class="form-input" placeholder="••••••••••••" required autocomplete="current-password">
                </div>

                <button type="submit" class="btn-submit">Authenticate Grid</button>
            </form>
        </div>
    </div>
</body>
</html>
