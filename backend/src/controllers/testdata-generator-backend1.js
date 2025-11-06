// AI-Enhanced Test Data Generator with Machine Learning Patterns
// Supports: OpenAI API, Anthropic Claude API, and local inference

class AITestDataGenerator {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.provider = config.provider || 'openai'; // 'openai', 'anthropic', 'local'
    this.model = config.model || 'gpt-4';
    this.baseGenerator = new BaseDataGenerator();
    this.cache = new Map(); // Cache for AI responses
    this.learningPatterns = {}; // Store learned patterns
  }

  // ==================== AI-POWERED GENERATION ====================
  
  async generateWithAI(prompt, schema, count = 1) {
    const cacheKey = `${prompt}-${JSON.stringify(schema)}-${count}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const aiPrompt = this.buildAIPrompt(prompt, schema, count);
      let response;

      switch (this.provider) {
        case 'openai':
          response = await this.callOpenAI(aiPrompt);
          break;
        case 'anthropic':
          response = await this.callAnthropic(aiPrompt);
          break;
        case 'local':
          response = await this.callLocalModel(aiPrompt);
          break;
        default:
          throw new Error('Unsupported AI provider');
      }

      const parsedData = this.parseAIResponse(response);
      this.cache.set(cacheKey, parsedData);
      this.learnFromGeneration(prompt, parsedData);
      
      return parsedData;
    } catch (error) {
      console.error('AI generation failed, falling back to base generator:', error);
      return this.baseGenerator.generateTestData(schema, count);
    }
  }

  buildAIPrompt(userPrompt, schema, count) {
    return `Generate ${count} realistic test data records for automated testing.

Context: ${userPrompt}

Schema:
${JSON.stringify(schema, null, 2)}

Requirements:
- Generate REALISTIC and DIVERSE data suitable for Playwright automation testing
- Ensure data follows the schema structure exactly
- Include edge cases and boundary values (10% of records)
- Make data context-aware (e.g., valid email formats, realistic names)
- Include both positive and negative test scenarios
- Return ONLY valid JSON array, no explanations

Example format:
[
  {
    "field1": "value1",
    "field2": "value2"
  }
]`;
  }

  async callOpenAI(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a test data generation expert. Generate realistic, diverse test data in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callAnthropic(prompt) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callLocalModel(prompt) {
    // Simulated local inference - can be replaced with actual local model
    // Could use TensorFlow.js, ONNX Runtime, or other local inference engines
    console.log('Using local inference (simulated)');
    
    // For demo: intelligent pattern matching based on prompt
    return this.intelligentLocalGeneration(prompt);
  }

  intelligentLocalGeneration(prompt) {
    // AI-like generation using patterns and heuristics
    const patterns = this.extractPatterns(prompt);
    const schema = this.extractSchema(prompt);
    
    // Use learned patterns or fall back to smart generation
    if (this.learningPatterns[patterns.context]) {
      return this.generateFromLearned(this.learningPatterns[patterns.context], schema);
    }
    
    return this.smartGenerate(schema, patterns);
  }

  parseAIResponse(response) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                       response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  extractPatterns(prompt) {
    const patterns = {
      context: '',
      keywords: [],
      complexity: 'medium'
    };

    const keywords = ['login', 'user', 'product', 'order', 'payment', 'api', 'form', 'search'];
    patterns.keywords = keywords.filter(kw => prompt.toLowerCase().includes(kw));
    patterns.context = patterns.keywords[0] || 'general';

    return patterns;
  }

  extractSchema(prompt) {
    const schemaMatch = prompt.match(/Schema:\n([\s\S]*?)(?:\n\n|$)/);
    if (schemaMatch) {
      try {
        return JSON.parse(schemaMatch[1]);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  learnFromGeneration(prompt, data) {
    const patterns = this.extractPatterns(prompt);
    const context = patterns.context;
    
    if (!this.learningPatterns[context]) {
      this.learningPatterns[context] = {
        examples: [],
        patterns: {},
        frequency: 0
      };
    }

    this.learningPatterns[context].examples.push(data);
    this.learningPatterns[context].frequency++;

    // Analyze patterns in generated data
    if (Array.isArray(data) && data.length > 0) {
      const sample = data[0];
      for (const [key, value] of Object.entries(sample)) {
        if (!this.learningPatterns[context].patterns[key]) {
          this.learningPatterns[context].patterns[key] = new Set();
        }
        this.learningPatterns[context].patterns[key].add(typeof value);
      }
    }
  }

  generateFromLearned(learned, schema) {
    const examples = learned.examples.flat();
    if (examples.length === 0) {
      return this.smartGenerate(schema, { context: 'general' });
    }

    // Generate variations based on learned examples
    return examples.slice(0, 5).map(example => {
      const variant = { ...example };
      
      // Apply intelligent mutations
      for (const [key, value] of Object.entries(variant)) {
        if (Math.random() > 0.7) { // 30% mutation rate
          variant[key] = this.mutateValue(value, key);
        }
      }
      
      return variant;
    });
  }

  mutateValue(value, key) {
    if (typeof value === 'string') {
      if (key.includes('email')) return this.baseGenerator.generateEmail();
      if (key.includes('name')) return this.baseGenerator.generateFullName();
      if (key.includes('phone')) return this.baseGenerator.generatePhone();
      return `${value}_${Math.random().toString(36).substr(2, 5)}`;
    }
    if (typeof value === 'number') {
      return value + Math.floor(Math.random() * 20) - 10;
    }
    if (typeof value === 'boolean') {
      return Math.random() > 0.5;
    }
    return value;
  }

  smartGenerate(schema, patterns) {
    const generator = this.baseGenerator;
    const result = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const record = {};
      
      for (const [field, config] of Object.entries(schema)) {
        // Context-aware generation
        if (patterns.context === 'login' && field.includes('password')) {
          record[field] = this.generateSecurePassword();
        } else if (patterns.context === 'product' && field.includes('price')) {
          record[field] = this.generateRealisticPrice();
        } else {
          record[field] = generator.generateByType(config, field);
        }
      }
      
      result.push(record);
    }

    return result;
  }

  generateSecurePassword() {
    const requirements = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      '!@#$%^&*'
    ];
    
    let password = '';
    requirements.forEach(chars => {
      password += chars[Math.floor(Math.random() * chars.length)];
    });
    
    const allChars = requirements.join('');
    while (password.length < 12) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  generateRealisticPrice() {
    const ranges = [
      { min: 5, max: 20, weight: 0.3 },
      { min: 20, max: 100, weight: 0.4 },
      { min: 100, max: 500, weight: 0.2 },
      { min: 500, max: 2000, weight: 0.1 }
    ];
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (const range of ranges) {
      cumulative += range.weight;
      if (rand <= cumulative) {
        return parseFloat((Math.random() * (range.max - range.min) + range.min).toFixed(2));
      }
    }
    
    return 29.99;
  }

  // ==================== ADVANCED AI FEATURES ====================

  async generateContextualData(context, count = 5) {
    const prompts = {
      'e-commerce': 'Generate test data for an e-commerce checkout flow including products, cart items, and payment methods',
      'login': 'Generate test data for login scenarios including valid users, invalid credentials, and edge cases',
      'form-validation': 'Generate test data for form validation including valid inputs, invalid formats, and boundary values',
      'api-testing': 'Generate test data for API testing including headers, request bodies, and expected responses',
      'search': 'Generate test data for search functionality including various search terms and filters'
    };

    const schemas = {
      'e-commerce': {
        userId: 'uuid',
        cartItems: { type: 'array', items: 'product' },
        paymentMethod: { enum: ['credit_card', 'paypal', 'bank_transfer'] },
        shippingAddress: 'address',
        totalAmount: 'price'
      },
      'login': {
        username: 'username',
        password: 'password',
        email: 'email',
        role: { enum: ['admin', 'user', 'guest'] },
        isValid: 'boolean'
      },
      'form-validation': {
        fieldName: 'string',
        inputValue: 'string',
        expectedResult: { enum: ['valid', 'invalid'] },
        errorMessage: 'string'
      },
      'api-testing': {
        endpoint: 'url',
        method: { enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        headers: 'json',
        requestBody: 'json',
        expectedStatus: { type: 'integer', min: 200, max: 599 }
      },
      'search': {
        searchTerm: 'string',
        filters: 'json',
        expectedResults: { type: 'integer', min: 0, max: 1000 },
        sortBy: { enum: ['relevance', 'date', 'price'] }
      }
    };

    const prompt = prompts[context] || `Generate test data for ${context}`;
    const schema = schemas[context] || { data: 'string' };

    return await this.generateWithAI(prompt, schema, count);
  }

  async generateBoundaryTestCases(fieldType, fieldName) {
    const boundaries = {
      'string': [
        '', // empty
        'a', // single char
        'a'.repeat(255), // max length
        'a'.repeat(256), // over max
        '<script>alert("xss")</script>', // XSS
        "'; DROP TABLE users--", // SQL injection
        '../../../etc/passwd', // path traversal
      ],
      'number': [
        0,
        -1,
        1,
        2147483647, // max int32
        2147483648, // overflow
        -2147483648, // min int32
        0.1,
        -0.1
      ],
      'email': [
        'valid@example.com',
        'invalid.email',
        '@example.com',
        'test@',
        'test@example',
        'test..test@example.com',
        'test@example..com'
      ],
      'phone': [
        '+1-234-567-8900',
        '1234567890',
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        'invalid-phone',
        '123'
      ]
    };

    return boundaries[fieldType] || [];
  }

  async generateNegativeTestCases(schema) {
    const negativeTests = [];

    for (const [field, type] of Object.entries(schema)) {
      // Missing field
      negativeTests.push({
        scenario: `Missing ${field}`,
        data: { ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== field)) },
        expectedError: `${field} is required`
      });

      // Wrong type
      if (typeof type === 'string') {
        negativeTests.push({
          scenario: `Invalid ${field} type`,
          data: { ...schema, [field]: 12345 },
          expectedError: `${field} must be a ${type}`
        });
      }

      // Null value
      negativeTests.push({
        scenario: `Null ${field}`,
        data: { ...schema, [field]: null },
        expectedError: `${field} cannot be null`
      });
    }

    return negativeTests;
  }

  // ==================== INTELLIGENT FEATURES ====================

  async analyzeExistingData(existingData) {
    const analysis = {
      recordCount: existingData.length,
      fields: {},
      patterns: {},
      recommendations: []
    };

    if (existingData.length === 0) {
      return analysis;
    }

    // Analyze fields
    const sample = existingData[0];
    for (const field of Object.keys(sample)) {
      const values = existingData.map(record => record[field]);
      
      analysis.fields[field] = {
        type: typeof values[0],
        unique: new Set(values).size,
        nullCount: values.filter(v => v === null).length,
        samples: values.slice(0, 5)
      };

      // Pattern detection
      if (typeof values[0] === 'string') {
        const emailPattern = values.filter(v => /@/.test(v)).length;
        const phonePattern = values.filter(v => /\d{3}-\d{3}-\d{4}/.test(v)).length;
        
        if (emailPattern > values.length * 0.8) {
          analysis.patterns[field] = 'email';
        } else if (phonePattern > values.length * 0.8) {
          analysis.patterns[field] = 'phone';
        }
      }
    }

    // Generate recommendations
    if (existingData.length < 10) {
      analysis.recommendations.push('Consider generating more test data for better coverage');
    }

    for (const [field, info] of Object.entries(analysis.fields)) {
      if (info.unique === 1) {
        analysis.recommendations.push(`Field '${field}' has no variation - consider adding diverse values`);
      }
    }

    return analysis;
  }

  async suggestTestScenarios(context) {
    const scenarios = {
      'e-commerce': [
        'Guest checkout',
        'Registered user checkout',
        'Cart abandonment',
        'Apply discount code',
        'Multiple payment methods',
        'International shipping',
        'Out of stock items',
        'Cart total calculation'
      ],
      'login': [
        'Valid credentials',
        'Invalid password',
        'Non-existent user',
        'Account locked',
        'Password reset flow',
        'Remember me functionality',
        'Social login',
        'Two-factor authentication'
      ],
      'form': [
        'Valid submission',
        'Missing required fields',
        'Invalid email format',
        'Password mismatch',
        'Special characters handling',
        'Max length validation',
        'XSS prevention',
        'SQL injection prevention'
      ]
    };

    return scenarios[context] || ['Create test data', 'Run test', 'Verify results'];
  }

  exportForPlaywright(testData, testName) {
    return `// Playwright Test: ${testName}
// Generated by AI Test Data Generator

import { test, expect } from '@playwright/test';

const testData = ${JSON.stringify(testData, null, 2)};

test.describe('${testName}', () => {
  testData.forEach((data, index) => {
    test(\`Test case \${index + 1}: \${data.scenario || 'default'}\`, async ({ page }) => {
      // Navigate to your application
      await page.goto('YOUR_APP_URL');
      
      // TODO: Add your test logic here using the test data
      // Example:
      // await page.fill('#username', data.username);
      // await page.fill('#password', data.password);
      // await page.click('#submit');
      
      // Add assertions
      // await expect(page.locator('.success')).toBeVisible();
    });
  });
});

// Export test data for reuse
export { testData };`;
  }
}

// Base Data Generator (from previous implementation)
class BaseDataGenerator {
  constructor() {
    this.patterns = {
      email: ['gmail.com', 'yahoo.com', 'outlook.com', 'test.com'],
      firstNames: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'],
      lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'],
      cities: ['New York', 'Los Angeles', 'Chicago', 'Houston'],
      states: ['NY', 'CA', 'TX', 'FL']
    };
  }

  generateTestData(schema, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const record = {};
      for (const [field, type] of Object.entries(schema)) {
        record[field] = this.generateByType(type, field);
      }
      results.push(record);
    }
    return results;
  }

  generateByType(type, field) {
    const generators = {
      'uuid': () => this.generateUUID(),
      'username': () => this.generateUsername(),
      'email': () => this.generateEmail(),
      'password': () => this.generatePassword(),
      'name': () => this.generateFullName(),
      'phone': () => this.generatePhone(),
      'address': () => this.generateAddress(),
      'url': () => 'https://example.com',
      'string': () => `test_${field}_${Math.random().toString(36).substr(2, 5)}`,
      'number': () => Math.floor(Math.random() * 1000),
      'boolean': () => Math.random() > 0.5,
      'date': () => new Date().toISOString().split('T')[0],
      'price': () => parseFloat((Math.random() * 1000).toFixed(2)),
      'product': () => 'Test Product ' + Math.floor(Math.random() * 100)
    };

    return generators[type] ? generators[type]() : `value_${field}`;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  generateUsername() {
    const first = this.patterns.firstNames[Math.floor(Math.random() * this.patterns.firstNames.length)].toLowerCase();
    const last = this.patterns.lastNames[Math.floor(Math.random() * this.patterns.lastNames.length)].toLowerCase();
    return `${first}.${last}${Math.floor(Math.random() * 1000)}`;
  }

  generateEmail() {
    return `${this.generateUsername()}@${this.patterns.email[Math.floor(Math.random() * this.patterns.email.length)]}`;
  }

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array(12).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  generateFullName() {
    const first = this.patterns.firstNames[Math.floor(Math.random() * this.patterns.firstNames.length)];
    const last = this.patterns.lastNames[Math.floor(Math.random() * this.patterns.lastNames.length)];
    return `${first} ${last}`;
  }

  generatePhone() {
    return `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  generateAddress() {
    return {
      street: `${Math.floor(Math.random() * 9999)} Main St`,
      city: this.patterns.cities[Math.floor(Math.random() * this.patterns.cities.length)],
      state: this.patterns.states[Math.floor(Math.random() * this.patterns.states.length)],
      zipcode: String(Math.floor(Math.random() * 90000 + 10000))
    };
  }
}

// Usage Examples
const config = {
  provider: 'openai', // or 'anthropic', 'local'
  apiKey: 'your-api-key-here', // Set via environment variable in production
  model: 'gpt-4'
};

const aiGenerator = new AITestDataGenerator(config);

// Example 1: AI-powered contextual generation
console.log('=== AI Contextual Generation ===');
aiGenerator.generateContextualData('login', 5).then(data => {
  console.log(JSON.stringify(data, null, 2));
});

// Example 2: Boundary test cases
console.log('\n=== Boundary Test Cases ===');
aiGenerator.generateBoundaryTestCases('email', 'userEmail').then(cases => {
  console.log(JSON.stringify(cases, null, 2));
});

// Example 3: Negative test cases
console.log('\n=== Negative Test Cases ===');
const schema = { username: 'string', email: 'email', password: 'password' };
aiGenerator.generateNegativeTestCases(schema).then(tests => {
  console.log(JSON.stringify(tests, null, 2));
});

// Example 4: Playwright export
const sampleData = [
  { username: 'john.doe', password: 'Test@123', scenario: 'valid login' },
  { username: 'invalid', password: 'wrong', scenario: 'invalid credentials' }
];
console.log('\n=== Playwright Export ===');
console.log(aiGenerator.exportForPlaywright(sampleData, 'Login Tests'));

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AITestDataGenerator, BaseDataGenerator };
}