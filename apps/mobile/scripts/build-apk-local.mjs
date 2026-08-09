/**
 * Windows-friendly local release APK:
 *   expo prebuild → inject EAS keystore signing → gradlew assembleRelease
 *
 * Prerequisites: JDK 17, Android SDK, `node scripts/download-android-credentials.mjs`
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const androidDir = path.join(projectDir, 'android');
const credPath = path.join(projectDir, 'credentials.json');

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? projectDir,
    stdio: 'inherit',
    shell: true,
    env: opts.env ?? process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
if (!fs.existsSync(sdk)) {
  console.error('Android SDK not found. Set ANDROID_HOME.');
  process.exit(1);
}
process.env.ANDROID_HOME = sdk;
process.env.ANDROID_SDK_ROOT = sdk;
// Force a short Gradle home — Cursor/sandbox GRADLE_USER_HOME paths exceed Win MAX_PATH (260)
const gradleHome = 'C:\\gradle-home';
fs.mkdirSync(gradleHome, { recursive: true });
process.env.GRADLE_USER_HOME = gradleHome;
console.log('GRADLE_USER_HOME=', gradleHome);

const easJson = JSON.parse(
  fs.readFileSync(path.join(projectDir, 'eas.json'), 'utf8'),
);
const apiBase =
  process.env.EXPO_PUBLIC_API_BASE ||
  easJson.build?.preview?.env?.EXPO_PUBLIC_API_BASE;
if (apiBase) process.env.EXPO_PUBLIC_API_BASE = apiBase;

if (!fs.existsSync(credPath)) {
  run('node', ['scripts/download-android-credentials.mjs']);
}
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const ks = creds.android?.keystore;
if (!ks) {
  console.error('credentials.json missing android.keystore');
  process.exit(1);
}

const keystoreSrc = path.resolve(projectDir, ks.keystorePath);
if (!fs.existsSync(keystoreSrc)) {
  console.error('Keystore file missing:', keystoreSrc);
  process.exit(1);
}

const skipPrebuild = process.env.SKIP_PREBUILD === '1' && fs.existsSync(androidDir);
if (!skipPrebuild) {
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean']);
} else {
  console.log('SKIP_PREBUILD=1 — reusing existing android/');
}

// Copy keystore into android/app for Gradle
const keystoreName = 'release.keystore';
const keystoreDest = path.join(androidDir, 'app', keystoreName);
fs.copyFileSync(keystoreSrc, keystoreDest);

const gradleProps = path.join(androidDir, 'gradle.properties');
let props = fs.readFileSync(gradleProps, 'utf8');
const block = `
# Local release signing (from EAS credentials.json — do not commit passwords)
MYAPP_UPLOAD_STORE_FILE=${keystoreName}
MYAPP_UPLOAD_KEY_ALIAS=${ks.keyAlias}
MYAPP_UPLOAD_STORE_PASSWORD=${ks.keystorePassword}
MYAPP_UPLOAD_KEY_PASSWORD=${ks.keyPassword}
`;
// Prefer arm64-only for faster local preview APKs (most modern phones)
if (!props.includes('reactNativeArchitectures=')) {
  props += '\nreactNativeArchitectures=arm64-v8a\n';
} else {
  props = props.replace(
    /reactNativeArchitectures=.*/g,
    'reactNativeArchitectures=arm64-v8a',
  );
}

if (!props.includes('MYAPP_UPLOAD_STORE_FILE')) {
  fs.writeFileSync(gradleProps, props.trimEnd() + '\n' + block);
} else {
  props = props
    .replace(/MYAPP_UPLOAD_STORE_FILE=.*/g, `MYAPP_UPLOAD_STORE_FILE=${keystoreName}`)
    .replace(/MYAPP_UPLOAD_KEY_ALIAS=.*/g, `MYAPP_UPLOAD_KEY_ALIAS=${ks.keyAlias}`)
    .replace(
      /MYAPP_UPLOAD_STORE_PASSWORD=.*/g,
      `MYAPP_UPLOAD_STORE_PASSWORD=${ks.keystorePassword}`,
    )
    .replace(
      /MYAPP_UPLOAD_KEY_PASSWORD=.*/g,
      `MYAPP_UPLOAD_KEY_PASSWORD=${ks.keyPassword}`,
    );
  fs.writeFileSync(gradleProps, props);
}

const buildGradle = path.join(androidDir, 'app', 'build.gradle');
let gradle = fs.readFileSync(buildGradle, 'utf8');
const releaseSigningBlock = `        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
`;
if (!gradle.includes('keyAlias MYAPP_UPLOAD_KEY_ALIAS')) {
  // Expo template already has signingConfigs { debug { ... } }
  gradle = gradle.replace(
    /signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n        \}\n/,
    (m) => m + releaseSigningBlock,
  );
}
// Force release buildType to use EAS upload keystore (not debug)
gradle = gradle.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
  '$1signingConfig signingConfigs.release',
);
fs.writeFileSync(buildGradle, gradle);

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(gradlew, ['assembleRelease'], { cwd: androidDir });

const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
const apks = fs.existsSync(apkDir)
  ? fs.readdirSync(apkDir).filter((f) => f.endsWith('.apk'))
  : [];
if (apks.length === 0) {
  console.error('No APK found under', apkDir);
  process.exit(1);
}

const appJson = JSON.parse(
  fs.readFileSync(path.join(projectDir, 'app.json'), 'utf8'),
);
const outName = `${appJson.expo.slug}-${appJson.expo.version}.apk`;
const outDir = path.join(projectDir, 'dist-apk');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, outName);
fs.copyFileSync(path.join(apkDir, apks[0]), outPath);

console.log('\n✅ APK ready:');
console.log(outPath);
console.log(`Size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);
