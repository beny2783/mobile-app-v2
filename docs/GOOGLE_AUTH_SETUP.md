# Google OAuth Authentication Setup

## Overview

This document outlines the setup and platform-specific differences for Google OAuth authentication in our React Native Expo app using Supabase.

## Google Cloud Console Setup

### Creating Android OAuth Client

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Android" as Application type
4. Fill in the required fields:
   - **Name**: A descriptive name (e.g., "Spending Tracker Android")
   - **Package name**: `com.yourcompany.spendingtracker` (must match app.json)
   - **SHA-1 certificate fingerprint**: Get this by running:

     ```bash
     # For debug certificate (development)
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

     # For production certificate (after Play Store upload)
     # Get this from Google Play Console > Setup > App Integrity
     ```

### Getting Debug SHA-1 (Development)

1. Open terminal
2. Run the keytool command above
3. Copy the SHA-1 fingerprint (looks like: "AA:BB:CC:DD:...")
4. Paste into Google Cloud Console

### Getting Production SHA-1 (Release)

1. Upload app to Google Play Store (internal track is fine)
2. Go to Play Console > Setup > App Integrity
3. Copy the SHA-1 from "App signing key certificate"
4. Add to Google Cloud Console OAuth client

## Platform Differences

### iOS Authentication Flow

✅ Works out of the box:

- Automatic deep linking registration
- No additional security certificates needed
- Works on both simulator and physical devices
- Handles `spendingtracker://` scheme automatically

Example of successful iOS authentication logs:

```log
[AuthRepository] Opening auth session with URL: https://[project].supabase.co/auth/v1/authorize
[AuthRepository] Auth session result: success
[AuthRepository] Tokens extracted: {"hasAccessToken": true, "hasRefreshToken": true}
```

### Android Authentication Flow

⚠️ Requires additional setup:

- Needs SHA-1 certificate fingerprints in Google Cloud Console
- Different requirements for development vs production
- More strict security model for deep linking

## Development vs Production

### Development Testing

- **iOS**: Works immediately with basic configuration
- **Android**: Requires debug SHA-1 fingerprint for testing
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

### Production Release

- **iOS**: No additional configuration needed
- **Android**:
  - Play Store handles SHA-1 automatically
  - All users who download from Play Store will have working authentication
  - No individual user setup required

## Current Configuration

### Environment Variables

```env
# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=892046936351-vtkq5pgrfnppnl8ndv8q5cact0pesbt3.apps.googleusercontent.com
EXPO_PUBLIC_OAUTH_REDIRECT_URL=spendingtracker://auth/callback
```

### App Configuration

```json
{
  "expo": {
    "scheme": "spendingtracker",
    "android": {
      "package": "com.yourcompany.spendingtracker",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "spendingtracker"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.spendingtracker"
    }
  }
}
```

### Supabase Redirect URLs

Currently configured URLs:

```
spendingtracker://auth/callback
exp://localhost:19000
exp://192.168.0.34:8082
http://127.0.0.1:54321/auth/v1/callback
https://[project].supabase.co/auth/v1/callback
```

## Recommendations

### For Development

1. Continue development using iOS for testing
2. Only set up Android debug SHA-1 if Android testing is necessary before release

### For Production Release

1. Upload app to Play Store (can be internal testing track)
2. Add Play Store's production SHA-1 to Google Cloud Console
3. Test authentication with production build

## Troubleshooting

### Common Issues

1. Android deep linking fails

   - Expected during development without SHA-1 configuration
   - Will resolve automatically for users downloading from Play Store

2. iOS authentication issues
   - Check Supabase redirect URLs configuration
   - Verify URL scheme in app.json

### Success Indicators

A successful authentication flow shows:

- Successful Google sign-in
- Proper token extraction
- State update with authenticated user
- Successful redirect back to app

### Verifying SHA-1 Setup

1. After adding SHA-1, wait a few minutes for Google's systems to update
2. Common error messages and solutions:

   ```
   "The application is not authorized to access the OAuth API"
   - Check if SHA-1 fingerprint matches exactly
   - Verify package name in app.json matches Google Cloud Console
   - Make sure you're using the correct keystore for your build type
   ```

3. Testing the configuration:
   - Build app in development mode
   - Try Google sign-in
   - If successful, you'll see the proper Google sign-in dialog
   - If failed, check Android Studio logcat for specific OAuth errors

### Common SHA-1 Issues

1. **Wrong Environment**

   - Debug SHA-1 won't work with release builds
   - Release SHA-1 won't work with debug builds
   - Make sure you're using the correct one for your environment

2. **Multiple SHA-1s**

   - You can add multiple SHA-1s to the same OAuth client
   - Useful for development and production builds
   - Each developer might need their debug SHA-1 added

3. **Format Issues**
   - SHA-1 should be in uppercase with colons
   - Example: `AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD`
   - Remove any extra spaces or characters

## Notes

- Current setup works perfectly on iOS devices and simulator
- Android limitations are by design for security
- No individual user setup needed once published to Play Store
