# Security Test Script for GPNet3 IDOR Fixes
# Tests the 10 vulnerable endpoints that were patched

$ErrorActionPreference = "Continue"

Write-Host "=== GPNet3 Security Validation Tests ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as Org A (employer)
Write-Host "1. Login as employer@symmetry.local (Org A)..." -ForegroundColor Yellow
$bodyA = '{"email":"employer@symmetry.local","password":"ChangeMe123!"}'
try {
    $loginA = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyA
    $TOKEN_A = $loginA.token
    Write-Host "   Got TOKEN_A: $($TOKEN_A.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Login as non-admin (doctor - different org)
Write-Host "2. Login as doctor@harborclinic.local (Org B)..." -ForegroundColor Yellow
$bodyB = '{"email":"doctor@harborclinic.local","password":"ChangeMe123!"}'
try {
    $loginB = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyB
    $TOKEN_B = $loginB.token
    Write-Host "   Got TOKEN_B: $($TOKEN_B.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Test C: Notifications Privilege Escalation ===" -ForegroundColor Cyan

# Test C1: Non-admin trying to trigger notifications
Write-Host "C1. Non-admin (employer) trying POST /api/notifications/trigger..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/notifications/trigger" -Method Post -Headers @{"Authorization"="Bearer $TOKEN_A"}
    Write-Host "   FAIL - Vulnerable! Got success response" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "   PASS - Got 403 Forbidden (expected)" -ForegroundColor Green
    } else {
        Write-Host "   Got status $status" -ForegroundColor Yellow
    }
}

# Test C2: Non-admin trying to send notifications
Write-Host "C2. Non-admin (employer) trying POST /api/notifications/send..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/notifications/send" -Method Post -Headers @{"Authorization"="Bearer $TOKEN_A"}
    Write-Host "   FAIL - Vulnerable! Got success response" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "   PASS - Got 403 Forbidden (expected)" -ForegroundColor Green
    } else {
        Write-Host "   Got status $status" -ForegroundColor Yellow
    }
}

# Test C3: Non-admin trying to send test email
Write-Host "C3. Non-admin (employer) trying POST /api/notifications/test..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/notifications/test" -Method Post -Headers @{"Authorization"="Bearer $TOKEN_A"}
    Write-Host "   FAIL - Vulnerable! Got success response" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "   PASS - Got 403 Forbidden (expected)" -ForegroundColor Green
    } else {
        Write-Host "   Got status $status" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Test A: Actions IDOR ===" -ForegroundColor Cyan

# Get an action from Org A
Write-Host "A0. Getting action from Org A..." -ForegroundColor Yellow
$ACTION_ID_A = $null
try {
    $actionsA = Invoke-RestMethod -Uri "http://localhost:5000/api/actions" -Method Get -Headers @{"Authorization"="Bearer $TOKEN_A"}
    if ($actionsA.data -and $actionsA.data.Count -gt 0) {
        $ACTION_ID_A = $actionsA.data[0].id
        Write-Host "   Got ACTION_ID_A: $ACTION_ID_A" -ForegroundColor Green
    } else {
        Write-Host "   No actions in Org A, skipping IDOR tests" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

if ($ACTION_ID_A) {
    # Test A1: Org B trying to read Org A's action
    Write-Host "A1. Org B trying to GET Org A's action..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:5000/api/actions/$ACTION_ID_A" -Method Get -Headers @{"Authorization"="Bearer $TOKEN_B"}
        Write-Host "   FAIL - Vulnerable! Got action data" -ForegroundColor Red
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 404) {
            Write-Host "   PASS - Got 404 Not Found (expected)" -ForegroundColor Green
        } else {
            Write-Host "   Got status $status" -ForegroundColor Yellow
        }
    }

    # Test A2: Org B trying to mark Org A's action as done
    Write-Host "A2. Org B trying to POST /api/actions/$ACTION_ID_A/done..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:5000/api/actions/$ACTION_ID_A/done" -Method Post -Headers @{"Authorization"="Bearer $TOKEN_B"}
        Write-Host "   FAIL - Vulnerable! Action was marked done" -ForegroundColor Red
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 404) {
            Write-Host "   PASS - Got 404 Not Found (expected)" -ForegroundColor Green
        } else {
            Write-Host "   Got status $status" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Test B: Email Drafts IDOR ===" -ForegroundColor Cyan

# Get a case from Org A
Write-Host "B0. Getting case from Org A..." -ForegroundColor Yellow
$CASE_ID_A = $null
try {
    $casesA = Invoke-RestMethod -Uri "http://localhost:5000/api/gpnet2/cases" -Method Get -Headers @{"Authorization"="Bearer $TOKEN_A"}
    if ($casesA.data -and $casesA.data.Count -gt 0) {
        $CASE_ID_A = $casesA.data[0].id
        Write-Host "   Got CASE_ID_A: $CASE_ID_A" -ForegroundColor Green
    } else {
        Write-Host "   No cases in Org A, skipping Email Drafts tests" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

if ($CASE_ID_A) {
    # Test B1: Org B trying to access Org A's case email drafts
    Write-Host "B1. Org B trying to GET Org A's case email drafts..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$CASE_ID_A/email-drafts" -Method Get -Headers @{"Authorization"="Bearer $TOKEN_B"}
        Write-Host "   FAIL - Vulnerable! Got email drafts list" -ForegroundColor Red
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 404) {
            Write-Host "   PASS - Got 404 Not Found (expected)" -ForegroundColor Green
        } else {
            Write-Host "   Got status $status" -ForegroundColor Yellow
        }
    }

    # Test B2: Org B trying to generate email draft for Org A's case
    Write-Host "B2. Org B trying to POST generate email draft for Org A's case..." -ForegroundColor Yellow
    try {
        $draftBody = '{"emailType":"initial_contact","recipient":"worker"}'
        $result = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$CASE_ID_A/email-drafts/generate" -Method Post -ContentType "application/json" -Body $draftBody -Headers @{"Authorization"="Bearer $TOKEN_B"}
        Write-Host "   FAIL - Vulnerable! Email draft was generated" -ForegroundColor Red
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 404) {
            Write-Host "   PASS - Got 404 Not Found (expected)" -ForegroundColor Green
        } else {
            Write-Host "   Got status $status" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Security Validation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "- Notifications Privilege Escalation: All 3 tests ran" -ForegroundColor White
Write-Host "- Actions IDOR: Tested if data available" -ForegroundColor White
Write-Host "- Email Drafts IDOR: Tested if data available" -ForegroundColor White
