/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

export interface ApiConfig {
  baseUrl: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Script {
  id: string;
  name: string;
  description?: string;
  language: string;
  code: string;
  browserType?: string;
  viewport?: { width: number; height: number };
  testIdAttribute?: string;
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
  project?: { name: string };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TestRun {
  id: string;
  scriptId: string;
  status: string;
  duration?: number;
  errorMsg?: string;
  startedAt: Date;
  completedAt?: Date;
  script?: {
    name: string;
  };
  steps?: TestStep[];
}

export interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  selector?: string;
  value?: string;
  status: string;
  duration?: number;
  errorMsg?: string;
  timestamp: Date;
}

export class ApiService {
  private config: ApiConfig;
  private tokens: AuthTokens | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || API_BASE_URL
    };

    // Load base URL from synced settings if available
    chrome.storage.sync.get(['apiBaseUrl']).then(result => {
      if (result && result.apiBaseUrl) {
        this.config.baseUrl = result.apiBaseUrl as string;
      }
    }).catch(() => {});

    // React to settings changes in real-time
    chrome.storage.sync.onChanged.addListener(changes => {
      if (changes.apiBaseUrl) {
        const newValue = changes.apiBaseUrl.newValue as string | undefined;
        this.config.baseUrl = newValue || API_BASE_URL;
      }
    });
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.tokens = { accessToken, refreshToken };

