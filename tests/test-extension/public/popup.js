(function(){
  const backendUrl = 'http://127.0.0.1:3001';
  const form = document.getElementById('login-form');
  const statusEl = document.getElementById('status');

  async function setStatus(text, ok=false){
    statusEl.textContent = text;
    statusEl.style.color = ok ? 'green' : 'red';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    await setStatus('Signing in...');
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const text = await res.text();
        await setStatus(`Login failed: ${res.status} ${text}`);
        return;
      }
      const data = await res.json();
      const token = data.accessToken || data.token;
      if (!token) {
        await setStatus('Login succeeded, but token missing in response');
        return;
      }
      // Store token for background or other pages to use
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ crxAuth: { token, email } }, () => {
          setStatus('Logged in and token saved!', true);
        });
      } else {
        await setStatus('Logged in, but storage API unavailable');
      }
    } catch (err) {
      await setStatus(`Login error: ${err?.message || err}`);
    }
  });
})();