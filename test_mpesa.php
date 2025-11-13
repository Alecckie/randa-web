<?php
$url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch) . "\n";
} else {
    echo "Response: " . $response . "\n";
}

curl_close($ch);
