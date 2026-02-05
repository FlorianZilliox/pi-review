import { parseCSV, readFile } from './csv-parser.js';
import { renderNavTabs, renderContent } from './render.js';

// State
let data = [];
let teams = [];

// DOM elements
const uploadZone = document.getElementById('uploadZone');
const csvInput = document.getElementById('csvInput');
const infoBox = document.getElementById('infoBox');
const extractionInfo = document.getElementById('extractionInfo');
const navTabs = document.getElementById('navTabs');
const content = document.getElementById('content');
const modalOverlay = document.getElementById('modalOverlay');
const helpBtn = document.getElementById('helpBtn');
const modalClose = document.getElementById('modalClose');

// Modal
helpBtn.addEventListener('click', () => modalOverlay.classList.add('active'));
modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

// Upload
uploadZone.addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        processFile(file);
    }
});

async function processFile(file) {
    const csvText = await readFile(file);
    const result = parseCSV(csvText);
    data = result.data;
    teams = result.teams;
    render();
}

function render() {
    infoBox.classList.remove('hidden');
    extractionInfo.textContent = `${data.length} Epics chargées pour ${teams.length} équipes — ${new Date().toLocaleDateString('fr-FR')}`;

    navTabs.classList.remove('hidden');
    navTabs.innerHTML = renderNavTabs(teams, data);

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            showTab(tab.dataset.tab);
        });
    });

    content.innerHTML = renderContent(teams, data);
    showTab('global');
}

function showTab(tabId) {
    document.querySelectorAll('.team-section').forEach(section => {
        section.classList.remove('active');
    });
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');
}
