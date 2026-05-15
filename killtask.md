Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}
