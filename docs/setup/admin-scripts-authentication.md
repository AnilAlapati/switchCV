# Admin Scripts Authentication

To run administrative scripts (like `scripts/seed-templates.js` or `scripts/init-system.js`) locally, you need to authenticate with Firebase/Google Cloud.

## Option 1: Application Default Credentials (Recommended)

This method is more secure as it doesn't involve downloading long-lived private keys.

1.  **Install Google Cloud SDK**: If you haven't already, install the `gcloud` CLI.
2.  **Login**: Run the following command in your terminal:
    ```bash
    gcloud auth application-default login
    ```
3.  **Follow the browser prompt** to sign in with your Google account associated with the Firebase project.

Once authenticated, the scripts will automatically detect your credentials.

## Option 2: Service Account Key (Legacy)

**⚠️ Security Warning**: Service account keys are powerful credentials. Do not commit them to version control.

1.  Go to **Firebase Console** > **Project Settings** > **Service Accounts**.
2.  Click **Generate New Private Key**.
3.  Save the file as `firebase-service-account.json` in the project root.

## Troubleshooting

If you see "Credential implementation provided to initializeApp() via the \"credential\" property failed to fetch a valid Google OAuth2 access token", ensure:

1.  You are logged in with the correct account (`gcloud auth list`).
2.  The project ID in the script matches your Firebase project.
