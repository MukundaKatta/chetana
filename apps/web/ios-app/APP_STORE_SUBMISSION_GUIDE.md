# Chetana - Apple App Store Submission Guide

Complete step-by-step guide to submit Chetana to the Apple App Store.

---

## Prerequisites

- **macOS** computer (required for Xcode)
- **Xcode 16+** installed from Mac App Store
- **Apple Developer Account** ($99/year) — https://developer.apple.com
- **Node.js 18+** and **pnpm** installed
- **CocoaPods** — `sudo gem install cocoapods`
- **Fastlane** — `brew install fastlane`

---

## Step 1: Configure Your Developer Account Details

### 1.1 Update Fastlane Appfile

Edit `ios-app/fastlane/Appfile` with your details:

```ruby
apple_id("your-apple-id@email.com")    # Your Apple ID
app_identifier("com.chetana.consciousness")  # Bundle ID
team_id("XXXXXXXXXX")                   # Developer Team ID
itc_team_id("XXXXXXXXXX")              # App Store Connect Team ID
```

**Finding your Team IDs:**
- Developer Team ID: https://developer.apple.com/account → Membership → Team ID
- App Store Connect Team ID: Usually the same, or find it in App Store Connect → Users & Access

### 1.2 Update ExportOptions.plist

Edit `ios-app/ExportOptions.plist` and replace `YOUR_TEAM_ID` with your actual Team ID.

### 1.3 Update Capacitor Config

Edit `capacitor.config.ts` if you want to change the Bundle ID.

---

## Step 2: Install Dependencies & Initialize iOS Project

```bash
# From the apps/web directory
cd apps/web

# Install Capacitor and dependencies
pnpm add @capacitor/core @capacitor/ios @capacitor/cli
pnpm add @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard

# Build the Next.js app as static export
pnpm build

# Initialize Capacitor iOS project
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

---

## Step 3: Generate App Icons

You need a 1024x1024 PNG icon (no transparency, no rounded corners).

**Option A: Use the script (requires ImageMagick)**
```bash
brew install imagemagick
chmod +x scripts/generate-icons.sh
./scripts/generate-icons.sh path/to/your-icon-1024.png
```

**Option B: Manual**
Use https://www.appicon.co/ — upload your 1024x1024 PNG and download the generated icon set. Place the icons in:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

**Icon Design Guidelines:**
- No transparency (use solid background)
- No rounded corners (iOS adds them)
- Simple, recognizable at small sizes
- Suggested: Purple/dark background (#030712) with brain/consciousness symbol

---

## Step 4: Configure Xcode Project

```bash
# Open in Xcode
npx cap open ios
```

In Xcode:
1. **Select the "App" target** in the project navigator
2. **General tab:**
   - Display Name: `Chetana`
   - Bundle Identifier: `com.chetana.consciousness`
   - Version: `1.0.0`
   - Build: `1`
   - Deployment Target: `iOS 16.0` (minimum recommended)
   - Devices: iPhone + iPad (Universal)

3. **Signing & Capabilities tab:**
   - Check "Automatically manage signing"
   - Select your Team from the dropdown
   - Xcode will create provisioning profiles automatically

4. **Info tab → Custom iOS Target Properties:**
   - Ensure `Privacy - Camera Usage Description` is removed (we don't use camera)
   - Add if needed: `App Transport Security Settings` → `Allow Arbitrary Loads` = NO

---

## Step 5: App Store Connect Setup

### 5.1 Register the App

Go to https://appstoreconnect.apple.com

1. Click **My Apps** → **+** → **New App**
2. Fill in:
   - **Platform:** iOS
   - **Name:** Chetana - AI Consciousness
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** Select `com.chetana.consciousness`
   - **SKU:** `com.chetana.consciousness.100`
   - **User Access:** Full Access

Or use Fastlane:
```bash
cd ios-app
fastlane create_app
```

### 5.2 App Information (in App Store Connect)

| Field | Value |
|-------|-------|
| **Category** | Education |
| **Secondary Category** | Reference |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 4+ (no objectionable content) |

### 5.3 Pricing

- Select **Free** (or your preferred pricing tier)
- Available in all territories (recommended)

---

## Step 6: Prepare Screenshots

Apple requires screenshots for specific device sizes:

| Device | Size (pixels) | Required |
|--------|---------------|----------|
| iPhone 6.9" (16 Pro Max) | 1320 x 2868 | YES |
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | YES |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Optional |
| iPad Pro 13" | 2064 x 2752 | If supporting iPad |

**Tips for great screenshots:**
1. Run the app in Simulator for each device size
2. Navigate to key screens:
   - Home/Dashboard showing consciousness theories
   - Audit in progress with real-time scoring
   - Results page with radar chart visualization
   - Cross-model comparison/leaderboard
   - Probe detail with evidence analysis
3. Use Cmd+S in Simulator to save screenshots
4. Optional: Add marketing text overlays using tools like Sketch, Figma, or https://screenshots.pro

**Using Fastlane Snapshot (automated):**
```bash
cd ios-app
fastlane screenshots
```

---

## Step 7: Build & Upload

### Option A: Using Fastlane (Recommended)

```bash
cd apps/web/ios-app

