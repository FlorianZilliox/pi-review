import { categorizeStatus, getStatusClass } from './utils.js';
import { getTeamMetrics, getTeamAlert, getEpicAttention, getProgressBarColor } from './metrics.js';

export function renderNavTabs(teams, data) {
    return `
        <div class="nav-tab active" data-tab="global">Vue globale</div>
        ${teams.map(team => {
            const teamData = data.filter(d => d.equipe === team);
            const alert = getTeamAlert(teamData);
            return `
                <div class="nav-tab" data-tab="${team}">
                    ${team}
                    <span class="alert-badge ${alert}"></span>
                </div>
            `;
        }).join('')}
    `;
}

export function renderContent(teams, data) {
    return `
        <div class="team-section" id="tab-global">
            ${renderGlobalView(teams, data)}
        </div>
        ${teams.map(team => `
            <div class="team-section" id="tab-${team}">
                ${renderTeamView(team, data)}
            </div>
        `).join('')}
    `;
}

function renderGlobalView(teams, data) {
    const globalStats = teams.map(team => {
        const teamData = data.filter(d => d.equipe === team);
        const metrics = getTeamMetrics(teamData);
        return {
            team,
            ...metrics,
            alert: getTeamAlert(teamData)
        };
    });

    return `
        <h3 style="margin-bottom: 1rem;">Vue consolidée par équipe</h3>
        <table class="global-table">
            <thead>
                <tr>
                    <th>Équipe</th>
                    <th>Epics</th>
                    <th>Actives</th>
                    <th>À cadrer</th>
                    <th>Tickets Done</th>
                    <th>% Tickets</th>
                    <th>% Actives</th>
                    <th>Alerte</th>
                </tr>
            </thead>
            <tbody>
                ${globalStats.map(s => `
                    <tr>
                        <td><strong>${s.team}</strong></td>
                        <td>${s.totalEpics}</td>
                        <td>${s.termine + s.enCours}</td>
                        <td>${s.aCadrer}</td>
                        <td>${s.doneTickets}/${s.totalTickets}</td>
                        <td>${Math.round(s.pctTicketsDone)}%</td>
                        <td>${Math.round(s.pctEpicsActives)}%</td>
                        <td><span class="indicator ${s.alert}"></span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTeamView(team, data) {
    const teamData = data.filter(d => d.equipe === team);
    const metrics = getTeamMetrics(teamData);
    const teamAlert = getTeamAlert(teamData);

    const sortedData = [...teamData].sort((a, b) => {
        const order = { 'enCours': 0, 'aCadrer': 1, 'aFaire': 2, 'termine': 3 };
        return (order[categorizeStatus(a.statut)] || 4) - (order[categorizeStatus(b.statut)] || 4);
    });

    return `
        <div class="team-header">
            <div class="team-name">${team} <span class="indicator ${teamAlert}" style="display: inline-block; vertical-align: middle;"></span></div>
            <div class="team-meta">Date d'extraction : ${new Date().toLocaleDateString('fr-FR')}</div>
            <div class="team-metrics">
                <div class="team-metric">
                    <span>% Tickets Done :</span>
                    <span class="team-metric-value">${Math.round(metrics.pctTicketsDone)}%</span>
                </div>
                <div class="team-metric">
                    <span>% Epics actives :</span>
                    <span class="team-metric-value">${Math.round(metrics.pctEpicsActives)}%</span>
                </div>
                <div class="team-metric">
                    <span>% À cadrer :</span>
                    <span class="team-metric-value">${Math.round(metrics.pctACadrer)}%</span>
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

    return `
        <div class="epic-row ${attention.alert ? 'highlight' : ''}">
            <div class="epic-key">${d.epic}</div>
            <div class="epic-title">${d.titre}</div>
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
            <div>
                ${attention.alert ? `<span class="indicator ${attention.color}"></span>` : '<span class="indicator none"></span>'}
            </div>
        </div>
    `;
}
