import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('Extension Package - manifest.json schema and files exist', () => {
  const manifestPath = path.join(repoRoot, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist at repo root');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  assert.doesNotThrow(() => {
    manifest = JSON.parse(raw);
  }, 'manifest.json must parse as valid JSON');

  assert.equal(manifest.manifest_version, 3, 'Must be Chrome Manifest V3');
  assert.equal(manifest.name, 'Coursera Assistant', 'Manifest name matches');

  // Verify background service worker
  const swPath = path.join(repoRoot, manifest.background.service_worker);
  assert.ok(fs.existsSync(swPath), `Service worker ${manifest.background.service_worker} must exist`);

  // Verify popup and options page
  const popupPath = path.join(repoRoot, manifest.action.default_popup);
  assert.ok(fs.existsSync(popupPath), `Popup ${manifest.action.default_popup} must exist`);

  const optionsPath = path.join(repoRoot, manifest.options_page);
  assert.ok(fs.existsSync(optionsPath), `Options page ${manifest.options_page} must exist`);

  // Verify content scripts
  for (const cs of manifest.content_scripts) {
    if (cs.js) {
      for (const script of cs.js) {
        const sPath = path.join(repoRoot, script);
        assert.ok(fs.existsSync(sPath), `Content script ${script} must exist`);
      }
    }
    if (cs.css) {
      for (const style of cs.css) {
        const stylePath = path.join(repoRoot, style);
        assert.ok(fs.existsSync(stylePath), `Content style ${style} must exist`);
      }
    }
  }

  // Verify web accessible resources if present
  if (manifest.web_accessible_resources) {
    for (const war of manifest.web_accessible_resources) {
      for (const res of war.resources) {
        const resPath = path.join(repoRoot, res);
        assert.ok(fs.existsSync(resPath), `Web accessible resource ${res} must exist`);
      }
    }
  }

  // Verify all icon assets
  for (const [size, iconRel] of Object.entries(manifest.icons || {})) {
    const iconPath = path.join(repoRoot, iconRel);
    assert.ok(fs.existsSync(iconPath), `Icon ${size} at ${iconRel} must exist`);
  }
});

test('Extension Package - quiz-progress.html and ES module resolution', () => {
  const quizHtmlPath = path.join(repoRoot, 'quiz-progress.html');
  assert.ok(fs.existsSync(quizHtmlPath), 'quiz-progress.html must exist at repo root');

  const htmlContent = fs.readFileSync(quizHtmlPath, 'utf8');

  // Must reference existing styles
  assert.ok(htmlContent.includes('dist/ui/LatticeLoader.css'), 'References LatticeLoader.css');
  assert.ok(htmlContent.includes('dist/ui/quiz-progress.css'), 'References quiz-progress.css');
  assert.ok(fs.existsSync(path.join(repoRoot, 'dist/ui/LatticeLoader.css')), 'LatticeLoader.css exists');
  assert.ok(fs.existsSync(path.join(repoRoot, 'dist/ui/quiz-progress.css')), 'quiz-progress.css exists');

  // Verify quiz-progress.js ES module import does not use extensionless relative import
  const quizJsPath = path.join(repoRoot, 'dist/scripts/quiz-progress.js');
  const quizJsContent = fs.readFileSync(quizJsPath, 'utf8');

  assert.ok(
    quizJsContent.includes("from './LatticeLoader.js'") || quizJsContent.includes('from "./LatticeLoader.js"'),
    'quiz-progress.js must use explicit .js extension for browser ES module compatibility'
  );
  assert.ok(
    !quizJsContent.includes("from './LatticeLoader'") && !quizJsContent.includes('from "./LatticeLoader"'),
    'quiz-progress.js must not contain extensionless import ./LatticeLoader'
  );

  // Verify importmap contains LatticeLoader mappings
  assert.ok(htmlContent.includes('"./dist/scripts/LatticeLoader.js"'), 'Importmap resolves LatticeLoader.js');
});

test('Extension Package - popup.js handles tabs.sendMessage errors on non-Coursera tabs', () => {
  const popupJsPath = path.join(repoRoot, 'dist/scripts/popup.js');
  const popupJsContent = fs.readFileSync(popupJsPath, 'utf8');

  // Check sendActionToActiveTab
  const sendActionMatch = popupJsContent.match(/const sendActionToActiveTab = [\s\S]*?\n  \};/);
  assert.ok(sendActionMatch, 'sendActionToActiveTab function exists');
  assert.ok(
    sendActionMatch[0].includes('chrome.runtime.lastError'),
    'sendActionToActiveTab must handle chrome.runtime.lastError'
  );

  // Check autoQuiz click listener
  const autoQuizListenerMatch = popupJsContent.match(/autoQuizBtn\??\.addEventListener\("click"[\s\S]*?\n    \}\);/);
  assert.ok(autoQuizListenerMatch, 'autoQuiz click listener exists');
  assert.ok(
    autoQuizListenerMatch[0].includes('chrome.runtime.lastError'),
    'autoQuiz listener must handle chrome.runtime.lastError'
  );
});

test('Extension Package - storage keys consistency across settings and popup', () => {
  const settingsJsPath = path.join(repoRoot, 'dist/scripts/settings.js');
  const popupJsPath = path.join(repoRoot, 'dist/scripts/popup.js');

  const settingsContent = fs.readFileSync(settingsJsPath, 'utf8');
  const popupContent = fs.readFileSync(popupJsPath, 'utf8');

  // Both should use 'key', 'model', and 'quiz'
  assert.ok(settingsContent.includes('"key"') || settingsContent.includes("'key'"), 'settings.js uses key');
  assert.ok(settingsContent.includes('"model"') || settingsContent.includes("'model'"), 'settings.js uses model');
  assert.ok(settingsContent.includes('"quiz"') || settingsContent.includes("'quiz'"), 'settings.js uses quiz');

  assert.ok(popupContent.includes('"key"') || popupContent.includes("'key'"), 'popup.js uses key');
  assert.ok(popupContent.includes('"model"') || popupContent.includes("'model'"), 'popup.js uses model');
  assert.ok(popupContent.includes('"quiz"') || popupContent.includes("'quiz'"), 'popup.js uses quiz');
});