# For TestFlight (beta testing first):
fastlane beta

# For App Store submission:
fastlane release
```

### Option B: Using Xcode

1. In Xcode: **Product** → **Archive**
2. When archive completes, click **Distribute App**
3. Select **App Store Connect** → **Upload**
4. Follow the wizard, selecting your signing certificates
5. Wait for processing in App Store Connect (usually 15-30 min)

---

## Step 8: Submit for Review

### In App Store Connect:

1. Go to your app → **App Store** tab
2. Fill in **Version Information:**
   - **What's New:** (see `metadata/en-US/release_notes.txt`)
   - **Description:** (see `metadata/en-US/description.txt`)
   - **Keywords:** (see `metadata/en-US/keywords.txt`)
   - **Promotional Text:** (see `metadata/en-US/promotional_text.txt`)
   - **Support URL:** https://github.com/MukundaKatta/chetana/issues
   - **Marketing URL:** https://mukundakatta.github.io/chetana/

3. Upload **Screenshots** for each required device size

4. **App Review Information:**
   - Contact: Your name, email, phone
   - Demo Account: Not required (app has demo mode)
   - Notes for reviewer:
     ```
     Chetana is an AI consciousness research platform. You can try it
     without creating an account using the built-in demo mode. The app
     tests AI models against scientific consciousness indicators from
     the Butlin et al. (2025) research framework.

     To test: Open the app → Tap "Start Audit" → Select Demo Mode →
     Choose any AI model → Run the consciousness test.

     No API keys are needed for demo mode.
     ```

5. **App Privacy:**
   - Privacy Policy URL: https://mukundakatta.github.io/chetana/privacy
   - Data collection:
     - **Contact Info** (Email): Collected for account registration
     - **Usage Data**: Collected for app improvement
     - **Identifiers**: User ID for account functionality

6. **Build:** Select the uploaded build

7. Click **Submit for Review**

---

## Step 9: Review Process

- **Typical review time:** 24-48 hours (sometimes faster)
- **Status updates:** You'll receive email notifications
- **If rejected:** Read the rejection notes carefully, fix issues, and resubmit

### Common Rejection Reasons & How to Avoid Them:

| Reason | Prevention |
|--------|-----------|
| Crashes or bugs | Test thoroughly on real devices |
| Broken links | Verify all URLs work |
| Incomplete metadata | Fill in ALL required fields |
| Missing privacy policy | We've created one at `/privacy` |
| Guideline 4.2 (minimum functionality) | Our app has substantial native-like features |
| API key requirement without demo | We have demo mode |

---

## Quick Reference: Key Files

```
apps/web/
├── capacitor.config.ts          # Capacitor configuration
├── next.config.ts               # Next.js (static export enabled)
├── app/privacy/page.tsx         # Privacy policy page
├── scripts/generate-icons.sh    # iOS icon generator
└── ios-app/
    ├── ExportOptions.plist      # Xcode export settings
    └── fastlane/
        ├── Appfile              # Apple account config
        ├── Fastfile             # Build & submission lanes
        └── metadata/en-US/     # App Store listing text
            ├── name.txt
            ├── subtitle.txt
            ├── description.txt
            ├── keywords.txt
            ├── promotional_text.txt
            ├── privacy_url.txt
            ├── support_url.txt
            ├── marketing_url.txt
            └── release_notes.txt
```

---

## App Store Review Checklist

Before submitting, verify:

- [ ] App runs without crashes on iPhone and iPad
- [ ] Demo mode works without login or API keys
- [ ] Privacy policy page is accessible
- [ ] All screenshots are captured and uploaded
- [ ] App icon is set (1024x1024, no transparency)
- [ ] Bundle ID matches App Store Connect
- [ ] Version number is set correctly
- [ ] All metadata fields are filled in
- [ ] Age rating questionnaire is completed
- [ ] Export compliance answered (no encryption = exempt)
- [ ] Contact info for review team is provided
- [ ] Review notes explain how to test the app
