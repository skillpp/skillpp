four-guard-go-full - compact edition
=====================================

This package contains a compact Go implementation of the listener/bot.

Files:
- main.go
- go.mod
- .env.example

Instructions:
1) Copy .env.example -> .env and fill your PRIVATE_KEY and endpoints.
2) Start in DRY_RUN=true to test without sending tx.
3) Build & run:
   go mod tidy
   go build -o four-guard-go-full
   ./four-guard-go-full

Security:
- Do NOT paste your private key into chat.
- Use a throwaway wallet for initial testing.
