import { categorizeStatus } from './utils.js';

export function getTeamMetrics(teamData) {
    const totalEpics = teamData.length;
    const termine = teamData.filter(d => categorizeStatus(d.statut) === 'termine').length;
    const enCours = teamData.filter(d => categorizeStatus(d.statut) === 'enCours').length;
    const aCadrer = teamData.filter(d => categorizeStatus(d.statut) === 'aCadrer').length;
    const aFaire = teamData.filter(d => categorizeStatus(d.statut) === 'aFaire').length;

    const totalTickets = teamData.reduce((sum, d) => sum + d.total, 0);
    const doneTickets = teamData.reduce((sum, d) => sum + d.done, 0);

    const pctTicketsDone = totalTickets > 0 ? (doneTickets / totalTickets) * 100 : 0;
    const pctEpicsTerminees = totalEpics > 0 ? (termine / totalEpics) * 100 : 0;
    const pctACadrer = totalEpics > 0 ? (aCadrer / totalEpics) * 100 : 0;
    const pctEpicsActives = totalEpics > 0 ? ((termine + enCours) / totalEpics) * 100 : 0;

    return {
        totalEpics, termine, enCours, aCadrer, aFaire,
        totalTickets, doneTickets,
        pctTicketsDone, pctEpicsTerminees, pctACadrer, pctEpicsActives
    };
}

export function getTeamAlert(teamData) {
    const { pctTicketsDone, pctEpicsActives, pctACadrer, termine, enCours } = getTeamMetrics(teamData);

    if (pctTicketsDone < 30 || pctEpicsActives < 20 || pctACadrer > 50 || (termine === 0 && enCours > 10)) {
        return 'red';
    }

    if (pctTicketsDone < 50 || pctEpicsActives < 40 || pctACadrer > 30 || (termine === 0 && enCours > 5)) {
        return 'orange';
    }

    return 'green';
}

export function getEpicAttention(item) {
    const cat = categorizeStatus(item.statut);
    const pct = item.total > 0 ? (item.done / item.total) * 100 : 0;

    if (cat === 'enCours' && item.total > 0 && pct < 30) {
        return { alert: true, color: 'red', reason: 'Demarrée mais peu de progression' };
    }

    if (cat === 'aCadrer' && item.total > 0) {
        return { alert: true, color: 'orange', reason: 'Tickets créés mais cadrage non finalisé' };
    }

    if (cat === 'aFaire' && item.total > 0 && pct > 50) {
        return { alert: true, color: 'orange', reason: 'Avancée mais toujours en backlog' };
    }

    return { alert: false, color: 'none', reason: '' };
}

export function getProgressBarColor(item) {
    const attention = getEpicAttention(item);
    if (attention.alert) return attention.color;

    const pct = item.total > 0 ? (item.done / item.total) * 100 : 0;
    if (pct > 60) return 'green';
    if (pct >= 30) return 'orange';
    return 'gray';
}
