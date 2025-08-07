// parse-summary.js
const fs = require('fs');

const report = JSON.parse(fs.readFileSync('./report/cucumber_report.json'));

let summary = {
  totalPassed: 0,
  totalFailed: 0,
  totalSkipped: 0,
  features: []
};

report.forEach(feature => {
  let featureData = {
    name: feature.name,
    passed: 0,
    failed: 0,
    skipped: 0,
    steps: []
  };

  feature.elements?.forEach(scenario => {
    scenario.steps?.forEach(step => {
      const stepName = step.name;
      const status = step.result?.status;

      featureData.steps.push({ stepName, status });

      if (status === "passed") {
        summary.totalPassed++;
        featureData.passed++;
      } else if (status === "failed") {
        summary.totalFailed++;
        featureData.failed++;
      } else if (status === "skipped") {
        summary.totalSkipped++;
        featureData.skipped++;
      }
    });
  });

  summary.features.push(featureData);
});

fs.writeFileSync("test-summary.json", JSON.stringify(summary, null, 2));
console.log("✅ Detailed test summary written to test-summary.json");
