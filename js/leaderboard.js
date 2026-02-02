// Leaderboard JavaScript
let leaderboardData = null;
let currentFilters = {
  agentType: 'all',  // 'all', 'workflow', 'model'
  uiTree: 'all',     // 'all', 'with', 'without'
  ltm: 'all',        // 'all', 'with', 'without'
  sortBy: 'avg_p3_desc'
};

// Sort options for each tab
const sortOptions = {
  main: [
    { value: 'avg_p3_desc', label: 'Avg p@3 ↓' },
    { value: 'avg_p1_desc', label: 'Avg p@1 ↓' },
    { value: 'easy_p3_desc', label: 'Easy p@3 ↓' },
    { value: 'med_p3_desc', label: 'Med p@3 ↓' },
    { value: 'hard_p3_desc', label: 'Hard p@3 ↓' },
    { value: 'irr_desc', label: 'IRR ↓' },
    { value: 'mtpr_desc', label: 'MTPR ↓' },
    { value: 'frr_desc', label: 'FRR ↓' }
  ],
  crossapp: [
    { value: 'avg_p3_desc', label: 'Avg p@3 ↓' },
    { value: 'avg_p1_desc', label: 'Avg p@1 ↓' },
    { value: 'irr_desc', label: 'Avg IRR ↓' },
    { value: 'app1_sr_desc', label: '1App p@1 ↓' },
    { value: 'app1_p3_desc', label: '1App p@3 ↓' },
    { value: 'app1_irr_desc', label: '1App IRR ↓' },
    { value: 'app2_sr_desc', label: '2App p@1 ↓' },
    { value: 'app2_p3_desc', label: '2App p@3 ↓' },
    { value: 'app2_irr_desc', label: '2App IRR ↓' },
    { value: 'app3_sr_desc', label: '3App p@1 ↓' },
    { value: 'app3_p3_desc', label: '3App p@3 ↓' },
    { value: 'app3_irr_desc', label: '3App IRR ↓' },
    { value: 'app4_sr_desc', label: '4App p@1 ↓' },
    { value: 'app4_p3_desc', label: '4App p@3 ↓' },
    { value: 'app4_irr_desc', label: '4App IRR ↓' }
  ],
  efficiency: [
    { value: 'step_asc', label: 'Steps ↑ (best)' },
    { value: 'time_asc', label: 'Time/Step ↑ (best)' },
    { value: 'cost_asc', label: 'Cost/Step ↑ (best)' },
    { value: 'step_desc', label: 'Steps ↓' },
    { value: 'time_desc', label: 'Time/Step ↓' },
    { value: 'cost_desc', label: 'Cost/Step ↓' }
  ]
};

let currentTab = 'main';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  updateSortOptions('main');
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

// Update sort options based on current tab
function updateSortOptions(tab) {
  const select = document.getElementById('sortBy');
  const options = sortOptions[tab] || sortOptions.main;
  
  select.innerHTML = options.map(opt => 
    `<option value="${opt.value}">${opt.label}</option>`
  ).join('');
  
  // Set default sort for this tab
  currentFilters.sortBy = options[0].value;
  select.value = options[0].value;
}

