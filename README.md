# Nirbhaya (निर्भया) 🛡️

> *"Bina dare, har raah pe"* — An offline personal safety companion Android application built with React Native CLI (Bare Workflow, NO Expo) and TypeScript.

---

## 🌟 Highlights & Features

1. **100% Offline Emergency Dispatch**:
   - Uses a custom native Kotlin module (`SmsModule`) communicating directly with Android's `SmsManager`.
   - Sends emergency SMS with live GPS Google Maps tracking links directly over cellular radio — **no internet connection or third-party SMS app required**.
   - Real-time per-contact delivery monitoring and retry mechanism for failed dispatches.

2. **Smart Walk Companion**:
   - High-accuracy GPS route tracking using `react-native-geolocation-service`.
   - Displays live coordinates, elapsed walk duration, and distance traveled from starting point.
   - **Route Deviation Alert**: Automatically warns the user with a distinct vibration pattern and yellow warning alert if displacement exceeds **300 meters**.

3. **Emergency SOS Trigger (2-Second Hold Guard)**:
   - Big pulsating red SOS button requiring a deliberate **2-second hold** to avoid false pocket triggers.
   - Immediate cancellable 3-second countdown if "I'm Unsafe" action button is tapped.
   - Full emergency dispatch: resolves current coordinates, transmits SMS to up to 3 emergency contacts, and triggers a wailing siren and SOS vibration sequence.

4. **Realistic Fake Call ("Maa")**:
   - Authentic full-screen incoming call UI with caller name "Maa ❤️".
   - Continuous looping ringtone and rhythmic vibration.
   - **Accept**: switches seamlessly into an active in-call screen with live duration counter and call controls (Mute, Speaker, Keypad, End).
   - **Decline**: instantly silences ringtone/vibrations and returns to Walk Mode or previous screen.

5. **Demo Mode (Delhi / Connaught Place)**:
   - One-tap switch on the Home screen to simulate walks starting from fixed coordinates `28.6139, 77.2090`.
   - Simulates movement along an outbound trajectory to test the >300m deviation alert and SMS dispatch without needing physical outdoor travel.

6. **Premium Dark Aesthetic**:
   - Designed around `#0D0D0F` dark canvas, `#E11D48` crimson SOS highlights, smooth typography, and glassmorphic micro-animations.

---

## 📱 Screens

| Screen | Description |
|---|---|
| **Splash** | Nirbhaya glowing shield logo and tagline *"Bina dare, har raah pe"*; auto-advances after 1.5 seconds. |
| **Home** | Primary CTA `START WALK MODE`, emergency contacts manager (saves up to 3 contacts to `AsyncStorage`), and Demo Mode toggle. |
| **WalkMode** | Live coordinate HUD, distance from origin, >300m deviation alert, and 3 primary actions: **Green** ("I'm Safe" - end walk), **Yellow** ("Feeling Uneasy" - trigger Fake Call), and **Red** ("I'm Unsafe" / 2s hold SOS button). |
| **FakeCall** | Incoming phone call UI with animated avatar halo, Accept/Decline triggers, audio loop, vibration, and connected call timer. |

---

## 🛠️ Architecture & Tech Stack

- **Framework**: React Native 0.76.x (Bare CLI, strictly NO Expo)
- **Language**: TypeScript (`strict: true`)
- **State & Persistence**: `@react-native-async-storage/async-storage`
- **Geolocation**: `react-native-geolocation-service`
- **Audio & Haptics**: `react-native-sound` + React Native `Vibration` API
- **Native Android Modules**:
  - `android/app/src/main/java/com/nirbhaya/sms/SmsModule.kt`: Custom `ReactContextBaseJavaModule` utilizing `SmsManager` and broadcast receiver for sent intent radio confirmations.
  - `android/app/src/main/java/com/nirbhaya/sms/SmsPackage.kt`: Registered in `MainApplication.kt`.
- **TypeScript Native Wrapper**: `src/native/SmsModule.ts`

---

## 🔐 Permissions Configured

Declared in `android/app/src/main/AndroidManifest.xml`:
- `android.permission.SEND_SMS` (Direct SMS dispatch during SOS)
- `android.permission.ACCESS_FINE_LOCATION` (GPS tracking)
- `android.permission.ACCESS_COARSE_LOCATION` (Network location fallback)
- `android.permission.VIBRATE` (Tactile feedback, ringtone rhythm, SOS alarm)
- `android.permission.WAKE_LOCK` (Keeps CPU awake during emergency dispatch)

Runtime permission requests are handled gracefully in `src/services/permissions.ts`.

---

## 🚀 Setup & Local Development

### Prerequisites
1. **Node.js**: v18 or v20+
2. **Java Development Kit (JDK)**: JDK 17 (Temurin recommended)
3. **Android Studio**: Android SDK Platform 34+, Android SDK Build-Tools, and an Android Emulator or physical device with USB debugging enabled.

### Installation

1. Clone repository and navigate to root:
   ```bash
   git clone <repo-url>
   cd nirbhaya
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure sound assets are generated:
   ```bash
   node scripts/generate-sounds.js
   ```
   *(Generates bundled `ringtone.wav` and `siren.wav` in `android/app/src/main/res/raw/`)*

4. Run unit tests & type checking:
   ```bash
   npm run typecheck
   npm test
   ```

### Running on Android Device or Emulator

1. Start Metro bundler:
   ```bash
   npm start
   ```

2. In a separate terminal, install and launch the Android debug build:
   ```bash
   npm run android
   ```

---

## 📦 Building the Debug APK

To compile the standalone debug APK manually:

```bash
cd android
./gradlew assembleDebug --no-daemon
```
The output APK is generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🤖 CI/CD Workflow (GitHub Actions)

A preconfigured GitHub Actions workflow is located at `.github/workflows/build-apk.yml`:
- Runs automatically on every push to `main` or manual trigger via `workflow_dispatch`.
- Sets up Node 20 and JDK 17 (Temurin).
- Runs `tsc --noEmit` and `jest --ci`.
- Executes `./gradlew assembleDebug --no-daemon`.
- Uploads the debug APK as an artifact named `nirbhaya-debug-apk` via `actions/upload-artifact@v4`.
