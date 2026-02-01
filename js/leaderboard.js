// MemGUI-Bench Leaderboard JavaScript
document.addEventListener("DOMContentLoaded", function() {
  let currentData = null;
  let currentSort = { key: 'overall', direction: 'desc' };
  let currentView = 'shortTerm';

  // Fetch data and initialize
  fetch('data/results.json')
    .then(response => response.json())
    .then(data => {
      currentData = data;
      renderTable('shortTerm');
      renderTable('longTerm');
    })
    .catch(error => {
      console.error('Failed to load data:', error);
      document.getElementById('shortTermTable').innerHTML = 
        '<div class="text-center text-danger p-5">Error loading data. Please try again later.</div>';
    });

  // View toggle event listeners
  document.getElementById('shortTerm').addEventListener('change', function() {
    if (this.checked) {
      currentView = 'shortTerm';
      document.getElementById('shortTermTable').style.display = 'block';
      document.getElementById('longTermTable').style.display = 'none';
    }
  });

  document.getElementById('longTerm').addEventListener('change', function() {
    if (this.checked) {
      currentView = 'longTerm';
      document.getElementById('shortTermTable').style.display = 'none';
      document.getElementById('longTermTable').style.display = 'block';
    }
  });

  function renderTable(viewType) {
    const container = document.getElementById(viewType + 'Table');
    const agents = currentData.agents;
    
    // Sort agents by overall score
    const sortedAgents = [...agents].sort((a, b) => {
      const aVal = viewType === 'shortTerm' ? a.shortTerm.overall : a.longTerm.overall;
      const bVal = viewType === 'shortTerm' ? b.shortTerm.overall : b.longTerm.overall;
      return bVal - aVal;
    });

    // Find best values for highlighting
    const bestValues = findBestValues(sortedAgents, viewType);

    let html = '<table class="leaderboard-table">';
    
    // Header
    if (viewType === 'shortTerm') {
      html += `
        <thead>
          <tr>
            <th rowspan="2">#</th>
            <th rowspan="2">Agent</th>
            <th rowspan="2">Type</th>
            <th colspan="4">Success Rate (%)</th>
            <th colspan="3">Memory Metrics</th>
          </tr>
          <tr>
            <th class="sortable" data-key="easy">Easy</th>
            <th class="sortable" data-key="medium">Med</th>
            <th class="sortable" data-key="hard">Hard</th>
            <th class="sortable" data-key="overall">Overall</th>
            <th class="sortable" data-key="irr">IRR (%)</th>
            <th class="sortable" data-key="mtpr">MTPR</th>
            <th>Time/Step</th>
          </tr>
        </thead>`;
    } else {
      html += `
        <thead>
          <tr>
            <th rowspan="2">#</th>
            <th rowspan="2">Agent</th>
            <th rowspan="2">Type</th>
            <th colspan="4">Success Rate @ 3 (%)</th>
            <th colspan="2">Learning Metrics</th>
          </tr>
          <tr>
            <th class="sortable" data-key="easy">Easy</th>
            <th class="sortable" data-key="medium">Med</th>
            <th class="sortable" data-key="hard">Hard</th>
            <th class="sortable" data-key="overall">Overall</th>
            <th class="sortable" data-key="frr">FRR (%)</th>
            <th>Improvement</th>
          </tr>
        </thead>`;
    }

    html += '<tbody>';

    // Group agents by type
    const workflowAgents = sortedAgents.filter(a => a.type === 'Agentic Workflow');
    const modelAgents = sortedAgents.filter(a => a.type === 'Agent-as-a-Model');

    let rank = 1;

    // Agentic Workflow section
    html += '<tr class="category-divider"><td colspan="10">Agentic Workflow</td></tr>';
    workflowAgents.forEach(agent => {
      html += renderAgentRow(agent, rank++, viewType, bestValues);
    });

    // Agent-as-a-Model section
    html += '<tr class="category-divider"><td colspan="10">Agent-as-a-Model</td></tr>';
    modelAgents.forEach(agent => {
      html += renderAgentRow(agent, rank++, viewType, bestValues);
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Add sort event listeners
    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => handleSort(th.dataset.key, viewType));
    });
  }

  function renderAgentRow(agent, rank, viewType, bestValues) {
    const data = viewType === 'shortTerm' ? agent.shortTerm : agent.longTerm;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const badgeClass = agent.type === 'Agentic Workflow' ? 'badge-workflow' : 'badge-model';

    let row = `
      <tr>
        <td class="rank-cell ${rankClass}">${rank}</td>
        <td class="agent-name">
          ${agent.link ? `<a href="${agent.link}" target="_blank">${agent.name}</a>` : agent.name}
          ${agent.hasLongTermMemory ? '<span title="Has Long-Term Memory">🧠</span>' : ''}
        </td>
        <td><span class="agent-badge ${badgeClass}">${agent.type === 'Agentic Workflow' ? 'Workflow' : 'Model'}</span></td>
        <td class="value-cell ${isBest(data.easy, bestValues.easy) ? 'value-best' : ''}">${formatValue(data.easy)}</td>
        <td class="value-cell ${isBest(data.medium, bestValues.medium) ? 'value-best' : ''}">${formatValue(data.medium)}</td>
        <td class="value-cell ${isBest(data.hard, bestValues.hard) ? 'value-best' : ''}">${formatValue(data.hard)}</td>
        <td class="value-cell ${isBest(data.overall, bestValues.overall) ? 'value-best' : ''}">${formatValue(data.overall)}</td>`;

    if (viewType === 'shortTerm') {
      row += `
        <td class="value-cell ${isBest(data.irr, bestValues.irr) ? 'value-best' : ''}">${formatValue(data.irr)}</td>
        <td class="value-cell ${isBest(data.mtpr, bestValues.mtpr) ? 'value-best' : ''}">${formatValue(data.mtpr, 2)}</td>
        <td class="value-cell">${data.timePerStep}s</td>`;
    } else {
      row += `
        <td class="value-cell ${isBest(data.frr, bestValues.frr) ? 'value-best' : ''}">${formatValue(data.frr)}</td>
        <td class="value-cell">${data.improvement > 0 ? '+' : ''}${formatValue(data.improvement)} pp</td>`;
    }

    row += '</tr>';
    return row;
  }

  function findBestValues(agents, viewType) {
    const key = viewType === 'shortTerm' ? 'shortTerm' : 'longTerm';
    const values = {
      easy: Math.max(...agents.map(a => a[key].easy)),
      medium: Math.max(...agents.map(a => a[key].medium)),
      hard: Math.max(...agents.map(a => a[key].hard)),
      overall: Math.max(...agents.map(a => a[key].overall))
    };

    if (viewType === 'shortTerm') {
      values.irr = Math.max(...agents.map(a => a[key].irr));
      values.mtpr = Math.max(...agents.map(a => a[key].mtpr));
    } else {
      values.frr = Math.max(...agents.map(a => a[key].frr));
    }

    return values;
  }

  function isBest(value, best) {
    return value === best && value > 0;
  }

  function formatValue(value, decimals = 1) {
    if (value === null || value === undefined) return '-';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  }

  function handleSort(key, viewType) {
    // Sort logic can be implemented here
    console.log('Sorting by:', key, 'for view:', viewType);
  }
});

