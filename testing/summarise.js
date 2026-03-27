// tests/summarise.js
// Reads test-results.json and prints a markdown summary
// Used by GitHub Actions: node tests/summarise.js >> $GITHUB_STEP_SUMMARY

const fs   = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'test-results.json');

if (!fs.existsSync(resultsPath)) {
  console.log('## ⚠️ Test Results\nNo test-results.json found.');
  process.exit(0);
}

const raw     = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const suites  = raw.suites || [];

let passed = 0, failed = 0, skipped = 0;
const failures = [];

function walk(suite) {
  for (const spec of (suite.specs || [])) {
    for (const test of (spec.tests || [])) {
      const status = test.results?.[0]?.status;
      if      (status === 'passed')  passed++;
      else if (status === 'skipped') skipped++;
      else {
        failed++;
        const err = test.results?.[0]?.error?.message || 'Unknown error';
        failures.push({ title: `${suite.title} › ${spec.title}`, error: err.split('\n')[0] });
      }
    }
  }
  for (const child of (suite.suites || [])) walk(child);
}

suites.forEach(walk);

const total  = passed + failed + skipped;
const pct    = total > 0 ? Math.round((passed / total) * 100) : 0;
const icon   = failed === 0 ? '✅' : '❌';
const badge  = failed === 0 ? '🟢 All tests passed' : `🔴 ${failed} test(s) failed`;

console.log(`## ${icon} Test Results — ${badge}`);
console.log('');
console.log(`| Metric | Value |`);
console.log(`|--------|-------|`);
console.log(`| ✅ Passed  | ${passed} |`);
console.log(`| ❌ Failed  | ${failed} |`);
console.log(`| ⏭ Skipped | ${skipped} |`);
console.log(`| 📊 Total   | ${total} |`);
console.log(`| 🎯 Pass rate | ${pct}% |`);
console.log('');

if (failures.length > 0) {
  console.log('### ❌ Failed Tests');
  console.log('');
  console.log('| Test | Error |');
  console.log('|------|-------|');
  failures.forEach(f => {
    const safe = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').substring(0, 120);
    console.log(`| ${safe(f.title)} | ${safe(f.error)} |`);
  });
  console.log('');
  console.log('> 📥 Download the full HTML report from the **Artifacts** section above for screenshots and traces.');
}

console.log('');
console.log('### 📋 Coverage');
console.log('');
console.log('| Area | Tests |');
console.log('|------|-------|');
console.log('| 🏠 Index page | Grid layout, card count, card tags, links |');
console.log('| 🔊 Audio | Proxy, pill, play/stop/seek, speed ± |');
console.log('| ↕ Scroll | Pill, default speed, 0.05 steps, auto-scroll |');
console.log('| 🔤 Font size | No CSS hardcode, A+/A−, localStorage, em scaling |');
console.log('| 💬 Comments | FAB, panel, API, form validation |');
console.log('| 💛 Donate | Presets, custom amount, PayPal button |');
console.log('| 🔍 Nav/Search | Home link, search, progress bar |');
console.log('| 📱 Mobile 360px | Overflow, pill fit, font size |');
