import { categorizeStatus } from './utils.js';

// Team metrics based on Epic status (not tickets - scope isn't fixed for Build)
export function getTeamMetrics(teamData) {
    const totalEpics = teamData.length;
    const termine = teamData.filter(d => categorizeStatus(d.statut) === 'termine').length;
    const enCours = teamData.filter(d => categorizeStatus(d.statut) === 'enCours').length;
    const aCadrer = teamData.filter(d => categorizeStatus(d.statut) === 'aCadrer').length;
    const aFaire = teamData.filter(d => categorizeStatus(d.statut) === 'aFaire').length;
    const nonDemarrees = aCadrer + aFaire; // Backlog + À faire + À cadrer

    // Ticket-level metrics (secondary, useful for Run)
    const totalTickets = teamData.reduce((sum, d) => sum + d.total, 0);
    const doneTickets = teamData.reduce((sum, d) => sum + d.done, 0);
    const pctTicketsDone = totalTickets > 0 ? (doneTickets / totalTickets) * 100 : 0;

    // PRIMARY: Epic-level metrics (reliable for Build)
    const pctEpicsTerminees = totalEpics > 0 ? (termine / totalEpics) * 100 : 0;
    const pctEpicsEnCours = totalEpics > 0 ? (enCours / totalEpics) * 100 : 0;
    const pctACadrer = totalEpics > 0 ? (aCadrer / totalEpics) * 100 : 0;
    const pctNonDemarrees = totalEpics > 0 ? (nonDemarrees / totalEpics) * 100 : 0;
    const pctEpicsActives = totalEpics > 0 ? ((termine + enCours) / totalEpics) * 100 : 0;

    return {
        totalEpics, termine, enCours, aCadrer, aFaire, nonDemarrees,
        totalTickets, doneTickets, pctTicketsDone,
        pctEpicsTerminees, pctEpicsEnCours, pctACadrer, pctNonDemarrees, pctEpicsActives
    };
}

export function getTeamAlert(teamData) {
    const { pctEpicsTerminees, pctNonDemarrees, pctACadrer, pctEpicsEnCours, termine, totalEpics } = getTeamMetrics(teamData);

    // Pas d'epics = pas d'alerte
    if (totalEpics === 0) return 'none';

    // ROUGE: Dispersion sans livraison OU trop à cadrer
    // - 0 epic terminée ET > 80% en cours (on fait tout en parallèle sans rien finir)
    // - > 40% encore à cadrer à mi-PI (scope pas défini)
    if ((termine === 0 && pctEpicsEnCours > 80) || pctACadrer > 40) {
        return 'red';
    }

    // ORANGE: Peu de livraison OU beaucoup de non démarrées
    // - < 10% terminées (on n'a presque rien livré)
    // - > 32% non démarrées (trop d'epics en attente à mi-PI)
    if (pctEpicsTerminees < 10 || pctNonDemarrees > 32) {
        return 'orange';
    }

    // VERT: Au moins 10% terminées ET < 10% non démarrées
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
