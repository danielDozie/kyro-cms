import { defineToolbarApp } from 'astro/toolbar';

export default defineToolbarApp({
  init(canvas) {
    const style = document.createElement('style');
    style.textContent = `
      .window {
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
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
        border-bottom: 1px solid #1e293b;
      }
      .logo {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      }
      .title {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
        color: #f8fafc;
      }
      .badge {
        font-size: 10px;
        font-weight: 600;
        background: #1e1b4b;
        color: #818cf8;
        padding: 2px 8px;
        border-radius: 9999px;
        border: 1px solid #3730a3;
        margin-left: auto;
      }
      .section {
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
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
        background: #1e293b;
        color: #f1f5f9;
        text-decoration: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #334155;
        transition: all 0.15s ease;
      }
      .btn:hover {
        background: #334155;
        border-color: #475569;
        color: white;
      }
      .btn-primary {
        background: #4f46e5;
        border-color: #6366f1;
        grid-column: span 2;
        padding: 10px 12px;
        font-weight: 600;
      }
      .btn-primary:hover {
        background: #4338ca;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        padding: 6px 0;
        color: #cbd5e1;
        border-bottom: 1px dashed #1e293b;
      }
      .info-value {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #a7f3d0;
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
    canvas.appendChild(windowEl);
  },
});
