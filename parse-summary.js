// parse-summary.js
const fs = require('fs');

const report = JSON.parse(fs.readFileSync('./report/cucumber_report.json'));

let summary = {
  totalPassed: 0,
  totalFailed: 0,
  totalSkipped: 0,
  totalSteps: 0,
  scenariosPassed: 0,
  scenariosFailed: 0,
  totalScenarios: 0,
  totalDuration: "0s",
  executionTime: new Date().toLocaleString(),
  overallStatus: "Success",
  passPercentage: 0,
  features: []
};

// Track overall timing
let overallStartTime = null;
let overallEndTime = null;

report.forEach(feature => {
  let featureData = {
    name: feature.name || "Unnamed Feature",
    passed: 0,
    failed: 0,
    skipped: 0,
    totalSteps: 0,
    scenariosPassed: 0,
    scenariosFailed: 0,
    totalScenarios: 0,
    featureDuration: "0s",
    steps: []
  };

  feature.elements?.forEach(scenario => {
    featureData.totalScenarios++;
    summary.totalScenarios++;
    
    let scenarioPassed = true;
    let scenarioHasSteps = false;
    let scenarioStartTime = null;
    let scenarioEndTime = null;

    scenario.steps?.forEach(step => {
      // Skip Before/After hooks for step counting but include for timing
      if (step.keyword === 'Before' || step.keyword === 'After') {
        // Use hook timing for duration calculation
        if (step.result && step.result.duration) {
          const stepTime = new Date(scenario.start_timestamp || feature.start_timestamp || new Date());
          const stepEndTime = new Date(stepTime.getTime() + step.result.duration);
          
          if (!scenarioStartTime || stepTime < scenarioStartTime) {
            scenarioStartTime = stepTime;
          }
          if (!scenarioEndTime || stepEndTime > scenarioEndTime) {
            scenarioEndTime = stepEndTime;
          }
        }
        return;
      }

      scenarioHasSteps = true;
      featureData.totalSteps++;
      summary.totalSteps++;
      
      const stepName = step.name || "Unnamed Step";
      const status = step.result?.status || "unknown";

      featureData.steps.push({ 
        stepName, 
        status,
        duration: step.result?.duration ? formatDuration(step.result.duration) : "0s"
      });

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
        // Consider skipped steps as failures for overall status
        scenarioPassed = false;
      }

      // Update timing for regular steps
      if (step.result && step.result.duration) {
        const stepTime = new Date(scenario.start_timestamp || feature.start_timestamp || new Date());
        const stepEndTime = new Date(stepTime.getTime() + step.result.duration);
        
        if (!scenarioStartTime || stepTime < scenarioStartTime) {
          scenarioStartTime = stepTime;
        }
        if (!scenarioEndTime || stepEndTime > scenarioEndTime) {
          scenarioEndTime = stepEndTime;
        }

        // Update overall timing
        if (!overallStartTime || stepTime < overallStartTime) {
          overallStartTime = stepTime;
        }
        if (!overallEndTime || stepEndTime > overallEndTime) {
          overallEndTime = stepEndTime;
        }
      }
    });

    // Count scenarios - only count if scenario has actual test steps
    if (scenarioHasSteps) {
      if (scenarioPassed) {
        summary.scenariosPassed++;
        featureData.scenariosPassed++;
      } else {
        summary.scenariosFailed++;
        featureData.scenariosFailed++;
      }
    }

    // Calculate scenario duration
    if (scenarioStartTime && scenarioEndTime) {
      const scenarioDurationMs = scenarioEndTime - scenarioStartTime;
      // This could be stored if needed for per-scenario duration
    }
  });

  // Calculate feature duration based on scenario timings
  // For simplicity, we'll use overall timing or calculate from steps
  if (feature.elements && feature.elements.length > 0 && feature.elements[0].start_timestamp) {
    const featureStartTime = new Date(feature.elements[0].start_timestamp);
    let featureEndTime = featureStartTime;
    
    // Find the latest end time in the feature
    feature.elements.forEach(scenario => {
      scenario.steps?.forEach(step => {
        if (step.result && step.result.duration) {
          const stepTime = new Date(scenario.start_timestamp || feature.start_timestamp);
          const stepEndTime = new Date(stepTime.getTime() + step.result.duration);
          if (stepEndTime > featureEndTime) {
            featureEndTime = stepEndTime;
          }
        }
      });
    });
    
    const featureDurationMs = featureEndTime - featureStartTime;
    featureData.featureDuration = formatDuration(featureDurationMs);
  } else {
    featureData.featureDuration = "0s";
  }
  
  summary.features.push(featureData);
});

// Calculate total duration
if (overallStartTime && overallEndTime) {
  const totalDurationMs = overallEndTime - overallStartTime;
  summary.totalDuration = formatDuration(totalDurationMs);
} else {
  summary.totalDuration = "0s";
}

// Calculate overall status and percentage
// Overall status should be Success only if ALL steps passed (no failures or skips)
if (summary.totalFailed > 0 || summary.totalSkipped > 0) {
  summary.overallStatus = "Failed";
} else {
  summary.overallStatus = "Success";
}

// Calculate pass percentage based on executed steps (excluding skipped if you want)
// Option 1: Count skipped as failures
const totalExecutedSteps = summary.totalPassed + summary.totalFailed + summary.totalSkipped;
if (totalExecutedSteps > 0) {
  summary.passPercentage = Math.round((summary.totalPassed / totalExecutedSteps) * 100);
}

// Option 2: Count only passed vs total possible (including skipped)
// if (summary.totalSteps > 0) {
//   summary.passPercentage = Math.round((summary.totalPassed / summary.totalSteps) * 100);
// }

function formatDuration(nanoseconds) {
  // Convert nanoseconds to milliseconds
  const ms = nanoseconds / 1000000;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else if (seconds > 0) {
    return `${seconds}s`;
  } else {
    return `${Math.round(ms)}ms`;
  }
}

// Enhanced logging for debugging
console.log("📊 Test Summary:");
console.log(`Total Steps: ${summary.totalSteps}`);
console.log(`Passed: ${summary.totalPassed}`);
console.log(`Failed: ${summary.totalFailed}`);
console.log(`Skipped: ${summary.totalSkipped}`);
console.log(`Overall Status: ${summary.overallStatus}`);
console.log(`Pass Percentage: ${summary.passPercentage}%`);
console.log(`Total Duration: ${summary.totalDuration}`);

fs.writeFileSync("test-summary.json", JSON.stringify(summary, null, 2));
console.log("✅ Detailed test summary written to test-summary.json");