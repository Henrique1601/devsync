import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskSecret, scanContent, scanDiff } from '../src/secrets.js';

// Synthetic test tokens assembled at runtime to prevent false-positive alerts in static security scanners
const DUMMY_SAMPLE_KEY = ['AIza', 'SyAbCdEfGhIjKlMnOpQrStUvWxYz1234567'].join('');
const DUMMY_GH_TOKEN = ['ghp_', '0123456789abcdefghijklmnopqrstuvwxyz'].join('');
const DUMMY_GOOGLE_KEY = ['AIza', 'SyD8G1exampleKeyValidFormat394851234'].join('');

test('maskSecret preserves boundaries and masks sensitive middle', () => {
  assert.equal(maskSecret(''), '');
  assert.equal(maskSecret('abc'), '****');
  assert.equal(maskSecret('12345678'), '****');
  assert.equal(maskSecret(DUMMY_SAMPLE_KEY), 'AIza...4567');
});

test('scanContent detects dangerous secrets and patterns', () => {
  // Clean file
  const cleanFindings = scanContent('const port = 3000;\nconsole.log(port);', 'index.js');
  assert.equal(cleanFindings.safe, true);
  assert.equal(cleanFindings.leaks.length, 0);

  // Private key
  const rsaFindings = scanContent('const key = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...`;', 'server.js');
  assert.equal(rsaFindings.safe, false);
  assert.equal(rsaFindings.leaks[0].type, 'Chave Privada');

  // GitHub Personal Access Token
  const ghFindings = scanContent(`const token = "${DUMMY_GH_TOKEN}";`, 'config.js');
  assert.equal(ghFindings.safe, false);
  assert.equal(ghFindings.leaks[0].type, 'Token GitHub');

  // AWS Access Key (official AWS documentation sample)
  const awsFindings = scanContent('AWS_KEY=AKIAIOSFODNN7EXAMPLE', 'deploy.sh');
  assert.equal(awsFindings.safe, false);
  assert.equal(awsFindings.leaks[0].type, 'Chave de Acesso AWS');

  // Google / Gemini API key
  const googleFindings = scanContent(`const geminiKey = "${DUMMY_GOOGLE_KEY}";`, 'ai.js');
  assert.equal(googleFindings.safe, false);
  assert.equal(googleFindings.leaks[0].type, 'Chave Google / Gemini API');

  // Example files are skipped safely
  const exampleFile = scanContent('AWS_KEY=AKIAIOSFODNN7EXAMPLE', 'template.example');
  assert.equal(exampleFile.safe, true);
  assert.equal(exampleFile.leaks.length, 0);
});

test('scanDiff scans added lines in unified diff', () => {
  const diffOutput = `
diff --git a/app.js b/app.js
index 1234567..89abcdef 100644
--- a/app.js
+++ b/app.js
@@ -10,3 +10,4 @@
 const x = 1;
-const oldSecret = "AKIAOLDOLDOLDEXAMPLE";
+const newSecret = "AKIAIOSFODNN7EXAMPLE";
+const normalCode = "ok";
`;

  const result = scanDiff(diffOutput);
  assert.equal(result.safe, false);
  assert.equal(result.leaks.length, 1);
  assert.equal(result.leaks[0].file, 'app.js');
  assert.equal(result.leaks[0].type, 'Chave de Acesso AWS');
  assert.equal(result.leaks[0].preview, 'AKIA...MPLE');
});
