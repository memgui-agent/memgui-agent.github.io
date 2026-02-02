// Leaderboard JavaScript
let leaderboardData = null;
let currentFilters = {
  agentType: 'all',  // 'all', 'workflow', 'model'
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
    document.getElementById('mainTable').innerHTML = '<p class="text-center text-danger">Error loading data.</p>';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Agent type filter
  document.getElementById('agentTypeFilter').addEventListener('change', (e) => {
    currentFilters.agentType = e.target.value;
    renderTables();
  });
  
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
    currentFilters = { agentType: 'all', hasUITree: false, hasLTM: false, sortBy: 'avg_p3' };
    document.getElementById('agentTypeFilter').value = 'all';
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
function getFilteredData() {
  if (!leaderboardData) return [];
  
  let data = [...leaderboardData.agents];
  
  // Filter by agent type
  if (currentFilters.agentType === 'model') {
    data = data.filter(agent => agent.type === 'Agent-as-a-Model');
  } else if (currentFilters.agentType === 'workflow') {
    data = data.filter(agent => agent.type === 'Agentic Workflow');
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
  const filteredData = getFilteredData();
  
  // Update result count
  const totalCount = leaderboardData ? leaderboardData.agents.length : 0;
  const countEl = document.getElementById('resultCount');
  if (filteredData.length < totalCount) {
    countEl.textContent = `Showing ${filteredData.length} of ${totalCount} agents`;
    countEl.style.display = 'inline';
  } else {
    countEl.style.display = 'none';
  }
  
  // Render Main Results table
  document.getElementById('mainTable').innerHTML = createTableHTML(filteredData);
  
  // Render Efficiency table
  document.getElementById('efficiencyTable').innerHTML = createEfficiencyTableHTML(filteredData);
  
  // Render Cross-App Complexity table
  document.getElementById('crossAppTable').innerHTML = createCrossAppTableHTML(filteredData);
}

// Create main table HTML
function createTableHTML(data) {
  if (data.length === 0) {
    return '<div class="empty-state"><i class="bi bi-search"></i><p>No agents match the current filters.</p></div>';
  }
  
  const bestValues = findBestValues(data);
  
  let html = `
    <table class="leaderboard-table">
      <thead>
        <tr class="header-group">
          <th rowspan="2">Rank</th>
          <th rowspan="2">Model & Date</th>
          <th rowspan="2">Type</th>
          <th colspan="2">Easy</th>
          <th colspan="2">Med</th>
          <th colspan="2">Hard</th>
          <th colspan="2">Avg</th>
          <th colspan="3">Memory</th>
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
      displayName = `${agent.name} <span class="model-backbone">w/ ${agent.backbone}</span>`;
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
            ${agent.type === 'Agentic Workflow' ? 'Workflow' : 'Model'}
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

// Create Efficiency Table
function createEfficiencyTableHTML(data) {
  if (data.length === 0) {
    return '<div class="empty-state"><i class="bi bi-search"></i><p>No agents match the current filters.</p></div>';
  }
  
  // Find best values (for efficiency, lower is better for some metrics)
  const bestStepRatio = Math.min(...data.map(a => a.metrics?.shortTerm?.stepRatio ?? 999).filter(v => v !== 999));
  const bestTime = Math.min(...data.map(a => a.metrics?.shortTerm?.timePerStep ?? 999).filter(v => v !== 999));
  const bestCost = Math.min(...data.map(a => a.metrics?.shortTerm?.costPerStep ?? 999).filter(v => v !== 999 && v !== null));
  
  let html = `
    <table class="leaderboard-table efficiency-table">
      <thead>
        <tr class="header-group">
          <th rowspan="2">Rank</th>
          <th rowspan="2">Model & Date</th>
          <th rowspan="2">Type</th>
          <th colspan="3" class="stm-header">♣ Short-Term (pass@1)</th>
          <th colspan="3" class="ltm-header">♠ Long-Term (pass@3)</th>
        </tr>
        <tr class="header-subgroup">
          <th title="Step Ratio: actual steps / golden steps">Steps</th>
          <th title="Average time per step in seconds">Time/Step</th>
          <th title="Average API cost per step">Cost/Step</th>
          <th title="Step Ratio: actual steps / golden steps">Steps</th>
          <th title="Average time per step in seconds">Time/Step</th>
          <th title="Average API cost per step">Cost/Step</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.forEach((agent, index) => {
    const stm = agent.metrics?.shortTerm;
    const ltm = agent.metrics?.longTerm;
    const rank = index + 1;
    const isFirst = rank === 1;
    
    // Build tags
    let tags = '';
    if (agent.hasUITree) tags += '<span class="tag tag-uitree" title="Uses UI Tree">🌳</span>';
    if (agent.hasLongTermMemory) tags += '<span class="tag tag-ltm" title="Long-Term Memory">🧠</span>';
    
    // Display name with backbone for workflow types
    let displayName = agent.name;
    if (agent.type === 'Agentic Workflow' && agent.backbone && agent.backbone !== '-') {
      displayName = `${agent.name} <span class="model-backbone">w/ ${agent.backbone}</span>`;
    }
    
    const formatStepRatio = (val, best) => {
      if (!val) return '<td class="score-cell na">-</td>';
      const isBest = Math.abs(val - best) < 0.01;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''} ${val <= 1.0 ? 'good-ratio' : val > 1.2 ? 'bad-ratio' : ''}">${val.toFixed(2)}</td>`;
    };
    
    const formatTime = (val, best) => {
      if (!val) return '<td class="score-cell na">-</td>';
      const isBest = Math.abs(val - best) < 0.1;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''}">${val.toFixed(1)}s</td>`;
    };
    
    const formatCost = (val, best) => {
      if (!val) return '<td class="score-cell na">-</td>';
      const isBest = Math.abs(val - best) < 0.001;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''}">${'$' + val.toFixed(4)}</td>`;
    };
    
    if (!stm && !ltm) {
      html += `
        <tr class="no-data ${isFirst ? 'first-rank' : ''}">
          <td class="rank-cell">${rank}${isFirst ? '<span class="rank-star">★</span>' : ''}</td>
          <td class="model-cell">
            <div class="model-name">${displayName}<div class="tags">${tags}</div></div>
            <div class="model-meta">
              <span class="model-institution">${agent.institution}</span>
              <span class="model-date">${formatDate(agent.date)}</span>
            </div>
          </td>
          <td class="type-cell"><span class="type-badge ${agent.type === 'Agentic Workflow' ? 'workflow' : 'model'}">${agent.type === 'Agentic Workflow' ? 'Workflow' : 'Model'}</span></td>
          <td colspan="6" class="text-muted">No efficiency data</td>
        </tr>
      `;
      return;
    }
    
    html += `
      <tr class="${isFirst ? 'first-rank' : ''}">
        <td class="rank-cell">${rank}${isFirst ? '<span class="rank-star">★</span>' : ''}</td>
        <td class="model-cell">
          <div class="model-name">${displayName}<div class="tags">${tags}</div></div>
          <div class="model-meta">
            <span class="model-institution">${agent.institution}</span>
            <span class="model-date">${formatDate(agent.date)}</span>
          </div>
        </td>
        <td class="type-cell"><span class="type-badge ${agent.type === 'Agentic Workflow' ? 'workflow' : 'model'}">${agent.type === 'Agentic Workflow' ? 'Workflow' : 'Model'}</span></td>
        ${formatStepRatio(stm?.stepRatio, bestStepRatio)}
        ${formatTime(stm?.timePerStep, bestTime)}
        ${formatCost(stm?.costPerStep, bestCost)}
        ${formatStepRatio(ltm?.stepRatio, bestStepRatio)}
        ${formatTime(ltm?.timePerStep, bestTime)}
        ${formatCost(ltm?.costPerStep, bestCost)}
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

// Create Cross-App Complexity Table (Table 4 in paper)
function createCrossAppTableHTML(data) {
  if (data.length === 0) {
    return '<div class="empty-state"><i class="bi bi-search"></i><p>No agents match the current filters.</p></div>';
  }
  
  // Find best values for highlighting
  const bestValues = findCrossAppBestValues(data);
  
  let html = `
    <table class="leaderboard-table crossapp-table">
      <thead>
        <tr class="header-group">
          <th rowspan="3">Rank</th>
          <th rowspan="3">Model & Date</th>
          <th rowspan="3">Type</th>
          <th colspan="8" class="stm-header">♣ Short-Term Memory (pass@1)</th>
          <th colspan="4" class="ltm-header">♠ Long-Term Memory (pass@3)</th>
        </tr>
        <tr class="header-group">
          <th colspan="2">1 App</th>
          <th colspan="2">2 Apps</th>
          <th colspan="2">3 Apps</th>
          <th colspan="2">4 Apps</th>
          <th>1 App</th>
          <th>2 Apps</th>
          <th>3 Apps</th>
          <th>4 Apps</th>
        </tr>
        <tr class="header-subgroup">
          <th>SR</th><th>IRR</th>
          <th>SR</th><th>IRR</th>
          <th>SR</th><th>IRR</th>
          <th>SR</th><th>IRR</th>
          <th>SR</th>
          <th>SR</th>
          <th>SR</th>
          <th>SR</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.forEach((agent, index) => {
    html += createCrossAppRow(agent, bestValues, index + 1);
  });
  
  // Task count row
  html += `
        <tr class="task-count-row">
          <td colspan="3"><strong>Task Count</strong></td>
          <td colspan="2"><strong>28</strong></td>
          <td colspan="2"><strong>56</strong></td>
          <td colspan="2"><strong>34</strong></td>
          <td colspan="2"><strong>10</strong></td>
          <td><strong>28</strong></td>
          <td><strong>56</strong></td>
          <td><strong>34</strong></td>
          <td><strong>10</strong></td>
        </tr>
      </tbody>
    </table>
  `;
  
  return html;
}

// Helper: Find best values for Cross-App table
function findCrossAppBestValues(data) {
  const metrics = ['app1_sr', 'app1_irr', 'app2_sr', 'app2_irr', 'app3_sr', 'app3_irr', 'app4_sr', 'app4_irr',
                   'app1_p3', 'app2_p3', 'app3_p3', 'app4_p3'];
  const best = {};
  const second = {};
  
  metrics.forEach(metric => {
    const values = data.map(agent => {
      const [appKey, type] = metric.split('_');
      const app = appKey.replace('app', 'app');
      if (type === 'sr') {
        return agent.crossApp[app]?.p1 ?? 0;
      } else if (type === 'irr') {
        return agent.crossApp[app]?.irr ?? null;
      } else if (type === 'p3') {
        return agent.crossApp[app]?.p3 ?? 0;
      }
      return 0;
    }).filter(v => v !== null && v > 0).sort((a, b) => b - a);
    
    best[metric] = values[0] || 0;
    second[metric] = values[1] || 0;
  });
  
  return { best, second };
}

// Helper: Create a row for Cross-App table
function createCrossAppRow(agent, bestValues, rank) {
  const ca = agent.crossApp;
  const isFirst = rank === 1;
  
  const formatCell = (value, metricKey) => {
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
    return `<td class="${className}">${value.toFixed(1)}</td>`;
  };
  
  // Build tags
  let tags = '';
  if (agent.hasUITree) tags += '<span class="tag tag-uitree" title="Uses UI Tree">🌳</span>';
  if (agent.hasLongTermMemory) tags += '<span class="tag tag-ltm" title="Long-Term Memory">🧠</span>';
  
  // Display name with backbone for workflow types
  let displayName = agent.name;
  if (agent.type === 'Agentic Workflow' && agent.backbone && agent.backbone !== '-') {
    displayName = `${agent.name} <span class="model-backbone">w/ ${agent.backbone}</span>`;
  }
  
  return `
    <tr class="${isFirst ? 'first-rank' : ''}">
      <td class="rank-cell">${rank}${isFirst ? '<span class="rank-star">★</span>' : ''}</td>
      <td class="model-cell">
        <div class="model-name">${displayName}<div class="tags">${tags}</div></div>
        <div class="model-meta">
          <span class="model-institution">${agent.institution}</span>
          <span class="model-date">${formatDate(agent.date)}</span>
        </div>
      </td>
      <td class="type-cell">
        <span class="type-badge ${agent.type === 'Agentic Workflow' ? 'workflow' : 'model'}">${agent.type === 'Agentic Workflow' ? 'Workflow' : 'Model'}</span>
      </td>
      ${formatCell(ca.app1?.p1, 'app1_sr')}
      ${formatCell(ca.app1?.irr, 'app1_irr')}
      ${formatCell(ca.app2?.p1, 'app2_sr')}
      ${formatCell(ca.app2?.irr, 'app2_irr')}
      ${formatCell(ca.app3?.p1, 'app3_sr')}
      ${formatCell(ca.app3?.irr, 'app3_irr')}
      ${formatCell(ca.app4?.p1, 'app4_sr')}
      ${formatCell(ca.app4?.irr, 'app4_irr')}
      ${formatCell(ca.app1?.p3, 'app1_p3')}
      ${formatCell(ca.app2?.p3, 'app2_p3')}
      ${formatCell(ca.app3?.p3, 'app3_p3')}
      ${formatCell(ca.app4?.p3, 'app4_p3')}
    </tr>
  `;
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
