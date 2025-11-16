#!/bin/bash
# Quick alias setup for safe git operations

cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║        Safe Git Aliases - Add to ~/.zshrc                  ║
╔════════════════════════════════════════════════════════════╝

# Navigate to your project
alias cdswitch='cd ~/Documents/Apps/SwitchCV_V2'

# Safety checks
alias gcheck='./scripts/git-health-check.sh'
alias gsafe='./scripts/safe-commit.sh'

# Quick disk check
alias diskcheck='df -h . | tail -1 | awk "{print \$5\" used\"}"'

# Safe commit workflow
alias gca='./scripts/git-health-check.sh && git add -A && ./scripts/safe-commit.sh'

# Repository maintenance
alias gclean='git gc --aggressive && git prune'

# Add to ~/.zshrc:
# source ~/Documents/Apps/SwitchCV_V2/scripts/git-aliases.sh

╚════════════════════════════════════════════════════════════╝

To install, run:
    echo "source ~/Documents/Apps/SwitchCV_V2/scripts/git-aliases.sh" >> ~/.zshrc
    source ~/.zshrc

EOF
