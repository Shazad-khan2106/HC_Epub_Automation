// parse-summary.js
const fs = require('fs');

const report = JSON.parse(fs.readFileSync('./report/cucumber_report.json'));

let summary = {
  totalPassed: 0,
  totalFailed: 0,
  totalSkipped: 0,
  scenariosPassed: 0,
  scenariosFailed: 0,
  totalDuration: "0s",
  executionTime: new Date().toLocaleString(),
  features: []
};

report.forEach(feature => {
  let featureData = {
    name: feature.name,
    passed: 0,
    failed: 0,
    skipped: 0,
    scenariosPassed: 0,
    scenariosFailed: 0,
    featureDuration: "0s",
    steps: []
  };

  let featureStartTime = new Date(feature.elements?.[0]?.start_timestamp);
  let featureEndTime = new Date(featureStartTime);

  feature.elements?.forEach(scenario => {
    let scenarioPassed = true;
    let scenarioStartTime = new Date(scenario.start_timestamp);
    
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
        scenarioPassed = false;
      } else if (status === "skipped") {
        summary.totalSkipped++;
        featureData.skipped++;
      }

      // Update end time based on step timing
      if (step.result && step.result.duration) {
        const stepEndTime = new Date(scenarioStartTime.getTime() + step.result.duration);
        if (stepEndTime > featureEndTime) {
          featureEndTime = stepEndTime;
        }
      }
    });

    // Count scenarios
    if (scenarioPassed) {
      summary.scenariosPassed++;
      featureData.scenariosPassed++;
    } else {
      summary.scenariosFailed++;
      featureData.scenariosFailed++;
    }
  });

  // Calculate feature duration
  const featureDurationMs = featureEndTime - featureStartTime;
  featureData.featureDuration = formatDuration(featureDurationMs);
  
  summary.features.push(featureData);
});

// Calculate total duration
if (report.length > 0 && report[0].elements && report[0].elements.length > 0) {
  const firstFeatureStart = new Date(report[0].elements[0].start_timestamp);
  const lastFeatureEnd = new Date();
  const totalDurationMs = lastFeatureEnd - firstFeatureStart;
  summary.totalDuration = formatDuration(totalDurationMs);
} else {
  summary.totalDuration = "0s";
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

fs.writeFileSync("test-summary.json", JSON.stringify(summary, null, 2));
console.log("✅ Detailed test summary written to test-summary.json");