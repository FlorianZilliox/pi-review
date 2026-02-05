export function categorizeStatus(statut) {
    const s = statut.toLowerCase();
    if (s.includes('termin')) return 'termine';
    if (s.includes('cours')) return 'enCours';
    if (s.includes('cadrer')) return 'aCadrer';
    return 'aFaire';
}

export function getStatusClass(statut) {
    const s = statut.toLowerCase();
    if (s.includes('cours')) return 'en-cours';
    if (s.includes('cadrer')) return 'a-cadrer';
    if (s.includes('termin')) return 'termine';
    if (s.includes('faire') || s.includes('backlog')) return 'a-faire';
    return 'backlog';
}
