import { categorizeStatus, getStatusClass } from './utils.js';
import { getTeamMetrics, getTeamAlert, getEpicAttention, getProgressBarColor } from './metrics.js';

// Helper to filter team data based on Build/Run filter
export function getFilteredTeamData(team, data, teamFilters) {
    const filter = teamFilters[team] || 'build';
    let teamData = data.filter(d => d.equipe === team);

    if (filter === 'build') {
        // Build = explicitement Build OU vide (non classé)
        teamData = teamData.filter(d => d.type.toLowerCase() !== 'run');
    } else if (filter === 'run') {
        teamData = teamData.filter(d => d.type.toLowerCase() === 'run');
    }
    // 'all' = pas de filtre

    return teamData;
}

export function renderNavTabs(teams, data, teamFilters) {
    return `
        <div class="nav-tab active" data-tab="global">Vue globale</div>
        <div class="nav-tab" data-tab="products">Par Produit</div>
        ${teams.map(team => {
            // Badge toujours basé sur TOUTES les données (pas le filtre actif)
            const allTeamData = data.filter(d => d.equipe === team);
            const alert = getTeamAlert(allTeamData);
            return `
                <div class="nav-tab" data-tab="${team}">
                    ${team}
                    <span class="alert-badge ${alert}"></span>
                </div>
            `;
        }).join('')}
    `;
}

export function renderContent(teams, data, teamFilters) {
    return `
        <div class="team-section" id="tab-global">
            ${renderGlobalView(teams, data, teamFilters)}
        </div>
        <div class="team-section" id="tab-products">
            ${renderProductsView(data)}
        </div>
        ${teams.map(team => `
            <div class="team-section" id="tab-${team}">
                ${renderTeamView(team, data, teamFilters)}
            </div>
        `).join('')}
    `;
}

export function attachFilterListeners(teams, data, teamFilters) {
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const team = e.target.dataset.team;
            teamFilters[team] = e.target.value;
            // Re-render just this team section
            const section = document.getElementById(`tab-${team}`);
            if (section) {
                section.innerHTML = renderTeamView(team, data, teamFilters);
                // Re-attach filter listener for this section
                const newSelect = section.querySelector('.filter-select');
                if (newSelect) {
                    newSelect.addEventListener('change', (e) => {
                        teamFilters[team] = e.target.value;
                        section.innerHTML = renderTeamView(team, data, teamFilters);
                        attachSingleFilterListener(section, team, data, teamFilters);
                    });
                }
            }
            // Update tab badge
            updateTabBadge(team, data, teamFilters);
        });
    });
}

function attachSingleFilterListener(section, team, data, teamFilters) {
    const select = section.querySelector('.filter-select');
    if (select) {
        select.addEventListener('change', (e) => {
            teamFilters[team] = e.target.value;
            section.innerHTML = renderTeamView(team, data, teamFilters);
            attachSingleFilterListener(section, team, data, teamFilters);
            updateTabBadge(team, data, teamFilters);
        });
    }
}

export function updateTabBadge(team, data, teamFilters) {
    // Badge toujours basé sur TOUTES les données (pas le filtre actif)
    const allTeamData = data.filter(d => d.equipe === team);
    const alert = getTeamAlert(allTeamData);
    const tab = document.querySelector(`.nav-tab[data-tab="${team}"] .alert-badge`);
    if (tab) {
        tab.className = `alert-badge ${alert}`;
    }
}

