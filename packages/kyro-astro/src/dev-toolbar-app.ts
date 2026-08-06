import { defineToolbarApp } from 'astro/toolbar';

export default defineToolbarApp({
  init(canvas, app) {
    const style = document.createElement('style');
    style.textContent = `
      .window {
        background: #171717;
        color: #ffffff;
        border: 1px solid #262626;
        border-radius: 12px;
        padding: 20px;
        width: 320px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #262626;
      }
      .logo {
        width: 28px;
        height: 28px;
        background: #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0a0a0a;
        font-weight: bold;
        font-size: 14px;
      }
      .title {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
        color: #ffffff;
      }
      .badge {
        font-size: 10px;
        font-weight: 600;
        background: #262626;
        color: #d1d5db;
        padding: 2px 8px;
        border-radius: 9999px;
        border: 1px solid #404040;
        margin-left: auto;
      }
      .section {
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 11px;
        font-weight: 600;
        color: #737373;
        margin-bottom: 8px;
      }
      .btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: #262626;
        color: #ffffff;
        text-decoration: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #404040;
        transition: all 0.15s ease;
      }
      .btn:hover {
        background: #404040;
        border-color: #525252;
        color: #ffffff;
      }
      .btn-primary {
        background: #ffffff;
        border-color: #ffffff;
        color: #0a0a0a;
        grid-column: span 2;
        padding: 10px 12px;
        font-weight: 600;
      }
      .btn-primary:hover {
        background: #e5e7eb;
        border-color: #e5e7eb;
        color: #0a0a0a;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        padding: 6px 0;
        color: #a3a3a3;
        border-bottom: 1px dashed #262626;
      }
      .info-value {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #ffffff;
      }
    `;

    const windowEl = document.createElement('astro-dev-toolbar-window');
    windowEl.className = 'window';

    windowEl.innerHTML = `
      <div class="header">
        <div class="logo">K</div>
        <h1 class="title">Kyro CMS</h1>
        <span class="badge">v0.12</span>
      </div>

      <div class="section">
        <div class="section-title">Quick Actions</div>
        <div class="btn-grid">
          <a href="/admin" target="_blank" class="btn btn-primary">
            🚀 Open Kyro Admin Panel
          </a>
          <a href="/api" target="_blank" class="btn">
            🔌 API Endpoint
          </a>
          <a href="https://github.com/danielDozie/kyro-cms" target="_blank" class="btn">
            📦 GitHub
          </a>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Integration Status</div>
        <div class="info-row">
          <span>Admin URL</span>
          <span class="info-value">/admin</span>
        </div>
        <div class="info-row">
          <span>API Base</span>
          <span class="info-value">/api</span>
        </div>
        <div class="info-row">
          <span>Content Layer</span>
          <span class="info-value">Active</span>
        </div>
      </div>
    `;

    canvas.appendChild(style);

    app.onToggled(({ state }) => {
      if (state) {
        canvas.appendChild(windowEl);
      } else {
        windowEl.remove();
      }
    });
  },
});
