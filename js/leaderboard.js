// Leaderboard JavaScript
let leaderboardData = null;
let currentFilters = {
  hasUITree: false,
  hasLTM: false,
  sortBy: 'avg_p3'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  renderTables();
});

// Load data from JSON
async function loadData() {
  try {
    const response = await fetch('data/results.json');
    leaderboardData = await response.json();
  } catch (error) {
    console.error('Error loading leaderboard data:', error);
    document.getElementById('allTable').innerHTML = '<p class="text-center text-danger">Error loading data.</p>';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Filter checkboxes
  document.getElementById('filterUITree').addEventListener('change', (e) => {
    currentFilters.hasUITree = e.target.checked;
    renderTables();
  });
  
  document.getElementById('filterLTM').addEventListener('change', (e) => {
    currentFilters.hasLTM = e.target.checked;
    renderTables();
  });
  
  // Sort selector
  document.getElementById('sortBy').addEventListener('change', (e) => {
    currentFilters.sortBy = e.target.value;
    renderTables();
  });
  
  // Clear filters
  document.getElementById('clearFilters').addEventListener('click', () => {
    currentFilters = { hasUITree: false, hasLTM: false, sortBy: 'avg_p3' };
    document.getElementById('filterUITree').checked = false;
    document.getElementById('filterLTM').checked = false;
    document.getElementById('sortBy').value = 'avg_p3';
    renderTables();
  });
  
  // Copy bibtex
  document.getElementById('copyBibtex').addEventListener('click', () => {
    const bibtex = document.getElementById('bibtexContent').textContent;
    navigator.clipboard.writeText(bibtex).then(() => {
      const btn = document.getElementById('copyBibtex');
      btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
      setTimeout(() => {
        btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
      }, 2000);
    });
  });
}

// Filter and sort data
function getFilteredData(modelOnly = false) {
  if (!leaderboardData) return [];
  
  let data = [...leaderboardData.agents];
  
  // Filter by type if model only
  if (modelOnly) {
    data = data.filter(agent => agent.type === 'Agent-as-a-Model');
  }
  
  // Apply tag filters
  if (currentFilters.hasUITree) {
    data = data.filter(agent => agent.hasUITree);
  }
  if (currentFilters.hasLTM) {
    data = data.filter(agent => agent.hasLongTermMemory);
  }
  
  // Sort
  data.sort((a, b) => {
    if (currentFilters.sortBy === 'avg_p3') {
      return b.avg.p3 - a.avg.p3;
    } else {
      return b.avg.p1 - a.avg.p1;
    }
  });
  
  return data;
}

// Find best and second best values
function findBestValues(data) {
  const metrics = ['app1_p1', 'app1_p3', 'app2_p1', 'app2_p3', 'app3_p1', 'app3_p3', 'app4_p1', 'app4_p3',
                   'easy_p1', 'easy_p3', 'med_p1', 'med_p3', 'hard_p1', 'hard_p3', 'avg_p1', 'avg_p3',
                   'irr', 'mtpr', 'frr'];
  const best = {};
  const second = {};
  
  metrics.forEach(metric => {
    const values = data.map(agent => {
      if (metric === 'irr' || metric === 'mtpr') {
        return agent.metrics?.shortTerm?.[metric] ?? null;
      } else if (metric === 'frr') {
        return agent.metrics?.longTerm?.frr ?? null;
      }
      const [category, level] = metric.split('_');
      if (category.startsWith('app')) {
        const appKey = category.replace('app', 'app');
        return agent.crossApp[appKey] ? agent.crossApp[appKey][level] : 0;
      } else if (category === 'avg') {
        return agent.avg[level];
      } else {
        return agent.difficulty[category] ? agent.difficulty[category][level] : 0;
      }
    }).filter(v => v !== null).sort((a, b) => b - a);
    
    best[metric] = values[0] || 0;
    second[metric] = values[1] || 0;
  });
  
  return { best, second };
}

// Format score cell
function formatScore(value, metricKey, bestValues) {
  if (value === null || value === undefined) {
    return `<td class="score-cell na">-</td>`;
  }
  if (value === 0) {
    return `<td class="score-cell zero">0.0</td>`;
  }
  
  let className = 'score-cell';
  if (value === bestValues.best[metricKey] && value > 0) {
    className += ' best';
  } else if (value === bestValues.second[metricKey] && value > 0) {
    className += ' second';
  }
  
  // Format based on metric type
  let formatted;
  if (metricKey === 'mtpr') {
    formatted = value.toFixed(2);
  } else {
    formatted = value.toFixed(1);
  }
  
  return `<td class="${className}">${formatted}</td>`;
}

// Render tables
function renderTables() {
  const allData = getFilteredData(false);
  const modelData = getFilteredData(true);
  
  document.getElementById('allTable').innerHTML = createTableHTML(allData);
  document.getElementById('modelTable').innerHTML = createTableHTML(modelData);
  
  // Render Memory Metrics tables
  document.getElementById('shortTermTable').innerHTML = createShortTermTableHTML(allData);
  document.getElementById('longTermTable').innerHTML = createLongTermTableHTML(allData);
}

// Create main table HTML
function createTableHTML(data) {
  if (data.length === 0) {
    return '<p class="text-center text-muted py-4">No agents match the current filters.</p>';
  }
  
  const bestValues = findBestValues(data);
  
  let html = `
    <table class="leaderboard-table">
      <thead>
        <tr class="header-group">
          <th rowspan="3">Rank</th>
          <th rowspan="3">Model & Date</th>
          <th rowspan="3">Type</th>
          <th colspan="6">Difficulty Level</th>
          <th colspan="2" rowspan="2">Avg</th>
          <th colspan="3" rowspan="2">Memory Metrics</th>
        </tr>
        <tr class="header-group">
          <th colspan="2">Easy</th>
          <th colspan="2">Med</th>
          <th colspan="2">Hard</th>
        </tr>
        <tr class="header-subgroup">
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th title="Information Retention Rate">IRR</th>
          <th title="Memory-Task Proficiency Ratio">MTPR</th>
          <th title="Failure Recovery Rate">FRR</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.forEach((agent, index) => {
    const rank = index + 1;
    const isFirst = rank === 1;
    
    // Build tags
    let tags = '';
    if (agent.hasUITree) {
      tags += '<span class="tag tag-uitree" title="Uses UI Tree">🌳</span>';
    }
    if (agent.hasLongTermMemory) {
      tags += '<span class="tag tag-ltm" title="Long-Term Memory">🧠</span>';
    }
    
    // Build action links
    let actionLinks = '';
    if (agent.paperLink) {
      actionLinks += `<a href="${agent.paperLink}" target="_blank" class="action-link"><i class="bi bi-file-text"></i></a>`;
    }
    if (agent.codeLink) {
      actionLinks += `<a href="${agent.codeLink}" target="_blank" class="action-link"><i class="bi bi-github"></i></a>`;
    }
    if (agent.bibtex) {
      actionLinks += `<span class="action-link" onclick="showBibtex('${escapeHtml(agent.bibtex)}')"><i class="bi bi-quote"></i></span>`;
    }
    
    // Display name with backbone for workflow types
    let displayName = agent.name;
    if (agent.type === 'Agentic Workflow' && agent.backbone && agent.backbone !== '-') {
      displayName = `${agent.name}`;
    }
    
    // Get memory metrics
    const irr = agent.metrics?.shortTerm?.irr ?? null;
    const mtpr = agent.metrics?.shortTerm?.mtpr ?? null;
    const frr = agent.metrics?.longTerm?.frr ?? null;
    
    html += `
      <tr class="${isFirst ? 'first-rank' : ''}">
        <td class="rank-cell">
          ${rank}${isFirst ? '<span class="rank-star">★</span>' : ''}
        </td>
        <td class="model-cell">
          <div class="model-name">
            ${displayName}
            <div class="tags">${tags}</div>
          </div>
          <div class="model-meta">
            <span class="model-institution">${agent.institution}</span>
            <span class="model-date">${formatDate(agent.date)}</span>
          </div>
          <div class="action-links">${actionLinks}</div>
        </td>
        <td class="type-cell">
          <span class="type-badge ${agent.type === 'Agentic Workflow' ? 'workflow' : 'model'}">
            ${agent.memoryType}
          </span>
        </td>
        ${formatScore(agent.difficulty.easy.p1, 'easy_p1', bestValues)}
        ${formatScore(agent.difficulty.easy.p3, 'easy_p3', bestValues)}
        ${formatScore(agent.difficulty.medium.p1, 'med_p1', bestValues)}
        ${formatScore(agent.difficulty.medium.p3, 'med_p3', bestValues)}
        ${formatScore(agent.difficulty.hard.p1, 'hard_p1', bestValues)}
        ${formatScore(agent.difficulty.hard.p3, 'hard_p3', bestValues)}
        <td class="score-cell avg-score ${agent.avg.p1 === bestValues.best.avg_p1 ? 'best' : ''}">${agent.avg.p1.toFixed(1)}</td>
        <td class="score-cell avg-score ${agent.avg.p3 === bestValues.best.avg_p3 ? 'best' : ''}">${agent.avg.p3.toFixed(1)}</td>
        ${formatScore(irr, 'irr', bestValues)}
        ${formatScore(mtpr, 'mtpr', bestValues)}
        ${formatScore(frr, 'frr', bestValues)}
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

// Create Short-Term Memory Table
function createShortTermTableHTML(data) {
  if (data.length === 0) {
    return '<p class="text-center text-muted py-4">No data available.</p>';
  }
  
  // Sort by IRR
  const sortedData = [...data].sort((a, b) => {
    const aIrr = a.metrics?.shortTerm?.irr ?? -1;
    const bIrr = b.metrics?.shortTerm?.irr ?? -1;
    return bIrr - aIrr;
  });
  
  let html = `
    <table class="leaderboard-table compact">
      <thead>
        <tr>
          <th>#</th>
          <th>Agent</th>
          <th title="Success Rate">SR (%)</th>
          <th title="Information Retention Rate">IRR (%)</th>
          <th title="Memory-Task Proficiency Ratio">MTPR</th>
          <th title="Step Ratio">Steps</th>
          <th title="Time Per Step">Time/Step</th>
          <th title="Cost Per Step">Cost/Step</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedData.forEach((agent, index) => {
    const m = agent.metrics?.shortTerm;
    if (!m) {
      html += `
        <tr class="no-data">
          <td>${index + 1}</td>
          <td>${agent.name}</td>
          <td>${agent.avg.p1.toFixed(1)}</td>
          <td colspan="5" class="text-muted">No metrics data</td>
        </tr>
      `;
      return;
    }
    
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="agent-name-compact">${agent.name}</span>
          ${agent.hasLongTermMemory ? '<span class="tag-mini tag-ltm" title="Has LTM">🧠</span>' : ''}
        </td>
        <td>${agent.avg.p1.toFixed(1)}</td>
        <td class="${m.irr >= 30 ? 'highlight-good' : ''}">${m.irr.toFixed(1)}</td>
        <td class="${m.mtpr >= 0.3 ? 'highlight-good' : ''}">${m.mtpr.toFixed(2)}</td>
        <td>${m.stepRatio ? m.stepRatio.toFixed(2) : '-'}</td>
        <td>${m.timePerStep.toFixed(1)}s</td>
        <td>${m.costPerStep ? '$' + m.costPerStep.toFixed(3) : '-'}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

// Create Long-Term Memory Table
function createLongTermTableHTML(data) {
  if (data.length === 0) {
    return '<p class="text-center text-muted py-4">No data available.</p>';
  }
  
  // Sort by FRR
  const sortedData = [...data].sort((a, b) => {
    const aFrr = a.metrics?.longTerm?.frr ?? -1;
    const bFrr = b.metrics?.longTerm?.frr ?? -1;
    return bFrr - aFrr;
  });
  
  let html = `
    <table class="leaderboard-table compact">
      <thead>
        <tr>
          <th>#</th>
          <th>Agent</th>
          <th title="Success Rate @ 3">SR@3 (%)</th>
          <th title="Failure Recovery Rate">FRR (%)</th>
          <th title="Improvement from p@1 to p@3">Δ</th>
          <th title="Step Ratio">Steps</th>
          <th title="Time Per Step">Time/Step</th>
          <th title="Cost Per Step">Cost/Step</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedData.forEach((agent, index) => {
    const m = agent.metrics?.longTerm;
    if (!m) {
      html += `
        <tr class="no-data">
          <td>${index + 1}</td>
          <td>${agent.name}</td>
          <td>${agent.avg.p3.toFixed(1)}</td>
          <td colspan="5" class="text-muted">No metrics data</td>
        </tr>
      `;
      return;
    }
    
    const improvement = agent.avg.p3 - agent.avg.p1;
    
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="agent-name-compact">${agent.name}</span>
          ${agent.hasLongTermMemory ? '<span class="tag-mini tag-ltm" title="Has LTM">🧠</span>' : ''}
        </td>
        <td>${agent.avg.p3.toFixed(1)}</td>
        <td class="${m.frr >= 10 ? 'highlight-good' : ''}">${m.frr.toFixed(1)}</td>
        <td class="${improvement >= 10 ? 'highlight-good' : ''}">+${improvement.toFixed(1)}</td>
        <td>${m.stepRatio ? m.stepRatio.toFixed(2) : '-'}</td>
        <td>${m.timePerStep.toFixed(1)}s</td>
        <td>${m.costPerStep ? '$' + m.costPerStep.toFixed(3) : '-'}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', options);
}

// Escape HTML for bibtex
function escapeHtml(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// Show bibtex modal
function showBibtex(bibtexEscaped) {
  const bibtex = bibtexEscaped
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  
  document.getElementById('bibtexContent').textContent = bibtex;
  const modal = new bootstrap.Modal(document.getElementById('bibtexModal'));
  modal.show();
}