function renderGlobalView(teams, data, teamFilters) {
    // Global view uses BUILD filter (excludes Run)
    const globalStats = teams.map(team => {
        const teamData = getFilteredTeamData(team, data, teamFilters);
        const metrics = getTeamMetrics(teamData);
        const allData = data.filter(d => d.equipe === team);
        const runCount = allData.filter(d => d.type.toLowerCase() === 'run').length;
        return {
            team,
            ...metrics,
            alert: getTeamAlert(teamData),
            runCount
        };
    });

    return `
        <div class="info-box" style="margin-bottom: 1rem;">
            <div class="info-box-content">Vue Build uniquement (hors Run). Le Run est du flux continu, non pertinent pour la complétion mid-PI.</div>
        </div>
        <h3 style="margin-bottom: 1rem;">Vue consolidée par équipe</h3>
        <table class="global-table">
            <thead>
                <tr>
                    <th>Équipe</th>
                    <th>Epics</th>
                    <th>Terminées</th>
                    <th>En cours</th>
                    <th>Non démarrées</th>
                    <th>À cadrer</th>
                    <th>Alerte</th>
                </tr>
            </thead>
            <tbody>
                ${globalStats.map(s => `
                    <tr>
                        <td><strong>${s.team}</strong></td>
                        <td>${s.totalEpics} <span style="color: var(--text-secondary); font-size: 0.8rem;">(+${s.runCount} run)</span></td>
                        <td><strong style="color: var(--status-done);">${s.termine}</strong> <span style="color: var(--text-secondary); font-size: 0.8rem;">(${Math.round(s.pctEpicsTerminees)}%)</span></td>
                        <td>${s.enCours} <span style="color: var(--text-secondary); font-size: 0.8rem;">(${Math.round(s.pctEpicsEnCours)}%)</span></td>
                        <td>${s.nonDemarrees} <span style="color: var(--text-secondary); font-size: 0.8rem;">(${Math.round(s.pctNonDemarrees)}%)</span></td>
                        <td>${s.aCadrer > 0 ? `<span style="color: var(--indicator-orange);">${s.aCadrer}</span>` : '0'}</td>
                        <td><span class="indicator ${s.alert}"></span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// State for products table sorting
let productsSortColumn = 'produit';
let productsSortAsc = true;

function getProductsData(data) {
    const productStats = {};

    data.forEach(d => {
        if (!d.composant) return;
        const comps = d.composant.split(',').map(c => c.trim());
        comps.forEach(comp => {
            if (!productStats[comp]) {
                productStats[comp] = { epics: [], teams: new Set() };
            }
            productStats[comp].epics.push(d);
            productStats[comp].teams.add(d.equipe);
        });
    });

    return Object.keys(productStats).map(prod => {
        const epics = productStats[prod].epics;
        const teamsStr = [...productStats[prod].teams].join(', ');
        const total = epics.length;
        const termine = epics.filter(d => categorizeStatus(d.statut) === 'termine').length;
        const enCours = epics.filter(d => categorizeStatus(d.statut) === 'enCours').length;
        const totalTickets = epics.reduce((sum, d) => sum + d.total, 0);
        const doneTickets = epics.reduce((sum, d) => sum + d.done, 0);
        const pct = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

        let alert = 'green';
        if (pct < 30) alert = 'red';
        else if (pct < 50) alert = 'orange';
        const alertOrder = { red: 0, orange: 1, green: 2 };

        return { prod, teamsStr, total, termine, enCours, totalTickets, doneTickets, pct, alert, alertOrder: alertOrder[alert] };
    });
}

function sortProductsData(productsData) {
    const sorted = [...productsData];
    sorted.sort((a, b) => {
        let valA, valB;
        switch (productsSortColumn) {
            case 'produit': valA = a.prod.toLowerCase(); valB = b.prod.toLowerCase(); break;
            case 'equipes': valA = a.teamsStr.toLowerCase(); valB = b.teamsStr.toLowerCase(); break;
            case 'epics': valA = a.total; valB = b.total; break;
            case 'terminees': valA = a.termine; valB = b.termine; break;
            case 'encours': valA = a.enCours; valB = b.enCours; break;
            case 'tickets': valA = a.doneTickets; valB = b.doneTickets; break;
            case 'completion': valA = a.pct; valB = b.pct; break;
            case 'alerte': valA = a.alertOrder; valB = b.alertOrder; break;
            default: valA = a.prod.toLowerCase(); valB = b.prod.toLowerCase();
        }
        if (valA < valB) return productsSortAsc ? -1 : 1;
        if (valA > valB) return productsSortAsc ? 1 : -1;
        return 0;
    });
    return sorted;
}

function renderProductsView(data) {
    const productsData = sortProductsData(getProductsData(data));

    const sortIndicator = (col) => {
        if (productsSortColumn === col) {
            return productsSortAsc ? ' ▲' : ' ▼';
        }
        return '';
    };

    return `
        <h3 style="margin-bottom: 1rem;">Vue par Produit (cross-équipes)</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
            Agrégation par composant Jira. Cliquer sur un en-tête pour trier.
        </p>
        <table class="global-table" id="products-table">
            <thead>
                <tr>
                    <th class="sortable" data-sort="produit" style="cursor: pointer;">Produit${sortIndicator('produit')}</th>
                    <th class="sortable" data-sort="equipes" style="cursor: pointer;">Équipes${sortIndicator('equipes')}</th>
                    <th class="sortable" data-sort="epics" style="cursor: pointer;">Epics${sortIndicator('epics')}</th>
                    <th class="sortable" data-sort="terminees" style="cursor: pointer;">Terminées${sortIndicator('terminees')}</th>
                    <th class="sortable" data-sort="encours" style="cursor: pointer;">En cours${sortIndicator('encours')}</th>
                    <th class="sortable" data-sort="tickets" style="cursor: pointer;">Tickets Done${sortIndicator('tickets')}</th>
                    <th class="sortable" data-sort="completion" style="cursor: pointer;">% Complétion${sortIndicator('completion')}</th>
                    <th class="sortable" data-sort="alerte" style="cursor: pointer;">Alerte${sortIndicator('alerte')}</th>
                </tr>
            </thead>
            <tbody>
                ${productsData.map(p => `
                    <tr>
                        <td><strong>${p.prod}</strong></td>
                        <td style="font-size: 0.8rem; color: var(--text-secondary);">${p.teamsStr}</td>
                        <td>${p.total}</td>
                        <td>${p.termine}</td>
                        <td>${p.enCours}</td>
                        <td>${p.doneTickets}/${p.totalTickets}</td>
                        <td>${p.pct}%</td>
                        <td><span class="indicator ${p.alert}"></span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

export function attachProductsSortListeners(data) {
    document.querySelectorAll('#products-table .sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (productsSortColumn === col) {
                productsSortAsc = !productsSortAsc;
            } else {
                productsSortColumn = col;
                productsSortAsc = true;
            }
            // Re-render products view
            const section = document.getElementById('tab-products');
            if (section) {
                section.innerHTML = renderProductsView(data);
                attachProductsSortListeners(data);
            }
        });
    });
}

