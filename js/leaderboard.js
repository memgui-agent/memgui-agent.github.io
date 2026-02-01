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
                   'easy_p1', 'easy_p3', 'med_p1', 'med_p3', 'hard_p1', 'hard_p3', 'avg_p1', 'avg_p3'];
  const best = {};
  const second = {};
  
  metrics.forEach(metric => {
    const values = data.map(agent => {
      const [category, level] = metric.split('_');
      if (category.startsWith('app')) {
        const appKey = category.replace('app', 'app');
        return agent.crossApp[appKey] ? agent.crossApp[appKey][level] : 0;
      } else if (category === 'avg') {
        return agent.avg[level];
      } else {
        return agent.difficulty[category] ? agent.difficulty[category][level] : 0;
      }
    }).sort((a, b) => b - a);
    
    best[metric] = values[0] || 0;
    second[metric] = values[1] || 0;
  });
  
  return { best, second };
}

// Format score cell
function formatScore(value, metricKey, bestValues) {
  if (value === 0) {
    return `<td class="score-cell zero">0.0</td>`;
  }
  
  let className = 'score-cell';
  if (value === bestValues.best[metricKey] && value > 0) {
    className += ' best';
  } else if (value === bestValues.second[metricKey] && value > 0) {
    className += ' second';
  }
  
  return `<td class="${className}">${value.toFixed(1)}</td>`;
}

// Render tables
function renderTables() {
  const allData = getFilteredData(false);
  const modelData = getFilteredData(true);
  
  document.getElementById('allTable').innerHTML = createTableHTML(allData);
  document.getElementById('modelTable').innerHTML = createTableHTML(modelData);
}

// Create table HTML
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
          <th colspan="8">#Cross App</th>
          <th colspan="6">Difficulty Level</th>
          <th colspan="2" rowspan="2">Avg</th>
        </tr>
        <tr class="header-group">
          <th colspan="2">1 App</th>
          <th colspan="2">2 App</th>
          <th colspan="2">3 App</th>
          <th colspan="2">4 App</th>
          <th colspan="2">Easy</th>
          <th colspan="2">Med</th>
          <th colspan="2">Hard</th>
        </tr>
        <tr class="header-subgroup">
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
          <th>p@1</th><th>p@3</th>
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
      actionLinks += `<a href="${agent.paperLink}" target="_blank" class="action-link"><i class="bi bi-file-text"></i> Paper</a>`;
    }
    if (agent.codeLink) {
      actionLinks += `<a href="${agent.codeLink}" target="_blank" class="action-link"><i class="bi bi-github"></i> Code</a>`;
    }
    if (agent.bibtex) {
      actionLinks += `<span class="action-link" onclick="showBibtex('${escapeHtml(agent.bibtex)}')"><i class="bi bi-quote"></i> BibTeX</span>`;
    }
    
    // Display name with backbone for workflow types
    let displayName = agent.name;
    if (agent.type === 'Agentic Workflow' && agent.backbone && agent.backbone !== '-') {
      displayName = `${agent.name} w/ ${agent.backbone}`;
    }
    
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
          <div class="model-institution">${agent.institution}</div>
          <div class="model-date"><i class="bi bi-calendar"></i> ${formatDate(agent.date)}</div>
          <div class="model-authors">
            ${agent.paperLink ? 
              `<a href="${agent.paperLink}" target="_blank">${agent.authors}</a>` : 
              `<span style="color: #6c757d; font-size: 0.85em;">${agent.authors}</span>`}
          </div>
          <div class="action-links">${actionLinks}</div>
        </td>
        <td class="type-cell">
          <span class="type-badge ${agent.type === 'Agentic Workflow' ? 'workflow' : 'model'}">
            ${agent.memoryType}
          </span>
        </td>
        ${formatScore(agent.crossApp.app1.p1, 'app1_p1', bestValues)}
        ${formatScore(agent.crossApp.app1.p3, 'app1_p3', bestValues)}
        ${formatScore(agent.crossApp.app2.p1, 'app2_p1', bestValues)}
        ${formatScore(agent.crossApp.app2.p3, 'app2_p3', bestValues)}
        ${formatScore(agent.crossApp.app3.p1, 'app3_p1', bestValues)}
        ${formatScore(agent.crossApp.app3.p3, 'app3_p3', bestValues)}
        ${formatScore(agent.crossApp.app4.p1, 'app4_p1', bestValues)}
        ${formatScore(agent.crossApp.app4.p3, 'app4_p3', bestValues)}
        ${formatScore(agent.difficulty.easy.p1, 'easy_p1', bestValues)}
        ${formatScore(agent.difficulty.easy.p3, 'easy_p3', bestValues)}
        ${formatScore(agent.difficulty.medium.p1, 'med_p1', bestValues)}
        ${formatScore(agent.difficulty.medium.p3, 'med_p3', bestValues)}
        ${formatScore(agent.difficulty.hard.p1, 'hard_p1', bestValues)}
        ${formatScore(agent.difficulty.hard.p3, 'hard_p3', bestValues)}
        <td class="score-cell avg-score ${agent.avg.p1 === findBestValues(data).best.avg_p1 ? 'best' : ''}">${agent.avg.p1.toFixed(1)}</td>
        <td class="score-cell avg-score ${agent.avg.p3 === findBestValues(data).best.avg_p3 ? 'best' : ''}">${agent.avg.p3.toFixed(1)}</td>
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
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
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
