-- Fix security warnings

-- 1. Enable leaked password protection
UPDATE auth.config 
SET leaked_password_protection = true 
WHERE parameter = 'password_protection_enabled';

-- 2. Reduce OTP expiry to recommended threshold (default is usually 1 hour, let's set to 10 minutes)
UPDATE auth.config 
SET config_value = '600' 
WHERE parameter = 'otp_expiry_seconds';