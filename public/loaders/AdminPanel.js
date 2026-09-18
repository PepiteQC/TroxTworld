// ============================================================
//  ETHERWORLD ADMIN PANEL
// ============================================================
class AdminPanel {
  constructor() {
    this.visible = false;
    this.activeTab = 'dashboard';
    this.metricsInterval = null;
    this.logsInterval = null;
    this.logFilter = 'all';

    this.init();
  }

  init() {
    this.injectHTML();
    this.injectCSS();
    this.bindEvents();
    this.checkAccess();
  }

  // ==============================
  //  ACCÈS
  // ==============================
  checkAccess() {
    const adminMode = localStorage.getItem('admin_mode') === 'true'
      || location.hostname === 'localhost'
      || location.hostname === '127.0.0.1';

    if (adminMode) {
      const fab = document.getElementById('admin-fab');
      if (fab) fab.style.display = 'flex';
    }
  }

  // ==============================
  //  HTML DU PANEL
  // ==============================
  injectHTML() {
    if (document.getElementById('admin-panel')) return;
    const html = `
      <!-- Bouton flottant Admin -->
      <button id="admin-fab" title="Admin Panel" style="display:none">⚙️</button>

      <!-- Panel Admin -->
      <div id="admin-panel" class="admin-panel hidden">
        <div class="admin-header">
          <div class="admin-title">
            <span class="admin-icon">⚙️</span>
            <span>EtherWorld Admin</span>
            <span id="admin-status-dot" class="status-dot running"></span>
          </div>
          <button id="admin-close" class="admin-close-btn">✕</button>
        </div>

        <!-- Tabs -->
        <div class="admin-tabs">
          <button class="admin-tab active" data-tab="dashboard">📊 Dashboard</button>
          <button class="admin-tab" data-tab="players">👥 Players</button>
          <button class="admin-tab" data-tab="server">🖥️ Server</button>
          <button class="admin-tab" data-tab="world">🌍 World</button>
          <button class="admin-tab" data-tab="snapshots">💾 Snapshots</button>
          <button class="admin-tab" data-tab="logs">📋 Logs</button>
        </div>

        <!-- Tab Contents -->
        <div class="admin-body">

          <!-- DASHBOARD -->
          <div class="admin-tab-content active" id="tab-dashboard">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value" id="m-players">0</div>
                <div class="metric-label">Players Online</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" id="m-platforms">0</div>
                <div class="metric-label">Platforms</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" id="m-uptime">0s</div>
                <div class="metric-label">Uptime</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" id="m-memory">0%</div>
                <div class="metric-label">Memory</div>
              </div>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">Server Health</div>
              <div class="health-bar-container">
                <div class="health-bar" id="health-bar"></div>
                <span id="health-percent">100%</span>
              </div>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">System Info</div>
              <div id="system-info" class="info-grid"></div>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">Statistics</div>
              <div id="stats-info" class="info-grid"></div>
            </div>
          </div>

          <!-- PLAYERS -->
          <div class="admin-tab-content" id="tab-players">
            <div class="admin-section-title" style="margin-bottom:12px">
              Online Players <span id="players-count-badge" class="badge">0</span>
            </div>
            <div id="admin-players-list" class="players-list">
              <div class="empty-state">No players online</div>
            </div>
          </div>

          <!-- SERVER -->
          <div class="admin-tab-content" id="tab-server">
            <div class="admin-section">
              <div class="admin-section-title">Server Controls</div>
              <div class="server-controls">
                <button class="admin-btn success" id="srv-resume">▶️ Resume</button>
                <button class="admin-btn warning" id="srv-pause">⏸️ Pause</button>
                <button class="admin-btn primary" id="srv-save">💾 Manual Save</button>
                <button class="admin-btn primary" id="srv-backup">📦 Backup</button>
              </div>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">Server Status</div>
              <div id="server-status-display" class="status-display">
                <div class="status-item">
                  <span class="status-key">Status</span>
                  <span id="srv-status-val" class="status-val">-</span>
                </div>
                <div class="status-item">
                  <span class="status-key">Uptime</span>
                  <span id="srv-uptime-val" class="status-val">-</span>
                </div>
                <div class="status-item">
                  <span class="status-key">Memory Used</span>
                  <span id="srv-mem-val" class="status-val">-</span>
                </div>
                <div class="status-item">
                  <span class="status-key">OS Platform</span>
                  <span id="srv-os-val" class="status-val">-</span>
                </div>
                <div class="status-item">
                  <span class="status-key">CPU Cores</span>
                  <span id="srv-cpu-val" class="status-val">-</span>
                </div>
                <div class="status-item">
                  <span class="status-key">Total Joins</span>
                  <span id="srv-joins-val" class="status-val">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- WORLD -->
          <div class="admin-tab-content" id="tab-world">
            <div class="admin-section">
              <div class="admin-section-title">Time of Day</div>
              <div class="time-display">
                <span id="time-display-value">12:00</span>
              </div>
              <input type="range" id="time-slider" min="0" max="24" step="0.25" value="12" class="admin-slider">
              <div class="time-labels">
                <span>🌙 0h</span>
                <span>🌅 6h</span>
                <span>☀️ 12h</span>
                <span>🌆 18h</span>
                <span>🌙 24h</span>
              </div>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">Weather</div>
              <div class="weather-grid" id="weather-grid">
                <button class="weather-btn active" data-weather="sunny">☀️ Sunny</button>
                <button class="weather-btn" data-weather="cloudy">☁️ Cloudy</button>
                <button class="weather-btn" data-weather="rainy">🌧️ Rainy</button>
                <button class="weather-btn" data-weather="snowy">❄️ Snowy</button>
                <button class="weather-btn" data-weather="fog">🌫️ Fog</button>
                <button class="weather-btn" data-weather="storm">⛈️ Storm</button>
              </div>
            </div>

            <button class="admin-btn primary" id="apply-world" style="width:100%;margin-top:8px">
              ✅ Apply World Changes
            </button>

            <div class="admin-section" style="margin-top:16px">
              <div class="admin-section-title">Current World State</div>
              <div id="world-state-display" class="info-grid"></div>
            </div>
          </div>

          <!-- SNAPSHOTS -->
          <div class="admin-tab-content" id="tab-snapshots">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div class="admin-section-title">Snapshots (max 10)</div>
              <button class="admin-btn primary" id="create-backup-btn" style="padding:6px 12px;font-size:12px">
                + Create Backup
              </button>
            </div>
            <div id="snapshots-list" class="snapshots-list">
              <div class="empty-state">No snapshots yet</div>
            </div>
          </div>

          <!-- LOGS -->
          <div class="admin-tab-content" id="tab-logs">
            <div class="logs-header">
              <div class="admin-section-title">Server Logs</div>
              <div class="log-filters">
                <button class="log-filter-btn active" data-severity="all">All</button>
                <button class="log-filter-btn" data-severity="info">Info</button>
                <button class="log-filter-btn" data-severity="warning">Warn</button>
                <button class="log-filter-btn" data-severity="error">Error</button>
              </div>
            </div>
            <div id="logs-container" class="logs-container"></div>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  injectCSS() {
    if (document.getElementById('admin-panel-styles')) return;
    const css = `
      #admin-fab {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: rgba(20, 30, 50, 0.9);
        border: 1px solid rgba(100, 180, 255, 0.3);
        color: white;
        font-size: 22px;
        cursor: pointer;
        z-index: 1000;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      #admin-fab:hover {
        transform: scale(1.1) rotate(30deg);
        border-color: rgba(100, 200, 255, 0.6);
        box-shadow: 0 6px 24px rgba(100, 180, 255, 0.3);
      }

