const fs = require('fs');
const path = require('path');

// Paths
const reportPath = path.join(__dirname, 'html-report', 'index.html');
const reportJsonPath = path.join(__dirname, 'report', 'cucumber_report.json');

if (!fs.existsSync(reportPath) || !fs.existsSync(reportJsonPath)) {
  console.error('❌ Required files not found.');
  process.exit(1);
}

// Prepare timeline data
const reportJson = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
const timelineData = [];

reportJson.forEach(feature => {
  (feature.elements || []).forEach(scenario => {
    const duration = (scenario.steps || []).reduce((acc, step) => {
      return acc + ((step.result?.duration || 0));
    }, 0) / 1e6;
    timelineData.push({
      label: scenario.name,
      duration: duration.toFixed(2)
    });
  });
});

// Collapsible chart block with horizontal bar chart
const chartBlock = `
<style>
  .collapsible-header {
    background-color: #f1f1f1;
    color: #333;
    cursor: pointer;
    padding: 1rem;
    width: 100%;
    border: none;
    text-align: left;
    outline: none;
    font-size: 1.2rem;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    margin-top: 1.5rem;
  }
  .collapsible-header:hover {
    background-color: #e1e1e1;
  }
  .collapsible-content {
    padding: 1rem;
    display: block;
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<button class="collapsible-header" onclick="
  const panel = document.getElementById('collapsible-chart');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  this.innerHTML = panel.style.display === 'none' ? '▶ Test Execution Timeline' : '▼ Test Execution Timeline';
">
  ▼ Test Execution Timeline
</button>
<div id="collapsible-chart" class="collapsible-content">
  <canvas id="timelineChart" style="width:100%;max-height:400px;"></canvas>
</div>

<script>
  const ctx = document.getElementById('timelineChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ${JSON.stringify(timelineData.map(t => t.label))},
      datasets: [{
        label: 'Duration (ms)',
        data: ${JSON.stringify(timelineData.map(t => parseFloat(t.duration)))},
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Scenario-wise Duration'
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Duration (ms)'
          }
        },
        y: {
          ticks: {
            autoSkip: false
          }
        }
      }
    }
  });
</script>
`;

// Injection anchor after Features Overview table block
const exactAnchor = `</table>
            </div>
        </div>
    </div>
</div>`;

let html = fs.readFileSync(reportPath, 'utf-8');

if (html.includes(exactAnchor)) {
  html = html.replace(exactAnchor, exactAnchor + chartBlock);
  fs.writeFileSync(reportPath, html, 'utf-8');
  console.log('✅ Timeline chart successfully injected after Features Overview table (Horizontal view).');
} else {
  console.warn('⚠️ Exact anchor div not found. Injection skipped.');
}
