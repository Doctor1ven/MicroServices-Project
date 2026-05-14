const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Secure Notes Microservice API',
      version: '1.0.0',
      description: 'JWT, refresh token, RBAC, notes, admin, and password reset API.'
    },
    servers: [
      {
        url: process.env.API_PUBLIC_URL || 'http://localhost:4000',
        description: 'API Gateway'
      },
      {
        url: process.env.BACKEND_PUBLIC_URL || 'http://localhost:5001',
        description: 'Backend microservice'
      }
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
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            failedLoginAttempts: { type: 'integer' },
            lockUntil: { type: 'string', format: 'date-time', nullable: true },
            isLocked: { type: 'boolean' }
          }
        },
        Note: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            owner: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Register a standard user',
          description: 'Public registration always assigns role user. Incoming role fields are ignored.',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Jane User' },
                    email: { type: 'string', example: 'jane@example.com' },
                    password: { type: 'string', example: 'StrongPass1!' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Registered',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokens' }
                }
              }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Login with email and password',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'jane@example.com' },
                    password: { type: 'string', example: 'StrongPass1!' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Login successful' },
            423: { description: 'Account locked' }
          }
        }
      },
      '/api/auth/refresh': {
        post: {
          summary: 'Exchange a valid refresh token for a new access token',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Access token refreshed' },
            401: { description: 'Invalid refresh token' }
          }
        }
      },
      '/api/auth/logout': {
        post: {
          summary: 'Invalidate the current refresh token',
          tags: ['Auth'],
          security: [{ bearerAuth: [] }],
          responses: {
            204: { description: 'Logged out' }
          }
        }
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Generate a password reset token',
          tags: ['Auth'],
          responses: {
            200: { description: 'Reset token generated if account exists' }
          }
        }
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Reset password using a valid reset token',
          tags: ['Auth'],
          responses: {
            200: { description: 'Password reset successful' },
            400: { description: 'Invalid or expired reset token' }
          }
        }
      },
      '/api/notes': {
        get: {
          summary: 'List the authenticated user notes',
          tags: ['Notes'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Notes returned' }
          }
        },
        post: {
          summary: 'Create a note',
          tags: ['Notes'],
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Note created' }
          }
        }
      },
      '/api/notes/{id}': {
        delete: {
          summary: 'Delete a note',
          tags: ['Notes'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            204: { description: 'Note deleted' },
            403: { description: 'Access denied' }
          }
        }
      },
      '/api/admin/users': {
        get: {
          summary: 'List all users',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Users returned' },
            403: { description: 'Access denied' }
          }
        }
      },
      '/api/admin/users/{id}': {
        delete: {
          summary: 'Delete a user and their notes',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            204: { description: 'User deleted' },
            403: { description: 'Access denied' }
          }
        }
      },
      '/api/admin/notes': {
        get: {
          summary: 'List all notes',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Notes returned' },
            403: { description: 'Access denied' }
          }
        }
      },
      '/api/admin/logs': {
        get: {
          summary: 'List recent audit log entries',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Audit logs returned' },
            403: { description: 'Access denied' }
          }
        }
      }
    }
  },
  apis: []
};

module.exports = swaggerJsdoc(options);
