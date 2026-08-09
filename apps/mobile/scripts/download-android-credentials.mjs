/**
 * Download Android keystore from EAS → credentials.json + credentials/android/keystore.jks
 * (gitignored). Requires existing `eas login` session.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const appJson = JSON.parse(
  fs.readFileSync(path.join(projectDir, 'app.json'), 'utf8'),
);
const owner = appJson.expo.owner;
const slug = appJson.expo.slug;
const applicationIdentifier = appJson.expo.android.package;
const projectFullName = `@${owner}/${slug}`;

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const sessionSecret = state.auth?.sessionSecret;
if (!sessionSecret) {
  console.error('No Expo session. Run: npx eas login');
  process.exit(1);
}

const query = `
query($projectFullName: String!, $applicationIdentifier: String) {
  app {
    byFullName(fullName: $projectFullName) {
      id
      androidAppCredentials(
        filter: { applicationIdentifier: $applicationIdentifier }
      ) {
        id
        applicationIdentifier
        androidAppBuildCredentialsList {
          id
          name
          isDefault
          androidKeystore {
            id
            keystore
            keystorePassword
            keyAlias
            keyPassword
          }
        }
      }
    }
  }
}`;

const res = await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'expo-session': sessionSecret,
  },
  body: JSON.stringify({
    query,
    variables: { projectFullName, applicationIdentifier },
  }),
});

const json = await res.json();
if (json.errors?.length) {
  console.error(JSON.stringify(json.errors, null, 2));
  process.exit(1);
}

const credsList =
  json.data?.app?.byFullName?.androidAppCredentials?.[0]
    ?.androidAppBuildCredentialsList ?? [];
const buildCred =
  credsList.find((c) => c.isDefault) ||
  credsList.find((c) => c.androidKeystore) ||
  credsList[0];
const ks = buildCred?.androidKeystore;
if (!ks?.keystore) {
  console.error('No Android keystore found on EAS for', projectFullName);
  process.exit(1);
}

const keystoreRel = 'credentials/android/keystore.jks';
const keystoreAbs = path.join(projectDir, keystoreRel);
fs.mkdirSync(path.dirname(keystoreAbs), { recursive: true });
fs.writeFileSync(keystoreAbs, Buffer.from(ks.keystore, 'base64'));

const credentialsJson = {
  android: {
    keystore: {
      keystorePath: keystoreRel,
      keystorePassword: ks.keystorePassword,
      keyAlias: ks.keyAlias,
      keyPassword: ks.keyPassword,
    },
  },
};
fs.writeFileSync(
  path.join(projectDir, 'credentials.json'),
  JSON.stringify(credentialsJson, null, 2) + '\n',
);

console.log('Wrote', keystoreRel);
console.log('Wrote credentials.json');
console.log('Alias:', ks.keyAlias);
console.log('Project:', projectFullName, applicationIdentifier);