      .admin-panel {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 420px;
        max-height: 75vh;
        background: rgba(10, 15, 25, 0.97);
        border: 1px solid rgba(100, 150, 255, 0.25);
        border-radius: 14px;
        z-index: 999;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(20px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #e0e0e0;
        animation: adminSlideUp 0.25s ease;
      }
      .admin-panel.hidden { display: none !important; }

      @keyframes adminSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }
      .admin-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: 0.3px;
      }
      .admin-icon { font-size: 18px; }

      .status-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        display: inline-block;
        margin-left: 4px;
      }
      .status-dot.running { background: #44ff88; box-shadow: 0 0 6px #44ff88; animation: pulse 2s infinite; }
      .status-dot.paused { background: #ffaa44; box-shadow: 0 0 6px #ffaa44; }
      .status-dot.stopped { background: #ff4444; box-shadow: 0 0 6px #ff4444; }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .admin-close-btn {
        background: none;
        border: none;
        color: #666;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s;
      }
      .admin-close-btn:hover { color: #f55; background: rgba(255,50,50,0.1); }

      .admin-tabs {
        display: flex;
        gap: 2px;
        padding: 8px 10px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .admin-tabs::-webkit-scrollbar { display: none; }

      .admin-tab {
        background: none;
        border: none;
        color: #666;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11.5px;
        white-space: nowrap;
        transition: all 0.2s;
        font-family: inherit;
      }
      .admin-tab:hover { color: #aaa; background: rgba(255,255,255,0.05); }
      .admin-tab.active { color: #7af; background: rgba(60,120,255,0.15); font-weight: 600; }

      .admin-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        min-height: 0;
      }

      .admin-tab-content { display: none; }
      .admin-tab-content.active { display: block; }

      .admin-section { margin-bottom: 18px; }
      .admin-section-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #7af;
        margin-bottom: 10px;
        font-weight: 600;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 18px;
      }
      .metric-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 14px;
        text-align: center;
      }
      .metric-value {
        font-size: 26px;
        font-weight: 700;
        color: #fff;
        font-family: 'Consolas', monospace;
      }
      .metric-label {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .health-bar-container {
        background: rgba(255,255,255,0.06);
        border-radius: 20px;
        height: 12px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
      }
      .health-bar {
        height: 100%;
        border-radius: 20px;
        transition: width 0.5s, background 0.5s;
        background: #44ff88;
      }
      #health-percent {
        position: absolute;
        right: 8px;
        font-size: 10px;
        color: #fff;
        font-weight: 600;
      }

      .info-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 12.5px;
        padding: 5px 8px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
      }
      .info-key { color: #888; }
      .info-val { color: #ddd; font-family: 'Consolas', monospace; }

      .admin-btn {
        padding: 9px 14px;
        border-radius: 8px;
        border: 1px solid;
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
        transition: all 0.2s;
        font-weight: 500;
      }
      .admin-btn.primary {
        background: rgba(60,120,255,0.2);
        border-color: rgba(60,120,255,0.4);
        color: #7af;
      }
      .admin-btn.primary:hover { background: rgba(60,120,255,0.35); }
      .admin-btn.success {
        background: rgba(60,200,120,0.15);
        border-color: rgba(60,200,120,0.3);
        color: #6f9;
      }
      .admin-btn.success:hover { background: rgba(60,200,120,0.28); }
      .admin-btn.warning {
        background: rgba(255,160,60,0.15);
        border-color: rgba(255,160,60,0.3);
        color: #fa8;
      }
      .admin-btn.warning:hover { background: rgba(255,160,60,0.28); }
      .admin-btn.danger {
        background: rgba(255,60,60,0.15);
        border-color: rgba(255,60,60,0.3);
        color: #f77;
      }
      .admin-btn.danger:hover { background: rgba(255,60,60,0.28); }

      .server-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .status-display { display: flex; flex-direction: column; gap: 6px; }
      .status-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 10px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
        font-size: 12.5px;
      }
      .status-key { color: #888; }
      .status-val { color: #ddd; font-family: 'Consolas', monospace; }

      .time-display {
        text-align: center;
        font-size: 32px;
        font-weight: 700;
        font-family: 'Consolas', monospace;
        color: #ffdd88;
        margin-bottom: 8px;
      }
      .admin-slider {
        width: 100%;
        accent-color: #7af;
        cursor: pointer;
      }
      .time-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #666;
        margin-top: 4px;
      }

      .weather-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
      }
      .weather-btn {
        padding: 8px 6px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #bbb;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        transition: all 0.2s;
        text-align: center;
      }
      .weather-btn:hover { background: rgba(255,255,255,0.1); }
      .weather-btn.active {
        background: rgba(60,120,255,0.2);
        border-color: rgba(100,180,255,0.5);
        color: #7af;
      }

      .badge {
        background: rgba(60,120,255,0.3);
        border-radius: 20px;
        padding: 2px 8px;
        font-size: 11px;
        color: #7af;
      }
      .players-list { display: flex; flex-direction: column; gap: 6px; }
      .player-admin-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .player-admin-info { display: flex; align-items: center; gap: 10px; }
      .player-admin-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .player-admin-name { font-weight: 600; font-size: 13px; }
      .player-admin-sub { font-size: 11px; color: #666; margin-top: 2px; }
      .player-admin-actions { display: flex; gap: 6px; }
      .player-action-btn {
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        color: #aaa;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        transition: all 0.2s;
      }
      .player-action-btn:hover { background: rgba(255,80,80,0.2); color: #f88; border-color: rgba(255,80,80,0.3); }

      .snapshots-list { display: flex; flex-direction: column; gap: 6px; }
      .snapshot-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .snapshot-badge {
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .snapshot-badge.auto { background: rgba(60,120,255,0.2); color: #7af; }
      .snapshot-badge.manual { background: rgba(60,200,120,0.2); color: #6f9; }
      .snapshot-badge.backup { background: rgba(255,160,60,0.2); color: #fa8; }
      .snapshot-info { flex: 1; margin: 0 10px; }
      .snapshot-title { font-size: 12.5px; font-weight: 600; color: #ddd; }
      .snapshot-meta { font-size: 11px; color: #666; margin-top: 2px; }
      .snapshot-restore-btn {
        padding: 5px 12px;
        border-radius: 6px;
        border: 1px solid rgba(255,160,60,0.3);
        background: rgba(255,160,60,0.1);
        color: #fa8;
        cursor: pointer;
        font-size: 11.5px;
        font-family: inherit;
        transition: all 0.2s;
      }
      .snapshot-restore-btn:hover { background: rgba(255,160,60,0.25); }

      .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .log-filters { display: flex; gap: 4px; }
      .log-filter-btn {
        padding: 4px 10px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        color: #888;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        transition: all 0.2s;
      }
      .log-filter-btn.active { background: rgba(60,120,255,0.2); color: #7af; border-color: rgba(60,120,255,0.3); }

      .logs-container {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 340px;
        overflow-y: auto;
      }
      .log-entry {
        padding: 5px 8px;
        border-radius: 5px;
        font-size: 11.5px;
        font-family: 'Consolas', monospace;
        background: rgba(255,255,255,0.03);
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .log-time { color: #555; flex-shrink: 0; }
      .log-type { font-weight: 700; flex-shrink: 0; min-width: 80px; }
      .log-msg { color: #bbb; flex: 1; word-break: break-all; }
      .log-entry.info .log-type { color: #7af; }
      .log-entry.warning .log-type { color: #fa8; }
      .log-entry.error .log-type { color: #f77; }

      .empty-state {
        text-align: center;
        color: #555;
        font-size: 13px;
        padding: 30px;
      }
    `;

    const style = document.createElement('style');
    style.id = 'admin-panel-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  bindEvents() {
    document.getElementById('admin-fab')?.addEventListener('click', () => this.toggle());
    document.getElementById('admin-close')?.addEventListener('click', () => this.hide());

    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    document.getElementById('srv-resume')?.addEventListener('click', () => this.serverAction('resume'));
    document.getElementById('srv-pause')?.addEventListener('click', () => this.serverAction('pause'));
    document.getElementById('srv-save')?.addEventListener('click', () => this.serverAction('save'));
    document.getElementById('srv-backup')?.addEventListener('click', () => this.serverAction('backup'));

    document.getElementById('time-slider')?.addEventListener('input', (e) => {
      const h = parseFloat(e.target.value);
      const hh = Math.floor(h).toString().padStart(2, '0');
      const mm = Math.floor((h % 1) * 60).toString().padStart(2, '0');
      const label = document.getElementById('time-display-value');
      if (label) label.textContent = `${hh}:${mm}`;

      if (window.game?.updateTimeOfDay) {
        window.game.updateTimeOfDay(h);
      }
    });

    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (window.game?.updateWeather) window.game.updateWeather(btn.dataset.weather);
      });
    });

    document.getElementById('apply-world')?.addEventListener('click', () => this.applyWorldChanges());
    document.getElementById('create-backup-btn')?.addEventListener('click', () => this.createBackup());

    document.querySelectorAll('.log-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.logFilter = btn.dataset.severity;
        this.loadLogs();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    this.visible = true;
    document.getElementById('admin-panel')?.classList.remove('hidden');
    this.startPolling();
    this.loadTab(this.activeTab);
  }

  hide() {
    this.visible = false;
    document.getElementById('admin-panel')?.classList.add('hidden');
    this.stopPolling();
  }

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    this.loadTab(tab);
  }

  loadTab(tab) {
    switch (tab) {
      case 'dashboard': this.loadMetrics(); break;
      case 'players': this.loadPlayers(); break;
      case 'server': this.loadMetrics(); break;
      case 'world': this.loadWorldState(); break;
      case 'snapshots': this.loadSnapshots(); break;
      case 'logs': this.loadLogs(); break;
    }
  }

  startPolling() {
    this.stopPolling();
    this.metricsInterval = setInterval(() => {
      if (this.activeTab === 'dashboard' || this.activeTab === 'server') this.loadMetrics();
      if (this.activeTab === 'players') this.loadPlayers();
      if (this.activeTab === 'logs') this.loadLogs();
    }, 3000);
  }

  stopPolling() {
    clearInterval(this.metricsInterval);
    clearInterval(this.logsInterval);
  }

  async loadMetrics() {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();

      const elP = document.getElementById('m-players'); if (elP) elP.textContent = data.player_count;
      const elPl = document.getElementById('m-platforms'); if (elPl) elPl.textContent = data.platform_count;
      const elUp = document.getElementById('m-uptime'); if (elUp) elUp.textContent = data.uptime_formatted;
      const elMem = document.getElementById('m-memory'); if (elMem) elMem.textContent = `${data.memory.percent}%`;

      const health = 100 - data.memory.percent;
      const bar = document.getElementById('health-bar');
      const pct = document.getElementById('health-percent');
      if (bar) {
        bar.style.width = `${health}%`;
        bar.style.background = health > 75 ? '#44ff88' : health > 50 ? '#ffaa44' : '#ff4444';
      }
      if (pct) pct.textContent = `${health}%`;

      const sys = document.getElementById('system-info');
      if (sys) {
        sys.innerHTML = `
          ${this.infoRow('OS Platform', data.os.platform)}
          ${this.infoRow('CPU Cores', data.os.cpus)}
          ${this.infoRow('Free Memory', `${data.os.free_memory_mb} MB`)}
          ${this.infoRow('Total Memory', `${data.os.total_memory_mb} MB`)}
          ${this.infoRow('Heap Used', `${data.memory.used_mb} MB / ${data.memory.total_mb} MB`)}
        `;
      }

      const sts = document.getElementById('stats-info');
      if (sts) {
        sts.innerHTML = `
          ${this.infoRow('Total Joins', data.statistics?.total_joins || 0)}
          ${this.infoRow('Total Saves', data.statistics?.total_saves || 0)}
          ${this.infoRow('Snapshots', data.snapshot_count)}
        `;
      }

      const statusColors = { running: '#6f9', paused: '#fa8', stopped: '#f77' };
      const sVal = document.getElementById('srv-status-val');
      if (sVal) {
        sVal.textContent = data.server_status;
        sVal.style.color = statusColors[data.server_status] || '#ddd';
      }
      const sUp = document.getElementById('srv-uptime-val'); if (sUp) sUp.textContent = data.uptime_formatted;
      const sMem = document.getElementById('srv-mem-val'); if (sMem) sMem.textContent = `${data.memory.used_mb} MB (${data.memory.percent}%)`;
      const sOs = document.getElementById('srv-os-val'); if (sOs) sOs.textContent = data.os.platform;
      const sCpu = document.getElementById('srv-cpu-val'); if (sCpu) sCpu.textContent = data.os.cpus;
      const sJn = document.getElementById('srv-joins-val'); if (sJn) sJn.textContent = data.statistics?.total_joins || 0;

      const dot = document.getElementById('admin-status-dot');
      if (dot) dot.className = `status-dot ${data.server_status}`;

    } catch (e) { console.warn('[Admin] Metrics fetch failed:', e); }
  }

  async loadPlayers() {
    try {
      const res = await fetch('/api/admin/players');
      const data = await res.json();
      const list = document.getElementById('admin-players-list');
      const b = document.getElementById('players-count-badge');
      if (b) b.textContent = data.players.length;

      if (!list) return;
      if (data.players.length === 0) {
        list.innerHTML = '<div class="empty-state">No players online</div>';
        return;
      }

      list.innerHTML = data.players.map(p => `
        <div class="player-admin-card">
          <div class="player-admin-info">
            <div class="player-admin-dot" style="background:${p.color}"></div>
            <div>
              <div class="player-admin-name">${this.esc(p.name)}</div>
              <div class="player-admin-sub">
                ${p.id} · ${this.formatPlaytime(p.playtime)}
                · [${(p.position || [0,0,0]).map(v => v.toFixed(0)).join(', ')}]
              </div>
            </div>
          </div>
          <div class="player-admin-actions">
            <button class="player-action-btn" onclick="adminPanel.kickPlayer('${p.id}')">Kick</button>
          </div>
        </div>
      `).join('');
    } catch (e) { console.warn('[Admin] Players fetch failed:', e); }
  }

  async loadWorldState() {
    try {
      const res = await fetch('/api/admin/world');
      const data = await res.json();

      const slider = document.getElementById('time-slider');
      if (slider) slider.value = data.time_of_day;
      const h = Math.floor(data.time_of_day);
      const m = Math.floor((data.time_of_day % 1) * 60);
      const tVal = document.getElementById('time-display-value');
      if (tVal) tVal.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;

      document.querySelectorAll('.weather-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.weather === data.weather);
      });

      const ws = document.getElementById('world-state-display');
      if (ws) {
        ws.innerHTML = `
          ${this.infoRow('World Name', data.world_name)}
          ${this.infoRow('Status', data.server_status)}
          ${this.infoRow('Time', `${data.time_of_day}h`)}
          ${this.infoRow('Weather', data.weather)}
          ${this.infoRow('Players', `${data.player_count} / ${data.max_players}`)}
          ${this.infoRow('Platforms', data.platform_count)}
          ${this.infoRow('Uptime', this.formatUptime(data.uptime_seconds))}
        `;
      }
    } catch (e) { console.warn('[Admin] World state fetch failed:', e); }
  }

  async loadSnapshots() {
    try {
      const res = await fetch('/api/admin/snapshots');
      const data = await res.json();
      const list = document.getElementById('snapshots-list');

      if (!list) return;
      if (data.snapshots.length === 0) {
        list.innerHTML = '<div class="empty-state">No snapshots yet</div>';
        return;
      }

      list.innerHTML = data.snapshots.map(s => `
        <div class="snapshot-card">
          <span class="snapshot-badge ${s.type}">${s.type}</span>
          <div class="snapshot-info">
            <div class="snapshot-title">${this.esc(s.description)}</div>
            <div class="snapshot-meta">
              ${new Date(s.created_at).toLocaleString()} · ${s.player_count} players · ${s.platform_count} platforms
            </div>
          </div>
          <button class="snapshot-restore-btn" onclick="adminPanel.restoreSnapshot('${s.id}')">
            Restore
          </button>
        </div>
      `).join('');
    } catch (e) { console.warn('[Admin] Snapshots fetch failed:', e); }
  }

  async loadLogs() {
    try {
      const url = `/api/admin/logs?limit=80&severity=${this.logFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      const container = document.getElementById('logs-container');

      if (!container) return;
      if (data.logs.length === 0) {
        container.innerHTML = '<div class="empty-state">No logs</div>';
        return;
      }

      container.innerHTML = data.logs.map(log => `
        <div class="log-entry ${log.severity}">
          <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
          <span class="log-type">${log.event_type}</span>
          <span class="log-msg">${this.esc(log.message)}</span>
        </div>
      `).join('');
    } catch (e) { console.warn('[Admin] Logs fetch failed:', e); }
  }

  async serverAction(action) {
    try {
      await fetch(`/api/admin/server/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      this.notify(`Server ${action} done`, 'success');
      this.loadMetrics();
    } catch (e) {
      this.notify(`Action failed: ${action}`, 'error');
    }
  }

  async applyWorldChanges() {
    const slider = document.getElementById('time-slider');
    const time = slider ? parseFloat(slider.value) : 12;
    const weather = document.querySelector('.weather-btn.active')?.dataset.weather || 'sunny';

    try {
      await fetch('/api/admin/world', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_of_day: time, weather })
      });
      this.notify('World updated!', 'success');
      this.loadWorldState();

      if (window.game?.updateTimeOfDay) window.game.updateTimeOfDay(time);
      if (window.game?.updateWeather) window.game.updateWeather(weather);
    } catch (e) {
      this.notify('Update failed', 'error');
    }
  }

  async kickPlayer(playerId) {
    if (!confirm(`Kick player ${playerId}?`)) return;
    try {
      await fetch(`/api/admin/players/${playerId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Kicked by admin' })
      });
      this.notify(`Player ${playerId} kicked`, 'success');
      this.loadPlayers();
    } catch (e) {
      this.notify('Kick failed', 'error');
    }
  }

  async createBackup() {
    try {
      await fetch('/api/admin/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'backup', description: `Manual backup ${new Date().toLocaleTimeString()}` })
      });
      this.notify('Backup created!', 'success');
      this.loadSnapshots();
    } catch (e) {
      this.notify('Backup failed', 'error');
    }
  }

  async restoreSnapshot(id) {
    if (!confirm('Restore this snapshot? This will reset the world for all players.')) return;
    try {
      await fetch(`/api/admin/snapshots/${id}/restore`, { method: 'POST' });
      this.notify('Snapshot restored!', 'success');
    } catch (e) {
      this.notify('Restore failed', 'error');
    }
  }

  infoRow(key, val) {
    return `<div class="info-row"><span class="info-key">${key}</span><span class="info-val">${val}</span></div>`;
  }

  esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  formatPlaytime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  notify(text, type = 'info') {
    if (window.game?.notify) {
      window.game.notify(text, type);
    } else {
      console.log(`[Admin] ${type}: ${text}`);
    }
  }
}

window.adminPanel = new AdminPanel();
export { AdminPanel };
