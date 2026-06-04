# Run backend and frontend together

Use this PowerShell one-liner from the repo root:

```powershell
Start-Process -FilePath "npm" -ArgumentList "--prefix","backend","run","dev"; npx http-server "frontend" -p 8080
```
