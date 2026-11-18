const { app, BrowserWindow } = require('electron');

// Em dev carrega o Next.js local; em producao o endereco fixo da API/web (PRD Q2, em aberto).
const URL_APP = process.env.VATECH_URL || 'http://localhost:3000';

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  janela.loadURL(URL_APP);
}

app.whenReady().then(criarJanela);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
