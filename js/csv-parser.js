export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        if (values.length >= 6) {
            data.push({
                equipe: values[0],
                epic: values[1],
                titre: values[2],
                statut: values[3],
                total: parseInt(values[4]) || 0,
                done: parseInt(values[5]) || 0,
                enCours: parseInt(values[6]) || 0
            });
        }
    }

    const teams = [...new Set(data.map(d => d.equipe))];
    return { data, teams };
}

export function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
