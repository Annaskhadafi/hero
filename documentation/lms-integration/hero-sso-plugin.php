<?php
/**
 * Plugin Name: HERO LMS Integration & SSO
 * Description: Single Sign-On via JWT and course progress API for HERO Hub integration.
 * Version: 1.0.0
 * Author: Antigravity AI
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Secret key for JWT verification. Best to define this in wp-config.php:
// define('HERO_LMS_JWT_SECRET', 'your_sso_shared_jwt_secret_key');
if (!defined('HERO_LMS_JWT_SECRET')) {
    define('HERO_LMS_JWT_SECRET', '2d1f209c9e98ca4ed6259917eecec537980e03261dd6d9d651e6af20e9d94915');
}

// 1. Helper function to decode Base64Url
function hero_lms_base64url_decode($data) {
    header('Content-Type: text/plain');
    $b64 = str_replace(array('-', '_'), array('+', '/'), $data);
    $leftover = strlen($b64) % 4;
    if ($leftover) {
        $b64 .= str_repeat('=', 4 - $leftover);
    }
    return base64_decode($b64);
}

// 2. Helper function to verify JWT Token
function hero_lms_verify_jwt($jwt) {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return new WP_Error('invalid_jwt', 'Invalid JWT structure', array('status' => 400));
    }

    $header = $parts[0];
    $payload = $parts[1];
    $signature = $parts[2];

    // Recalculate HMAC SHA-256 signature
    $signature_input = "$header.$payload";
    $calculated_signature = hash_hmac('sha256', $signature_input, HERO_LMS_JWT_SECRET, true);
    
    // Base64Url encode the calculated signature
    $calculated_signature_b64 = str_replace(array('=', '+', '/'), array('', '-', '_'), base64_encode($calculated_signature));

    if (!hash_equals($signature, $calculated_signature_b64)) {
        return new WP_Error('invalid_signature', 'Signature verification failed', array('status' => 401));
    }

    $decoded_payload = json_decode(hero_lms_base64url_decode($payload), true);
    if (!$decoded_payload) {
        return new WP_Error('invalid_payload', 'Payload decoding failed', array('status' => 400));
    }

    // Verify expiration time (exp)
    if (isset($decoded_payload['exp']) && $decoded_payload['exp'] < time()) {
        return new WP_Error('expired_token', 'Token has expired', array('status' => 401));
    }

    return $decoded_payload;
}

// 3. Register REST API Endpoints
add_action('rest_api_init', function () {
    // SSO Endpoint: GET /wp-json/hero-sso/v1/login?token={JWT}
    register_rest_route('hero-sso/v1', '/login', array(
        'methods'             => 'GET',
        'callback'            => 'hero_lms_sso_login_handler',
        'permission_callback' => '__return_true',
    ));

    // Progress API Endpoint: GET /wp-json/hero-lms/v1/progress?email={email}&sn={sn}
    register_rest_route('hero-lms/v1', '/progress', array(
        'methods'             => 'GET',
        'callback'            => 'hero_lms_progress_api_handler',
        'permission_callback' => 'hero_lms_progress_api_permissions',
    ));
});

// 4. SSO Login Callback Handler
function hero_lms_sso_login_handler($request) {
    $token = $request->get_param('token');
    if (empty($token)) {
        wp_die('Error: Missing token parameter.', 'Bad Request', array('response' => 400));
    }

    $payload = hero_lms_verify_jwt($token);
    if (is_wp_error($payload)) {
        wp_die('Error: Token verification failed. ' . $payload->get_error_message(), 'Unauthorized', array('response' => $payload->get_error_data()['status'] ?? 401));
    }

    $email = sanitize_email($payload['email'] ?? '');
    $sn = sanitize_text_field($payload['sn'] ?? '');
    $name = sanitize_text_field($payload['name'] ?? '');

    if (empty($email)) {
        wp_die('Error: Token payload does not contain an email.', 'Bad Request', array('response' => 400));
    }

    // A. Check if user already exists
    $user = get_user_by('email', $email);

    if (!$user && !empty($sn)) {
        // Fallback search by username = SN
        $user = get_user_by('login', $sn);
    }

    // B. Create new user if not exists
    if (!$user) {
        $username = !empty($sn) ? $sn : strstr($email, '@', true) . '_' . rand(100, 999);
        $username = sanitize_user($username, true);
        
        // Ensure username is unique
        $original_username = $username;
        $count = 1;
        while (username_exists($username)) {
            $username = $original_username . $count;
            $count++;
        }

        $random_password = wp_generate_password(24, true);
        $user_id = wp_insert_user(array(
            'user_login'    => $username,
            'user_email'    => $email,
            'user_pass'     => $random_password,
            'display_name'  => $name,
            'first_name'    => $name,
            'role'          => 'subscriber', // default role for MasterStudy students
        ));

        if (is_wp_error($user_id)) {
            wp_die('Error creating user: ' . $user_id->get_error_message(), 'Internal Server Error', array('response' => 500));
        }

        $user = get_user_by('id', $user_id);
    }

    // C. Save SN to user meta
    if ($user && !empty($sn)) {
        update_user_meta($user->ID, 'employee_sn', $sn);
    }

    // D. Log the user in
    wp_clear_auth_cookie();
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);

    // E. Redirect to MasterStudy LMS profile dashboard, or custom page if provided
    $redirect_url = '';
    if (isset($payload['redirect'])) {
        $redirect_url = esc_url_raw($payload['redirect']);
    }

    if (empty($redirect_url)) {
        $redirect_url = home_url('/user-profile');
        
        // Fallback if that page doesn't exist:
        if (!get_page_by_path('user-profile') && !get_page_by_path('user-public-profile')) {
            $redirect_url = home_url('/');
        }
    }

    wp_safe_redirect($redirect_url);
    exit;
}

// 5. Progress API Permissions Check
function hero_lms_progress_api_permissions($request) {
    // Authenticate via Bearer token in Authorization header
    $auth_header = $request->get_header('Authorization');
    if (empty($auth_header)) {
        return new WP_Error('unauthorized', 'Missing Authorization Header', array('status' => 401));
    }

    $token = str_replace('Bearer ', '', $auth_header);
    if ($token !== HERO_LMS_JWT_SECRET) {
        return new WP_Error('forbidden', 'Invalid API key or shared secret', array('status' => 403));
    }

    return true;
}

// 6. Progress API Callback Handler
function hero_lms_progress_api_handler($request) {
    $email = sanitize_email($request->get_param('email'));
    $sn = sanitize_text_field($request->get_param('sn'));

    if (empty($email) && empty($sn)) {
        return new WP_REST_Response(array('message' => 'Missing email or sn parameter'), 400);
    }

    // Find the user
    $user = null;
    if (!empty($email)) {
        $user = get_user_by('email', $email);
    }
    if (!$user && !empty($sn)) {
        // Find by SN in user meta
        $users = get_users(array(
            'meta_key'   => 'employee_sn',
            'meta_value' => $sn,
            'number'     => 1,
        ));
        if (!empty($users)) {
            $user = $users[0];
        } else {
            // Check username matching sn
            $user = get_user_by('login', $sn);
        }
    }

    if (!$user) {
        return new WP_REST_Response(array(), 200); // Return empty array if user not found in WP yet
    }

    global $wpdb;
    $courses = array();

    // Verify if MasterStudy LMS table exists
    $lms_courses_table = $wpdb->prefix . 'stm_lms_user_courses';
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$lms_courses_table'") === $lms_courses_table;

    if ($table_exists) {
        // Query courses, progress, and status from MasterStudy LMS table
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT uc.course_id, uc.progress, uc.status, p.post_title as course_name
            FROM $lms_courses_table uc
            JOIN {$wpdb->posts} p ON uc.course_id = p.ID
            WHERE uc.user_id = %d AND p.post_status = 'publish'
        ", $user->ID), ARRAY_A);

        if ($results) {
            foreach ($results as $row) {
                // Get grades/scores from quizzes if available
                $grade = null;
                $quiz_table = $wpdb->prefix . 'stm_lms_user_quizzes';
                if ($wpdb->get_var("SHOW TABLES LIKE '$quiz_table'") === $quiz_table) {
                    // Get highest quiz score for this course
                    $score = $wpdb->get_var($wpdb->prepare("
                        SELECT MAX(progress) as max_score
                        FROM $quiz_table
                        WHERE user_id = %d AND course_id = %d
                    ", $user->ID, $row['course_id']));
                    if ($score !== null) {
                        $grade = floatval($score);
                    }
                }

                $courses[] = array(
                    'course_id'   => intval($row['course_id']),
                    'course_name' => $row['course_name'],
                    'progress'    => intval($row['progress']),
                    'status'      => $row['status'],
                    'grade'       => $grade,
                );
            }
        }
    } else {
        // Fallback mock data / empty if MasterStudy LMS is not fully loaded / active
        // This keeps the API working even during setup
        $courses = array();
    }

    return new WP_REST_Response($courses, 200);
}