function renderTeamView(team, data, teamFilters) {
    const currentFilter = teamFilters[team] || 'build';
    const teamData = getFilteredTeamData(team, data, teamFilters);
    const allTeamData = data.filter(d => d.equipe === team);
    const metrics = getTeamMetrics(teamData);
    // Alerte toujours basée sur TOUTES les données (pas le filtre actif)
    const teamAlert = getTeamAlert(allTeamData);

    const runCount = allTeamData.filter(d => d.type.toLowerCase() === 'run').length;
    const buildCount = allTeamData.filter(d => d.type.toLowerCase() !== 'run').length;

    const sortedData = [...teamData].sort((a, b) => {
        const order = { 'enCours': 0, 'aCadrer': 1, 'aFaire': 2, 'termine': 3 };
        return (order[categorizeStatus(a.statut)] || 4) - (order[categorizeStatus(b.statut)] || 4);
    });

    return `
        <div class="team-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div class="team-name">${team} <span class="indicator ${teamAlert}" style="display: inline-block; vertical-align: middle;"></span></div>
                    <div class="team-meta">Date d'extraction : ${new Date().toLocaleDateString('fr-FR')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary);">Afficher :</label>
                    <select class="filter-select" data-team="${team}" style="padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-size: 0.85rem; cursor: pointer;">
                        <option value="build" ${currentFilter === 'build' ? 'selected' : ''}>Build (${buildCount})</option>
                        <option value="run" ${currentFilter === 'run' ? 'selected' : ''}>Run (${runCount})</option>
                        <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Tout (${allTeamData.length})</option>
                    </select>
                </div>
            </div>
            <div class="team-metrics">
                <div class="team-metric">
                    <span>Terminées :</span>
                    <span class="team-metric-value">${metrics.termine}/${metrics.totalEpics} (${Math.round(metrics.pctEpicsTerminees)}%)</span>
                </div>
                <div class="team-metric">
                    <span>En cours :</span>
                    <span class="team-metric-value">${metrics.enCours} (${Math.round(metrics.pctEpicsEnCours)}%)</span>
                </div>
                <div class="team-metric">
                    <span>Non démarrées :</span>
                    <span class="team-metric-value">${metrics.nonDemarrees} (${Math.round(metrics.pctNonDemarrees)}%)</span>
                </div>
                <div class="team-metric">
                    <span>À cadrer :</span>
                    <span class="team-metric-value">${metrics.aCadrer}</span>
                </div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card done">
                <div class="summary-card-value">${metrics.termine}</div>
                <div class="summary-card-label">Terminé</div>
            </div>
            <div class="summary-card progress">
                <div class="summary-card-value">${metrics.enCours}</div>
                <div class="summary-card-label">En cours</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-value">${metrics.aCadrer}</div>
                <div class="summary-card-label">À cadrer</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-value">${metrics.aFaire}</div>
                <div class="summary-card-label">À faire</div>
            </div>
        </div>

        <div class="epics-section">
            <h3>Epics — Vue d'ensemble</h3>
            <div class="epics-table">
                <div class="epics-table-header">
                    <div>Epic</div>
                    <div>Titre</div>
                    <div>Statut</div>
                    <div>Complétion</div>
                    <div>Produit</div>
                    <div></div>
                </div>
                ${sortedData.map(d => renderEpicRow(d)).join('')}
            </div>
        </div>
    `;
}

function renderEpicRow(d) {
    const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
    const attention = getEpicAttention(d);
    const barColor = getProgressBarColor(d);
    const typeClass = d.type.toLowerCase() === 'run' ? 'run' : (d.type.toLowerCase() === 'build' ? 'build' : '');

    return `
        <div class="epic-row ${attention.alert ? 'highlight' : ''}">
            <div class="epic-key">${d.epic}</div>
            <div class="epic-title">
                ${d.titre}
                ${d.type ? `<span class="type-badge ${typeClass}">${d.type}</span>` : ''}
            </div>
            <div>
                <span class="status-badge ${getStatusClass(d.statut)}">${d.statut}</span>
            </div>
            <div class="progress-cell">
                ${d.total > 0 ? `
                    <span class="progress-text">${d.done}/${d.total} tickets</span>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${barColor}" style="width: ${pct}%"></div>
                    </div>
                ` : '<span class="progress-text">—</span>'}
            </div>
            <div class="composant-text" title="${d.composant}">${d.composant || '—'}</div>
            <div>
                ${attention.alert ? `<span class="indicator ${attention.color}"></span>` : '<span class="indicator none"></span>'}
            </div>
        </div>
    `;
}
