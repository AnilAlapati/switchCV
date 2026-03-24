#!/usr/bin/env bash
# =============================================================================
# artifact-registry-cleanup.sh
#
# Deletes old container images from Google Artifact Registry, keeping only
# the N most recent tagged images per repository. Untagged (dangling) images
# are always deleted regardless of age.
#
# Usage:
#   ./scripts/artifact-registry-cleanup.sh [OPTIONS]
#
# Options:
#   --project    GCP project ID          (default: switchcv-e5136)
#   --location   Artifact Registry region (default: us-central1)
#   --repo       Repository name          (default: gcf-artifacts)
#   --keep       Number of images to keep per package (default: 5)
#   --dry-run    Print what would be deleted without deleting
#   --help       Show this help message
#
# Examples:
#   # Dry run to preview what would be deleted
#   ./scripts/artifact-registry-cleanup.sh --dry-run
#
#   # Clean up, keeping only the 3 most recent images
#   ./scripts/artifact-registry-cleanup.sh --keep 3
#
#   # Clean a different project/region
#   ./scripts/artifact-registry-cleanup.sh --project my-project --location europe-west1
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Artifact Registry API enabled on the project
#   - IAM: roles/artifactregistry.repoAdmin on the repository
#
# CI / GitHub Actions usage:
#   Add a step after deployment:
#     - name: Clean up old container images
#       run: ./scripts/artifact-registry-cleanup.sh
# =============================================================================

set -euo pipefail

# --------------------------------------------------------------------------- #
# Defaults
# --------------------------------------------------------------------------- #
PROJECT="switchcv-e5136"
LOCATION="us-central1"
REPO="gcf-artifacts"
KEEP=5
DRY_RUN=false

# --------------------------------------------------------------------------- #
# Argument parsing
# --------------------------------------------------------------------------- #
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)   PROJECT="$2";   shift 2 ;;
    --location)  LOCATION="$2";  shift 2 ;;
    --repo)      REPO="$2";      shift 2 ;;
    --keep)      KEEP="$2";      shift 2 ;;
    --dry-run)   DRY_RUN=true;   shift   ;;
    --help)
      sed -n '/^# Usage/,/^# ===/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
log()  { echo "[artifact-cleanup] $*"; }
warn() { echo "[artifact-cleanup] WARN: $*" >&2; }

require_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is required but not installed." >&2
    exit 1
  fi
}

require_command gcloud
require_command jq

REGISTRY_BASE="${LOCATION}-docker.pkg.dev/${PROJECT}/${REPO}"

log "Project:  ${PROJECT}"
log "Location: ${LOCATION}"
log "Repo:     ${REPO}"
log "Keep:     ${KEEP} most recent tagged images per package"
log "Dry run:  ${DRY_RUN}"
echo ""

# --------------------------------------------------------------------------- #
# Step 1 — Apply a GCP-managed cleanup policy (idempotent)
#
# This sets a server-side policy that GCP enforces automatically on every push,
# so cleanup happens even outside CI runs. We set two policies:
#   1. Keep the N most recent tagged versions
#   2. Delete all untagged (dangling) images immediately
# --------------------------------------------------------------------------- #
log "Setting server-side cleanup policy on ${REGISTRY_BASE} ..."

POLICY_JSON=$(cat <<EOF
[
  {
    "name": "keep-most-recent-tagged",
    "action": {"type": "Keep"},
    "mostRecentVersions": {
      "packageNamePrefixes": [],
      "keepCount": ${KEEP}
    }
  },
  {
    "name": "delete-untagged",
    "action": {"type": "Delete"},
    "condition": {
      "tagState": "UNTAGGED",
      "olderThan": "0s"
    }
  }
]
EOF
)

if [[ "${DRY_RUN}" == "true" ]]; then
  log "[DRY RUN] Would apply cleanup policy:"
  echo "${POLICY_JSON}" | jq .
else
  echo "${POLICY_JSON}" > /tmp/ar-cleanup-policy.json

  gcloud artifacts repositories set-cleanup-policies "${REPO}" \
    --project="${PROJECT}" \
    --location="${LOCATION}" \
    --policy=/tmp/ar-cleanup-policy.json \
    --no-dry-run 2>&1 || warn "Could not apply server-side cleanup policy (may require elevated permissions). Skipping."

  rm -f /tmp/ar-cleanup-policy.json
  log "Server-side cleanup policy applied."