// Setup event listeners
function setupEventListeners() {
  // Tab change listeners
  document.querySelectorAll('#mainTabs .nav-link').forEach(tab => {
    tab.addEventListener('shown.bs.tab', (e) => {
      const tabId = e.target.id;
      if (tabId === 'main-tab') {
        currentTab = 'main';
        updateSortOptions('main');
      } else if (tabId === 'crossapp-tab') {
        currentTab = 'crossapp';
        updateSortOptions('crossapp');
      } else if (tabId === 'efficiency-tab') {
        currentTab = 'efficiency';
        updateSortOptions('efficiency');
      }
      renderTables();
    });
  });
  
  // Agent type filter
  document.getElementById('agentTypeFilter').addEventListener('change', (e) => {
    currentFilters.agentType = e.target.value;
    renderTables();
  });
  
  // UI Tree filter
  document.getElementById('filterUITree').addEventListener('change', (e) => {
    currentFilters.uiTree = e.target.value;
    renderTables();
  });
  
  // LTM filter
  document.getElementById('filterLTM').addEventListener('change', (e) => {
    currentFilters.ltm = e.target.value;
    renderTables();
  });
  
  // Sort selector
  document.getElementById('sortBy').addEventListener('change', (e) => {
    currentFilters.sortBy = e.target.value;
    renderTables();
  });
  
  // Clear filters
  document.getElementById('clearFilters').addEventListener('click', () => {
    currentFilters = { agentType: 'all', uiTree: 'all', ltm: 'all', sortBy: sortOptions[currentTab][0].value };
    document.getElementById('agentTypeFilter').value = 'all';
    document.getElementById('filterUITree').value = 'all';
    document.getElementById('filterLTM').value = 'all';
    updateSortOptions(currentTab);
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
  
  // Apply UI Tree filter
  if (currentFilters.uiTree === 'with') {
    data = data.filter(agent => agent.hasUITree);
  } else if (currentFilters.uiTree === 'without') {
    data = data.filter(agent => !agent.hasUITree);
  }
  
  // Apply LTM filter
  if (currentFilters.ltm === 'with') {
    data = data.filter(agent => agent.hasLongTermMemory);
  } else if (currentFilters.ltm === 'without') {
    data = data.filter(agent => !agent.hasLongTermMemory);
  }
  
  // Sort
  data.sort((a, b) => {
    const sortKey = currentFilters.sortBy;
    const isAsc = sortKey.endsWith('_asc');
    const multiplier = isAsc ? 1 : -1;
    
    // Get sort value based on key
    const getValue = (agent) => {
      // Main tab metrics
      if (sortKey.startsWith('avg_p3')) return agent.avg.p3;
      if (sortKey.startsWith('avg_p1')) return agent.avg.p1;
      if (sortKey.startsWith('easy_p3')) return agent.difficulty.easy.p3;
      if (sortKey.startsWith('med_p3')) return agent.difficulty.medium.p3;
      if (sortKey.startsWith('hard_p3')) return agent.difficulty.hard.p3;
      if (sortKey.startsWith('irr_')) return agent.metrics?.shortTerm?.irr ?? -999;
      if (sortKey.startsWith('mtpr')) return agent.metrics?.shortTerm?.mtpr ?? -999;
      if (sortKey.startsWith('frr')) return agent.metrics?.longTerm?.frr ?? -999;
      
      // Cross-App metrics
      if (sortKey.startsWith('app1_sr')) return agent.crossApp?.app1?.p1 ?? -999;
      if (sortKey.startsWith('app1_p3')) return agent.crossApp?.app1?.p3 ?? -999;
      if (sortKey.startsWith('app1_irr')) return agent.crossApp?.app1?.irr ?? -999;
      if (sortKey.startsWith('app2_sr')) return agent.crossApp?.app2?.p1 ?? -999;
      if (sortKey.startsWith('app2_p3')) return agent.crossApp?.app2?.p3 ?? -999;
      if (sortKey.startsWith('app2_irr')) return agent.crossApp?.app2?.irr ?? -999;
      if (sortKey.startsWith('app3_sr')) return agent.crossApp?.app3?.p1 ?? -999;
      if (sortKey.startsWith('app3_p3')) return agent.crossApp?.app3?.p3 ?? -999;
      if (sortKey.startsWith('app3_irr')) return agent.crossApp?.app3?.irr ?? -999;
      if (sortKey.startsWith('app4_sr')) return agent.crossApp?.app4?.p1 ?? -999;
      if (sortKey.startsWith('app4_p3')) return agent.crossApp?.app4?.p3 ?? -999;
      if (sortKey.startsWith('app4_irr')) return agent.crossApp?.app4?.irr ?? -999;
      
      // Efficiency metrics
      if (sortKey.startsWith('step')) return agent.metrics?.shortTerm?.stepRatio ?? 999;
      if (sortKey.startsWith('time')) return agent.metrics?.shortTerm?.timePerStep ?? 999;
      if (sortKey.startsWith('cost')) return agent.metrics?.shortTerm?.costPerStep ?? 999;
      
      return agent.avg.p3;
    };
    
    return (getValue(a) - getValue(b)) * multiplier;
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

// Get sorted column key from current sort selection
function getSortedColumnKey() {
  const sortKey = currentFilters.sortBy;
  // Map sort key to column identifier
  if (sortKey.startsWith('avg_p3')) return 'avg_p3';
  if (sortKey.startsWith('avg_p1')) return 'avg_p1';
  if (sortKey.startsWith('easy_p3')) return 'easy_p3';
  if (sortKey.startsWith('med_p3')) return 'med_p3';
  if (sortKey.startsWith('hard_p3')) return 'hard_p3';
  if (sortKey.startsWith('irr')) return 'irr';
  if (sortKey.startsWith('mtpr')) return 'mtpr';
  if (sortKey.startsWith('frr')) return 'frr';
  if (sortKey.startsWith('app1_sr')) return 'app1_p1';
  if (sortKey.startsWith('app1_irr')) return 'app1_irr';
  if (sortKey.startsWith('app2_sr')) return 'app2_p1';
  if (sortKey.startsWith('app2_irr')) return 'app2_irr';
  if (sortKey.startsWith('app3_sr')) return 'app3_p1';
  if (sortKey.startsWith('app3_irr')) return 'app3_irr';
  if (sortKey.startsWith('app4_sr')) return 'app4_p1';
  if (sortKey.startsWith('app4_irr')) return 'app4_irr';
  if (sortKey.startsWith('step')) return 'step';
  if (sortKey.startsWith('time')) return 'time';
  if (sortKey.startsWith('cost')) return 'cost';
  return 'avg_p3';
}

// Format score cell
function formatScore(value, metricKey, bestValues, isSorted = false) {
  const sortedClass = isSorted ? ' sorted-column' : '';
  
  if (value === null || value === undefined) {
    return `<td class="score-cell na${sortedClass}">-</td>`;
  }
  if (value === 0) {
    return `<td class="score-cell zero${sortedClass}">0.0</td>`;
  }
  
  let className = 'score-cell';
  if (value === bestValues.best[metricKey] && value > 0) {
    className += ' best';
  } else if (value === bestValues.second[metricKey] && value > 0) {
    className += ' second';
  }
  className += sortedClass;
  
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
  const sortedCol = getSortedColumnKey();
  
  // Helper to check if column is sorted
  const sc = (col) => sortedCol === col ? ' sorted-column' : '';
  
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
          <th class="${sc('easy_p1')}">p@1</th><th class="${sc('easy_p3')}">p@3</th>
          <th class="${sc('med_p1')}">p@1</th><th class="${sc('med_p3')}">p@3</th>
          <th class="${sc('hard_p1')}">p@1</th><th class="${sc('hard_p3')}">p@3</th>
          <th class="${sc('avg_p1')}">p@1</th><th class="${sc('avg_p3')}">p@3</th>
          <th class="${sc('irr')}" title="Information Retention Rate">IRR</th>
          <th class="${sc('mtpr')}" title="Memory-Task Proficiency Ratio">MTPR</th>
          <th class="${sc('frr')}" title="Failure Recovery Rate">FRR</th>
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
        ${formatScore(agent.difficulty.easy.p1, 'easy_p1', bestValues, sortedCol === 'easy_p1')}
        ${formatScore(agent.difficulty.easy.p3, 'easy_p3', bestValues, sortedCol === 'easy_p3')}
        ${formatScore(agent.difficulty.medium.p1, 'med_p1', bestValues, sortedCol === 'med_p1')}
        ${formatScore(agent.difficulty.medium.p3, 'med_p3', bestValues, sortedCol === 'med_p3')}
        ${formatScore(agent.difficulty.hard.p1, 'hard_p1', bestValues, sortedCol === 'hard_p1')}
        ${formatScore(agent.difficulty.hard.p3, 'hard_p3', bestValues, sortedCol === 'hard_p3')}
        <td class="score-cell avg-score ${agent.avg.p1 === bestValues.best.avg_p1 ? 'best' : ''}${sc('avg_p1')}">${agent.avg.p1.toFixed(1)}</td>
        <td class="score-cell avg-score ${agent.avg.p3 === bestValues.best.avg_p3 ? 'best' : ''}${sc('avg_p3')}">${agent.avg.p3.toFixed(1)}</td>
        ${formatScore(irr, 'irr', bestValues, sortedCol === 'irr')}
        ${formatScore(mtpr, 'mtpr', bestValues, sortedCol === 'mtpr')}
        ${formatScore(frr, 'frr', bestValues, sortedCol === 'frr')}
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
  
  const sortedCol = getSortedColumnKey();
  const sc = (col) => sortedCol === col ? ' sorted-column' : '';
  
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
          <th class="${sc('step')}" title="Step Ratio: actual steps / golden steps">Steps</th>
          <th class="${sc('time')}" title="Average time per step in seconds">Time/Step</th>
          <th class="${sc('cost')}" title="Average API cost per step">Cost/Step</th>
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
    
    const formatStepRatio = (val, best, isShortTerm = true) => {
      const sortedClass = (sortedCol === 'step' && isShortTerm) ? ' sorted-column' : '';
      if (!val) return `<td class="score-cell na${sortedClass}">-</td>`;
      const isBest = Math.abs(val - best) < 0.01;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''} ${val <= 1.0 ? 'good-ratio' : val > 1.2 ? 'bad-ratio' : ''}${sortedClass}">${val.toFixed(2)}</td>`;
    };
    
    const formatTime = (val, best, isShortTerm = true) => {
      const sortedClass = (sortedCol === 'time' && isShortTerm) ? ' sorted-column' : '';
      if (!val) return `<td class="score-cell na${sortedClass}">-</td>`;
      const isBest = Math.abs(val - best) < 0.1;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''}${sortedClass}">${val.toFixed(1)}s</td>`;
    };
    
    const formatCost = (val, best, isShortTerm = true) => {
      const sortedClass = (sortedCol === 'cost' && isShortTerm) ? ' sorted-column' : '';
      if (!val) return `<td class="score-cell na${sortedClass}">-</td>`;
      const isBest = Math.abs(val - best) < 0.001;
      return `<td class="score-cell ${isBest ? 'best-efficiency' : ''}${sortedClass}">${'$' + val.toFixed(4)}</td>`;
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
        ${formatStepRatio(stm?.stepRatio, bestStepRatio, true)}
        ${formatTime(stm?.timePerStep, bestTime, true)}
        ${formatCost(stm?.costPerStep, bestCost, true)}
        ${formatStepRatio(ltm?.stepRatio, bestStepRatio, false)}
        ${formatTime(ltm?.timePerStep, bestTime, false)}
        ${formatCost(ltm?.costPerStep, bestCost, false)}
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
  const sortedCol = getSortedColumnKey();
  const sc = (col) => sortedCol === col ? ' sorted-column' : '';
  
  let html = `
    <table class="leaderboard-table crossapp-table">
      <thead>
        <tr class="header-group">
          <th rowspan="2">Rank</th>
          <th rowspan="2">Model & Date</th>
          <th rowspan="2">Type</th>
          <th colspan="3">1 App</th>
          <th colspan="3">2 Apps</th>
          <th colspan="3">3 Apps</th>
          <th colspan="3">4 Apps</th>
          <th colspan="3">Avg</th>
        </tr>
        <tr class="header-subgroup">
          <th class="${sc('app1_p1')}">p@1</th><th class="${sc('app1_p3')}">p@3</th><th class="${sc('app1_irr')}">IRR</th>
          <th class="${sc('app2_p1')}">p@1</th><th class="${sc('app2_p3')}">p@3</th><th class="${sc('app2_irr')}">IRR</th>
          <th class="${sc('app3_p1')}">p@1</th><th class="${sc('app3_p3')}">p@3</th><th class="${sc('app3_irr')}">IRR</th>
          <th class="${sc('app4_p1')}">p@1</th><th class="${sc('app4_p3')}">p@3</th><th class="${sc('app4_irr')}">IRR</th>
          <th class="${sc('avg_p1')}">p@1</th><th class="${sc('avg_p3')}">p@3</th><th class="${sc('irr')}">IRR</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.forEach((agent, index) => {
    html += createCrossAppRow(agent, bestValues, index + 1, sortedCol);
  });
  
  // Task count row
  html += `
        <tr class="task-count-row">
          <td colspan="3"><strong>Task Count</strong></td>
          <td colspan="3"><strong>28</strong></td>
          <td colspan="3"><strong>56</strong></td>
          <td colspan="3"><strong>34</strong></td>
          <td colspan="3"><strong>10</strong></td>
          <td colspan="3"><strong>128</strong></td>
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
function createCrossAppRow(agent, bestValues, rank, sortedCol = '') {
  const ca = agent.crossApp;
  const isFirst = rank === 1;
  
  const formatCell = (value, metricKey, colKey) => {
    const isSorted = sortedCol === colKey;
    const sortedClass = isSorted ? ' sorted-column' : '';
    
    if (value === null || value === undefined) {
      return `<td class="score-cell na${sortedClass}">-</td>`;
    }
    if (value === 0) {
      return `<td class="score-cell zero${sortedClass}">0.0</td>`;
    }
    let className = 'score-cell';
    if (value === bestValues.best[metricKey] && value > 0) {
      className += ' best';
    } else if (value === bestValues.second[metricKey] && value > 0) {
      className += ' second';
    }
    className += sortedClass;
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
      ${formatCell(ca.app1?.p1, 'app1_sr', 'app1_p1')}
      ${formatCell(ca.app1?.p3, 'app1_p3', 'app1_p3')}
      ${formatCell(ca.app1?.irr, 'app1_irr', 'app1_irr')}
      ${formatCell(ca.app2?.p1, 'app2_sr', 'app2_p1')}
      ${formatCell(ca.app2?.p3, 'app2_p3', 'app2_p3')}
      ${formatCell(ca.app2?.irr, 'app2_irr', 'app2_irr')}
      ${formatCell(ca.app3?.p1, 'app3_sr', 'app3_p1')}
      ${formatCell(ca.app3?.p3, 'app3_p3', 'app3_p3')}
      ${formatCell(ca.app3?.irr, 'app3_irr', 'app3_irr')}
      ${formatCell(ca.app4?.p1, 'app4_sr', 'app4_p1')}
      ${formatCell(ca.app4?.p3, 'app4_p3', 'app4_p3')}
      ${formatCell(ca.app4?.irr, 'app4_irr', 'app4_irr')}
      <td class="score-cell avg-score${sortedCol === 'avg_p1' ? ' sorted-column' : ''}">${agent.avg.p1.toFixed(1)}</td>
      <td class="score-cell avg-score${sortedCol === 'avg_p3' ? ' sorted-column' : ''}">${agent.avg.p3.toFixed(1)}</td>
      ${formatCell(agent.metrics?.shortTerm?.irr, 'irr', 'irr')}
    </tr>
  `;
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
