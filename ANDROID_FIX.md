# Android Login Fix - Summary

## Problem

Login worked on iOS Simulator but failed on Android Emulator with "something went wrong" error.

## Root Cause

**Network Architecture Differences:**

- **iOS Simulator**: Shares macOS network stack → can access `localhost` and `.test` domains from `/etc/hosts`
- **Android Emulator**: Isolated network → `localhost` points to emulator itself, cannot read Mac's `/etc/hosts`

Your API URL `http://bitedash-api.test/api/v1` uses a `.test` domain configured in your Mac's `/etc/hosts`, which:
✅ iOS Simulator can resolve
❌ Android Emulator cannot resolve

## Solution Applied

### 1. Platform-Aware URL Resolution (`lib/api/client.ts`)

Added `getPlatformBaseURL()` function that:

- **On iOS**: Uses the original URL (`http://bitedash-api.test/api/v1`)
- **On Android**: Converts `.test` domains to `10.0.2.2` → `http://10.0.2.2/api/v1`
  - `10.0.2.2` is Android's special alias for the host machine (your Mac)

### 2. Android Cleartext Traffic (`app.config.js`)

Added `usesCleartextTraffic: true` to allow HTTP traffic on Android 9+

### 3. Updated Dependencies

- `expo-secure-store`: ~15.0.8 (was ~14.0.0)
- `@react-native-async-storage/async-storage`: 2.2.0 (was 1.23.1)

### 4. Enhanced Debugging

Added comprehensive logging to help troubleshoot future issues:

- URL conversion logs
- Request/response logs
- Detailed error information

## Testing

1. **Restart Metro with clean cache:**

   ```bash
   npx expo start -c
   ```

2. **Try login on Android** - You should see in Metro logs:

   ```
   [API Client] Android detected - Converting URL:
     Original: http://bitedash-api.test/api/v1
     Android:  http://10.0.2.2/api/v1
   [API] → POST /login
   [API] ✓ 200 /login
   [API] Token stored successfully
   ```

3. **Verify the debug text on login screen** shows: `API: http://10.0.2.2/api/v1 (android)`

## For Production

When deploying to real devices or using a production API:

1. Update `.env` with your production API URL (should use HTTPS)
2. The automatic URL conversion only affects Android emulators
3. Remove `usesCleartextTraffic: true` if using HTTPS

## References

- [Android Emulator Networking](https://developer.android.com/studio/run/emulator-networking)
- [iOS Simulator vs Android Emulator Networking](https://dev.to/sskinfinite/understanding-localhost-networking-in-ios-simulator-vs-android-emulator-5ekb)