    // Save to storage for persistence
    chrome.storage.local.set({
      auth_tokens: { accessToken, refreshToken }
    }).catch(() => {});
  }

  /**
   * Load tokens from storage
   */
  async loadTokens(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['auth_tokens']);
      if (result.auth_tokens && result.auth_tokens.accessToken && result.auth_tokens.refreshToken) {
        this.tokens = result.auth_tokens;
      } else {
        this.tokens = null;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      this.tokens = null;
    }
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.tokens = null;
    chrome.storage.local.remove(['auth_tokens']).catch(() => {});
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !!this.tokens.accessToken;
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure endpoint starts with / if not already
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.config.baseUrl}${normalizedEndpoint}`;

    // Add authentication header if available
    const headers = new Headers(options.headers || {});
    if (this.tokens && this.tokens.accessToken) {
      headers.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
      ...options,
      headers
    };

    console.log('API Request:', { method: options.method || 'GET', url, headers: Object.fromEntries(headers) });
    
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, clear it
        this.clearTokens();
        throw new Error('Unauthorized');
      }
      
      let errorText;
      try {
        errorText = await response.text();
      } catch (textError) {
        errorText = response.statusText;
      }
      
      // Log detailed error for debugging
      console.error('API Request Failed:', {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Object.fromEntries(response.headers)
      });
      
      throw new Error(`API request failed: ${errorText}`);
    }

    return response.json();
  }

  /**
   * User registration
   */
  async register(email: string, password: string, name: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await this.request<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });

    if (!response || !response.accessToken || !response.refreshToken) {
      throw new Error('Invalid registration response');
    }

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /**
   * User login
   */
  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await this.request<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!response || !response.accessToken || !response.refreshToken) {
      throw new Error('Invalid login response');
    }

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens || !this.tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.tokens.refreshToken })
    });

    if (!response || !response.accessToken) {
      throw new Error('Invalid refresh token response');
    }

    // Keep the same refresh token, only update access token
    this.setTokens(response.accessToken, this.tokens.refreshToken);
    return { accessToken: response.accessToken, refreshToken: this.tokens.refreshToken };
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    if (this.tokens) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.tokens.refreshToken })
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    this.clearTokens();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<User> {
    return this.request<User>('/users/profile');
  }

  /**
   * Get all scripts
   */
  async getScripts(): Promise<Script[]> {
    const response = await this.request<{ success: boolean; data: Script[] }>('/scripts');
    return response.data || [];
  }

  /**
   * Get projects for current user
   */
  async getProjects(): Promise<Project[]> {
    const response = await this.request<{ success: boolean; data: Project[] }>('/projects');
    return response.data || [];
  }

  /**
   * Get a specific script
   */
  async getScript(id: string): Promise<Script> {
    const response = await this.request<{ success: boolean; data: Script }>(`/scripts/${id}`);
    return response.data;
  }

  /**
   * Create a new script
   */
  async createScript(name: string, code: string, language: string, description?: string, projectId?: string): Promise<Script> {
    const response = await this.request<{ success: boolean; data: Script }>('/scripts', {
      method: 'POST',
      body: JSON.stringify({ name, code, language, description, projectId })
    });
    return response.data;
  }

  /**
   * Update a script
   */
  async updateScript(id: string, name: string, code: string, language: string, description?: string): Promise<Script> {
    const response = await this.request<{ success: boolean; data: Script }>(`/scripts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, code, language, description })
    });
    return response.data;
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string): Promise<void> {
    await this.request(`/scripts/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Start a new test run
   */
  async startTestRun(scriptId: string, dataFileId?: string, environment?: string, browser?: string): Promise<TestRun> {
    const response = await this.request<{ success: boolean; data: TestRun }>('/test-runs/start', {
      method: 'POST',
      body: JSON.stringify({ scriptId, dataFileId, environment, browser })
    });
    return response.data;
  }

  /**
   * Execute current script code directly (without saving to database)
   */
  async executeCurrentScript(code: string, language: string, environment?: string, browser?: string): Promise<TestRun> {
    const response = await this.request<{ success: boolean; data: TestRun }>('/test-runs/execute-current', {
      method: 'POST',
      body: JSON.stringify({ code, language, environment, browser })
    });
    return response.data;
  }

  /**
   * Stop a test run
   */
  async stopTestRun(testRunId: string): Promise<TestRun> {
    const response = await this.request<{ success: boolean; data: TestRun }>(`/test-runs/${testRunId}/stop`, {
      method: 'POST'
    });
    return response.data;
  }

  /**
   * Update test run with status and steps
   */
  async updateTestRun(testRunId: string, data: {
    status?: string;
    errorMsg?: string;
    duration?: number;
    steps?: Array<{ action: string; status: string; duration?: number }>;
  }): Promise<TestRun> {
    const response = await this.request<{ success: boolean; data: TestRun }>(`/test-runs/${testRunId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data;
  }

  /**
   * Get all test runs
   */
  async getTestRuns(): Promise<TestRun[]> {
    const response = await this.request<{ success: boolean; data: TestRun[] }>('/test-runs');
    return response.data || [];
  }

  /**
   * Get a specific test run
   */
  async getTestRun(id: string): Promise<TestRun> {
    const response = await this.request<{ success: boolean; data: TestRun }>(`/test-runs/${id}`);
    return response.data;
  }

  /**
   * Get active test runs
   */
  async getActiveTestRuns(): Promise<TestRun[]> {
    const response = await this.request<{ success: boolean; data: TestRun[] }>('/test-runs/active');
    return response.data || [];
  }

  /**
   * Connect to WebSocket
   */
  // Deleted:connectWebSocket(): void {
  // Deleted:  if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
  // Deleted:    return;
  // Deleted:  }
  // Deleted:
  // Deleted:  this.websocket = new WebSocket(this.config.wsUrl);
  // Deleted:
  // Deleted:  this.websocket.onopen = () => {
  // Deleted:    console.log('WebSocket connected');
  // Deleted:    if (this.tokens && this.tokens.accessToken) {
  // Deleted:      this.sendMessage('auth', { token: this.tokens.accessToken });
  // Deleted:    }
  // Deleted:  };
  // Deleted:
  // Deleted:  this.websocket.onmessage = (event) => {
  // Deleted:    try {
  // Deleted:      const message = JSON.parse(event.data);
  // Deleted:      const handler = this.messageHandlers.get(message.type);
  // Deleted:      if (handler) {
  // Deleted:        handler(message.data);
  // Deleted:      }
  // Deleted:    } catch (error) {
  // Deleted:      console.error('Error parsing WebSocket message:', error);
  // Deleted:    }
  // Deleted:  };
  // Deleted:
  // Deleted:  this.websocket.onclose = () => {
  // Deleted:    console.log('WebSocket disconnected');
  // Deleted:  };
  // Deleted:
  // Deleted:  this.websocket.onerror = (error) => {
  // Deleted:    console.error('WebSocket error:', error);
  // Deleted:  };
  // Deleted:}

  /**
   * Send message through WebSocket
   */
  // Deleted:sendMessage(type: string, data: any): void {
  // Deleted:  if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
  // Deleted:    this.websocket.send(JSON.stringify({ type, data }));
  // Deleted:  }
  // Deleted:}

  /**
   * Add message handler (no-op without WebSocket)
   */
  addMessageHandler(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler (no-op without WebSocket)
   */
  removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Disconnect WebSocket (no-op)
   */
  disconnect(): void {
    // no-op: WebSocket removed
  }
}

// Export singleton instance
export const apiService = new ApiService();