fi

echo ""

# --------------------------------------------------------------------------- #
# Step 2 — Immediate one-off cleanup: delete all existing untagged images now
#
# The server-side policy above handles future images, but existing dangling
# images accumulate until the first GCP-triggered cleanup. This step deletes
# them immediately.
# --------------------------------------------------------------------------- #
log "Listing untagged images for immediate deletion ..."

UNTAGGED_DIGESTS=$(gcloud artifacts docker images list "${REGISTRY_BASE}" \
  --project="${PROJECT}" \
  --filter="tags=''" \
  --format="value(version)" 2>/dev/null || true)

if [[ -z "${UNTAGGED_DIGESTS}" ]]; then
  log "No untagged images found."
else
  UNTAGGED_COUNT=$(echo "${UNTAGGED_DIGESTS}" | wc -l | tr -d ' ')
  log "Found ${UNTAGGED_COUNT} untagged image(s). Deleting ..."

  while IFS= read -r digest; do
    [[ -z "${digest}" ]] && continue
    IMAGE="${REGISTRY_BASE}@${digest}"
    if [[ "${DRY_RUN}" == "true" ]]; then
      log "[DRY RUN] Would delete: ${IMAGE}"
    else
      log "Deleting: ${IMAGE}"
      gcloud artifacts docker images delete "${IMAGE}" \
        --project="${PROJECT}" \
        --quiet 2>&1 || warn "Failed to delete ${IMAGE} — skipping."
    fi
  done <<< "${UNTAGGED_DIGESTS}"
fi

echo ""

# --------------------------------------------------------------------------- #
# Step 3 — Per-package: delete tagged images beyond the KEEP limit
#
# Iterates every package in the repo and deletes older tagged versions so that
# only the KEEP most recent ones are retained.
# --------------------------------------------------------------------------- #
log "Checking tagged images per package (keeping ${KEEP} most recent each) ..."

PACKAGES=$(gcloud artifacts packages list \
  --repository="${REPO}" \
  --project="${PROJECT}" \
  --location="${LOCATION}" \
  --format="value(name)" 2>/dev/null || true)

if [[ -z "${PACKAGES}" ]]; then
  log "No packages found in repository."
else
  while IFS= read -r pkg; do
    [[ -z "${pkg}" ]] && continue
    PKG_NAME=$(basename "${pkg}")

    # List versions sorted by create time descending; skip the first KEEP
    VERSIONS=$(gcloud artifacts versions list \
      --package="${PKG_NAME}" \
      --repository="${REPO}" \
      --project="${PROJECT}" \
      --location="${LOCATION}" \
      --sort-by="~CREATE_TIME" \
      --format="value(name)" 2>/dev/null || true)

    VERSION_COUNT=$(echo "${VERSIONS}" | grep -c . || true)

    if [[ ${VERSION_COUNT} -le ${KEEP} ]]; then
      log "  ${PKG_NAME}: ${VERSION_COUNT} version(s) — nothing to delete."
      continue
    fi

    TO_DELETE=$(echo "${VERSIONS}" | tail -n +"$((KEEP + 1))")
    DELETE_COUNT=$(echo "${TO_DELETE}" | grep -c . || true)
    log "  ${PKG_NAME}: ${VERSION_COUNT} versions — deleting ${DELETE_COUNT} old ones."

    while IFS= read -r version; do
      [[ -z "${version}" ]] && continue
      if [[ "${DRY_RUN}" == "true" ]]; then
        log "    [DRY RUN] Would delete version: ${version}"
      else
        log "    Deleting version: ${version}"
        gcloud artifacts versions delete "${version}" \
          --package="${PKG_NAME}" \
          --repository="${REPO}" \
          --project="${PROJECT}" \
          --location="${LOCATION}" \
          --quiet 2>&1 || warn "Failed to delete ${version} — skipping."
      fi
    done <<< "${TO_DELETE}"

  done <<< "${PACKAGES}"
fi

echo ""
log "Artifact Registry cleanup complete."
