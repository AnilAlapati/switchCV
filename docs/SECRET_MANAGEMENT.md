# Secret Management Guidelines

## Overview

This document outlines best practices for handling secrets and sensitive information in the SwitchCV project to prevent accidental exposure.

## Rules

1. **Never commit secrets** - API keys, passwords, tokens, private keys, etc. should never be committed to the repository.
2. **Use environment variables** - All secrets should be loaded from environment variables (e.g., `process.env.API_KEY`).
3. **Ignore sensitive files** - Ensure `.gitignore` includes all potential secret files.
4. **Test files** - Use placeholders in test files instead of real secrets.

## Environment Variables

The following environment variables are used for secrets:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `HUGGINGFACE_TOKEN`

## Files to Never Commit

- `.env*` files (except `.env.example`)
- `key.json` (Firebase service account)
- Any file containing `apiKey`, `secret`, `token`, `password` in filenames
- `*.key`, `*.p12`, `*.pem`, `secrets.json`, etc.

## Tools

- `git-secrets` is installed to scan for secrets before commits.
- Patterns monitored: Firebase API keys, OpenAI keys, HuggingFace tokens, Groq keys.

## Incident Response

If secrets are accidentally committed:

1. Immediately revoke/regenerate the affected keys.
2. Remove from git history if necessary.
3. Update all deployments with new keys.
4. Review and improve prevention measures.

## Verification

Run `git secrets --scan` to check current files for secrets.
Run `git secrets --scan-history` to check git history (may be slow).
