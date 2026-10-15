# Tools, Please

Android-first calculator built with Expo and TypeScript. A top switch selects **Tip**, **Hours**, or **Currency**, with Tip selected on launch. The opening tip screen shows the bill, percentage, receipt tip and total. First launch selects 15%; subsequent launches restore the last selected percentage, including custom values and zero. Switching tools preserves the current inputs during the session and never changes the saved tip settings.

[Open the Tools, Please downloads folder](downloads/README.md) for the iPhone/browser link and the latest Android preview download.

Each tab has a matching header title and color theme: **Tip, please.** in green, **Hours, please.** in purple, and **Currency, Converter.** in blue. The active tab, header icon, controls, result cards, and surrounding background use that tool's theme. The browser page title changes with the active tab. The app's Android launcher and web app name are **Tools, Please**; existing Android installations need a newly built APK to show the new name. The package ID and Expo slug stay unchanged for update continuity. New APK downloads use the filename `tools-please-android.apk`; older releases keep their existing download links.

## Currency and hours tools

**Currency** converts between USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, KRW, NZD, SGD and HKD. Choose the source and destination, enter an amount, and press **Get latest rate**. Only the currency pair is sent to the [Frankfurter public API](https://frankfurter.dev/); the amount is not sent. No request is made at launch or just by opening the currency tool. Online rates are daily reference rates, not live bank quotes, and their reference date is displayed. Refresh to request a newer rate. Network failures are shown explicitly; the app never silently substitutes a rate.

Choose **Manual rate** to work offline: enter how many destination units equal **1 source unit**. Rates must be positive, at most 1,000,000, with up to 12 decimal places. Source amounts are limited to 999999.99 (999999 for whole-unit currencies). Conversion uses integer minor units and exact decimal-rate arithmetic, rounding half up once to destination cents or whole yen/won. Estimates exclude fees and bank markups. Changing the pair clears the rate; changing the source currency or swapping also clears the amount to avoid relabeling old money. Identical currencies use 1:1 without a network request. Conversion amounts and rates are not persisted.

**Hours** calculates a shift using start/end time pickers: Android opens a native clock picker, and iPhone/web uses the browser's time control. The opening day defaults to **9:00 AM to 5:00 PM** with no breaks, for an **8-hour total**. New days have no selected times. Use **Add break** for each unpaid break, entered in whole minutes; breaks can be edited or removed. For example, 8am to 5pm with a 30-minute lunch and a 15-minute break gives **8h 15m** (8.25 decimal hours). Select **End is next day** explicitly for overnight shifts. Total breaks cannot exceed elapsed time. The native picker dependency requires a newly built Android APK, not just a JavaScript reload.

Choose **Hours only** for any day to enter a duration without clock times, such as **8 hours**, or **7 hours and 30 minutes**. Enter whole hours and optional whole minutes (0 to 59), up to 24 hours total. This is the duration before breaks; any entered breaks are subtracted just as they are in start/end mode. Each day remembers both sets of inputs while switching modes, but only the selected mode contributes to the total.

Weekly totals update automatically as you type. Press **Save day & view weekly total** beneath the day inputs to dismiss the keyboard, confirm the entry for this session, and scroll to the weekly summary. Select a day in that summary to return to its editor. Enter valid hours before saving; Save is disabled for blank or invalid days. This button does not persist the week across app restarts.

Use **Add day** for a weekly calculator with up to seven days. Each day has an independent input mode, times or duration, and breaks. Select a day to edit it, or remove a day you do not need. New days start with unselected time controls and word-only duration prompts, not numeric example values that could look like entered hours. They show **No hours yet** in the editor and **Add hours** in the weekly summary, contributing zero while keeping the existing total visible. Choosing that day's times or entering hours updates the total immediately. Partially entered or invalid days still show errors and block the total rather than being silently skipped. The weekly summary lists each day's net time and totals elapsed time, breaks, and net time in hours/minutes and decimal hours. Day labels are sequential entries, not calendar dates, and renumber when a day is removed. Daily shifts are limited to 24 hours, with wall-clock arithmetic only: dates, time zones, and daylight-saving transitions are not calculated. Time inputs are preserved while switching tools during the session but are not persisted across launches.

## Try it

### Free iPhone and Browser Testing

Open [Tools, Please](https://TopLoader88.github.io/ToolsPlease/) in Safari on iPhone or any modern browser. The old [TipCalculator address](https://TopLoader88.github.io/TipCalculator/) redirects here, so existing shared iPhone links continue to work. No account, subscription, Apple developer membership or payment is required. GitHub Pages hosting is free for this public repository.

On iPhone, use Safari's **Share > Add to Home Screen** to add a convenient shortcut. This is the browser version, not a native App Store app. Internet is required to load it; offline startup is not guaranteed and no service worker is installed. Browser storage remembers the tip percentage, but clearing site data or private browsing can remove saved settings.

The main calculator, splitting, custom percentages and sales-tax estimates use the shared app code. Browser state lookup uses HTTPS geolocation and offline US boundaries after explicit permission. Automatic country lookup in the tipping-culture panel remains native-only; select a country manually there. This deployment does not change the existing Android APK.

The **Web Preview** workflow deploys on pushes to `main`. `npm run build:web` exports the browser app; set `WEB_BASE_PATH=/ToolsPlease` when exporting for this GitHub Pages site. Leave it unset for root-hosted/local exports. The workflow sets it automatically and requires Pages to use GitHub Actions as its build source. The separate legacy TipCalculator repository serves only the old-address redirect and compatibility downloads.

Run `npm ci`, then `npm run web -- --port 8086` for the browser preview. The VS Code task **Tip calculator: tax preview** starts the same preview. Android is the distribution target; browser preview does not support automatic country lookup.

Open **Split bill & tax** for equal shares and receipt-tax exclusion. Each person's bill and tip are divided in integer minor units, with remainders assigned explicitly.

Open **Sales tax & private purchases** within that panel to calculate sales/use tax on a separately entered purchase. Choose **Add tax** for a before-tax price or **Tax included** to extract existing tax. Enter a confirmed applicable rate; blank means unknown, not zero. No tip is added by this tool, and it does not alter the restaurant bill or saved tip percentage.

**Use location for state tax** in the sales-tax panel finds the matching state reference after you explicitly allow location. In the browser, this uses bundled US state boundaries and does not send coordinates to a geocoding service. Browser lookup requires HTTPS or localhost and covers the US only. Android uses native country/state reverse geocoding, which may require internet. Detected states and coordinates are kept only for the open panel, never saved. The entered tax rate is not automatically replaced. A country change clears a previously entered rate and clears the purchase amount if the currency changes. If access is denied, lookup times out, or coverage is missing, manual country/state search remains available.

Bundled boundaries come from [US Atlas](https://github.com/topojson/us-atlas), with point-in-boundary checks performed by D3 Geo and TopoJSON. These are approximate geographic boundaries, not address-level tax jurisdiction boundaries. Confirm the state, especially near borders; district and local rates still need separate verification.

Private-party purchase mode shows jurisdiction and item-type warnings. It does not determine exemptions or legal tax liability. Vehicles can use special taxable values, use taxes and registration rules. Enter the confirmed taxable amount, not necessarily the cash price. Fees, credits, mixed-rate items and special valuation rules are not calculated automatically.

## Tax reference coverage

- All 50 US states plus DC: general statewide reference snapshot as of July 1, 2026, not address-level combined or restaurant-specific rates.
- All 27 EU members: standard VAT table last checked by Your Europe July 13, 2026. Reduced, product-specific and special-territory rates are not inferred.
- UK, Japan, Australia, Canada, New Zealand and Singapore: sourced standard-rate and exception guidance.
- Canada guidance does not replace a province-specific taxability determination.
- Other locations: manually entered rate and currency, with no invented guidance. The sales-tax calculator supports currencies with zero, one or two minor-unit decimals; it does not convert exchange rates. Use the separate Currency tool for conversion.

Every reference shows sources and the app's review date, October 6, 2026. References never automatically fill the rate field. Consult the receipt or applicable tax authority for the exact rate. Full research links and limitations are in [docs/tax-research.md](docs/tax-research.md).

Location is optional and requested only from its panel. Only the country choice is saved, never coordinates. Native reverse geocoding may use platform location services and require network access. No background tracking. Location never changes the tip percentage. Country changes that change currency clear the old bill and tax amounts.

## Install on Android through GitHub

The **Android APK** GitHub Actions workflow runs on pushes to `main` and can be started manually. It installs dependencies, runs checks, generates native Android files, builds a bundled release APK with test signing, and uploads an artifact named `tools-please-android`.

Push a version tag such as `v1.0.2` to create a prerelease with a directly downloadable `tools-please-android.apk`. The repository is public for testers: open **Releases** or the [downloads folder](downloads/README.md) on your phone and download the APK without signing in. Allow installation from that browser when Android asks. Core calculations work without Expo Go or a computer after installation. Device lookup and external source links may need internet.

Builds include ARM64 phone and x86_64 emulator support. Android 7+ is required by this React Native version. This is a preview APK, not a Play Store production release. The generated debug signing key is for testing only; protect a dedicated production key for store distribution. Preview data/signing continuity must be planned before moving to production.

## Emulator

An existing Pixel 5 AVD named `pw` was found on this machine. Its Android SDK and Java executables were not available on the current terminal path. With Android Studio, SDK and Java configured, `npm run android` builds and launches the app. A downloaded APK can also be installed with `adb install path/to/tools-please-android.apk`. Do not modify generated native directories; change Expo configuration instead.

## Checks

```sh
npm test
npm run typecheck
npm run check:build
npx expo export --platform android --output-dir dist-android
```

`npm run assets` regenerates the PNG app icons. `npm run build:android` generates the Android project but does not compile an APK on its own.

Expo SDK 54 was selected because the initially generated SDK 58 dependency set referenced an unpublished font package. Expo doctor passed on SDK 54. npm audit still reports transitive toolchain advisories after non-breaking fixes. Review and upgrade the SDK/dependencies before production; do not force an incompatible React Native upgrade merely to clear an audit report.

## Google Play later

Choose and reserve the final package ID (currently `com.tipplease.calculator`), set up an Expo/EAS project and a Play Console developer account, configure production signing and versioning, then build an AAB with the `production` profile in [eas.json](eas.json). Complete privacy/data-safety disclosures, location-permission rationale, testing requirements, store assets and current target-SDK checks. GitHub preview signing must not be used as the production signing strategy. iOS publication is a separate future validation and signing effort.