import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Playwright CRX Enhanced Backend API',
    version: '1.0.0',
    description: 'API documentation for Playwright CRX Enhanced backend',
  },
  servers: [
    { url: 'http://localhost:3001/api' },
    { url: 'http://127.0.0.1:3001/api' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Script: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          language: { type: 'string' },
          code: { type: 'string' },
          browserType: { type: 'string' },
          viewport: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' }
            }
          },
          testIdAttribute: { type: 'string' },
          selfHealingEnabled: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          projectId: { type: 'string' }
        }
      },
      TestRun: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          scriptId: { type: 'string' },
          status: { type: 'string' },
          duration: { type: 'number' },
          errorMsg: { type: 'string' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          environment: { type: 'string' },
          browser: { type: 'string' },
          traceUrl: { type: 'string' },
          videoUrl: { type: 'string' },
          screenshotUrls: { type: 'array', items: { type: 'string' } }
        }
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  },
  tags: [
    { name: 'Auth' },
    { name: 'Scripts' },
    { name: 'TestRuns' },
    { name: 'Extensions' }
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    tokens: { $ref: '#/components/schemas/AuthTokens' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email', 'password', 'name']
              }
            }
          }
        },
        responses: { '201': { description: 'User registered' } }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refreshToken: { type: 'string' } },
                required: ['refreshToken']
              }
            }
          }
        },
        responses: { '200': { description: 'Token refreshed' } }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Logged out' } }
      }
    },

    '/scripts': {
      get: {
        tags: ['Scripts'],
        summary: 'Get scripts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of scripts',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Script' } } } }
          }
        }
      },
      post: {
        tags: ['Scripts'],
        summary: 'Create script',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' },
                  language: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['name', 'code']
              }
            }
          }
        },
        responses: { '201': { description: 'Script created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Script' } } } } }
      }
    },
    '/scripts/{id}': {
      get: {
        tags: ['Scripts'],
        summary: 'Get script by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Script', content: { 'application/json': { schema: { $ref: '#/components/schemas/Script' } } } } }
      },
      put: {
        tags: ['Scripts'],
        summary: 'Update script',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' },
                  language: { type: 'string' },
                  description: { type: 'string' },
                  browserType: { type: 'string' },
                  viewport: { type: 'object' },
                  testIdAttribute: { type: 'string' },
                  selfHealingEnabled: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Script updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Script' } } } } }
      },
      delete: {
        tags: ['Scripts'],
        summary: 'Delete script',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Script deleted' } }
      }
    },

    '/test-runs': {
      get: {
        tags: ['TestRuns'],
        summary: 'Get test runs',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of test runs',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TestRun' } } } }
          }
        }
      }
    },
    '/test-runs/active': {
      get: {
        tags: ['TestRuns'],
        summary: 'Get active test runs',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Active test runs' } }
      }
    },
    '/test-runs/{id}': {
      get: {
        tags: ['TestRuns'],
        summary: 'Get test run by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Test run', content: { 'application/json': { schema: { $ref: '#/components/schemas/TestRun' } } } } }
      }
    },
    '/test-runs/start': {
      post: {
        tags: ['TestRuns'],
        summary: 'Start a test run',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { scriptId: { type: 'string' }, environment: { type: 'string' }, browser: { type: 'string' } }, required: ['scriptId'] } } }
        },
        responses: { '201': { description: 'Test run started' } }
      }
    },
    '/test-runs/{testRunId}/stop': {
      post: {
        tags: ['TestRuns'],
        summary: 'Stop a test run',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'testRunId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Test run stopped' } }
      }
    },
    '/test-runs/report': {
      post: {
        tags: ['TestRuns'],
        summary: 'Report a completed test run',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { testName: { type: 'string' }, status: { type: 'string' } }, required: ['testName', 'status'] } } }
        },
        responses: { '201': { description: 'Test run reported' } }
      }
    },

    '/extensions/ping': {
      get: {
        tags: ['Extensions'],
        summary: 'Ping backend',
        responses: { '200': { description: 'OK' } }
      }
    }
  }
};

const options = {
  definition: swaggerDefinition,
  apis: []
};

export const swaggerSpec = swaggerJsdoc(options);
