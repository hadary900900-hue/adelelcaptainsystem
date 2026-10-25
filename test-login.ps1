$body = @{
  email = "admin@elsalam.com"
  password = "admin123"
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
  $response | ConvertTo-Json -Depth 10
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
