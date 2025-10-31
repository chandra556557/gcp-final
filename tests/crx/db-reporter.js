class DbReporter {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    this.email = process.env.BACKEND_EMAIL;
    this.password = process.env.BACKEND_PASSWORD;
    this.token = null;
  }

  async onBegin() {
    if (!this.email || !this.password) {
      console.warn('[DbReporter] BACKEND_EMAIL/BACKEND_PASSWORD not set; skipping DB reporting');
      return;
    }
    try {
      const res = await fetch(`${this.backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password })
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`[DbReporter] Login failed: ${res.status} ${text}`);
        return;
      }
      const data = await res.json();
      this.token = data.accessToken || data.token || null;
      if (!this.token) {
        console.warn('[DbReporter] No accessToken in login response; skipping DB reporting');
      }
    } catch (err) {
      console.warn('[DbReporter] Login error:', err);
    }
  }

  async onTestEnd(test, result) {
    if (!this.token) return;

    try {
      const screenshotPaths = [];
      let tracePath = undefined;
      let videoPath = undefined;

      for (const a of result.attachments || []) {
        if (a.name === 'trace' || a.contentType === 'application/zip') {
          tracePath = a.path || tracePath;
        } else if (a.contentType && a.contentType.startsWith('video/')) {
          videoPath = a.path || videoPath;
        } else if (a.contentType === 'image/png') {
          if (a.path) screenshotPaths.push(a.path);
        }
      }

      const payload = {
        testName: (test.titlePath && test.titlePath().join(' > ')) || test.title,
        status: result.status,
        duration: result.duration,
        errorMsg: result.error ? (result.error.message || String(result.error)) : undefined,
        browser: (test.project && test.project.name) || 'msedge',
        environment: process.env.NODE_ENV || 'development',
        traceUrl: tracePath,
        videoUrl: videoPath,
        screenshotUrls: screenshotPaths.length ? screenshotPaths : undefined
      };

      const res = await fetch(`${this.backendUrl}/api/test-runs/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[DbReporter] Report failed: ${res.status} ${text}`);
      }
    } catch (err) {
      console.warn('[DbReporter] Report error:', err);
    }
  }
}

module.exports = DbReporter;