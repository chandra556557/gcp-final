// AI-Powered Test Data Generator - Backend Logic
// This module generates realistic test data based on schemas and patterns

class TestDataGenerator {
  constructor() {
    this.patterns = {
      email: ['gmail.com', 'yahoo.com', 'outlook.com', 'test.com', 'example.com'],
      domains: ['example.com', 'test.com', 'demo.com', 'sample.org'],
      firstNames: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Anna', 'Robert', 'Lisa'],
      lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
      cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'],
      states: ['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'],
      countries: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Australia', 'Japan', 'India'],
      companies: ['TechCorp', 'DataSystems', 'CloudInnovate', 'WebSolutions', 'AppDynamics', 'CodeFactory'],
      products: ['Widget', 'Gadget', 'Device', 'Tool', 'Accessory', 'Component', 'Module', 'System'],
      categories: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food', 'Health'],
      currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
      roles: ['admin', 'user', 'manager', 'editor', 'viewer', 'moderator'],
      statuses: ['active', 'inactive', 'pending', 'suspended', 'verified'],
      paymentMethods: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto']
    };
  }

  // Main generation method
  generateTestData(schema, count = 1, options = {}) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.generateSingleRecord(schema, options));
    }
    return results;
  }

  // Generate a single record based on schema
  generateSingleRecord(schema, options = {}) {
    const record = {};
    
    for (const [field, config] of Object.entries(schema)) {
      if (typeof config === 'string') {
        // Simple type definition
        record[field] = this.generateByType(config, field, options);
      } else if (typeof config === 'object') {
        // Complex field definition with constraints
        record[field] = this.generateByConfig(config, field, options);
      }
    }
    
    return record;
  }

  // Generate data by type
  generateByType(type, fieldName, options) {
    const generators = {
      'string': () => this.generateString(fieldName),
      'email': () => this.generateEmail(),
      'username': () => this.generateUsername(),
      'password': () => this.generatePassword(),
      'name': () => this.generateFullName(),
      'firstName': () => this.randomChoice(this.patterns.firstNames),
      'lastName': () => this.randomChoice(this.patterns.lastNames),
      'phone': () => this.generatePhone(),
      'address': () => this.generateAddress(),
      'city': () => this.randomChoice(this.patterns.cities),
      'state': () => this.randomChoice(this.patterns.states),
      'country': () => this.randomChoice(this.patterns.countries),
      'zipcode': () => this.generateZipcode(),
      'company': () => this.randomChoice(this.patterns.companies),
      'url': () => this.generateURL(),
      'uuid': () => this.generateUUID(),
      'number': () => this.randomInt(1, 1000),
      'integer': () => this.randomInt(1, 1000),
      'float': () => this.randomFloat(1, 1000),
      'boolean': () => Math.random() > 0.5,
      'date': () => this.generateDate(),
      'datetime': () => this.generateDateTime(),
      'timestamp': () => Date.now(),
      'price': () => this.randomFloat(5, 999, 2),
      'currency': () => this.randomChoice(this.patterns.currencies),
      'product': () => this.generateProduct(),
      'category': () => this.randomChoice(this.patterns.categories),
      'role': () => this.randomChoice(this.patterns.roles),
      'status': () => this.randomChoice(this.patterns.statuses),
      'json': () => this.generateJSON(),
      'array': () => this.generateArray(),
      'creditCard': () => this.generateCreditCard(),
      'ssn': () => this.generateSSN(),
      'ipAddress': () => this.generateIPAddress(),
      'macAddress': () => this.generateMACAddress(),
      'userAgent': () => this.generateUserAgent(),
      'apiKey': () => this.generateAPIKey(),
      'token': () => this.generateToken()
    };

    return generators[type] ? generators[type]() : this.generateString(fieldName);
  }

  // Generate data by configuration
  generateByConfig(config, fieldName, options) {
    const { type, min, max, length, pattern, enum: enumValues, required, unique } = config;

    if (enumValues && Array.isArray(enumValues)) {
      return this.randomChoice(enumValues);
    }

    if (pattern) {
      return this.generateFromPattern(pattern);
    }

    let value;

    switch (type) {
      case 'number':
      case 'integer':
        value = this.randomInt(min || 1, max || 1000);
        break;
      case 'float':
        value = this.randomFloat(min || 1, max || 1000, 2);
        break;
      case 'string':
        value = this.generateString(fieldName, length);
        break;
      case 'array':
        const arrayLength = length || this.randomInt(1, 5);
        value = Array(arrayLength).fill(null).map(() => 
          config.items ? this.generateByType(config.items, fieldName, options) : this.generateString(fieldName)
        );
        break;
      case 'object':
        value = config.properties ? this.generateSingleRecord(config.properties, options) : {};
        break;
      default:
        value = this.generateByType(type, fieldName, options);
    }

    return value;
  }

  // Helper methods for generating specific types
  generateEmail() {
    const username = this.generateUsername().toLowerCase();
    const domain = this.randomChoice(this.patterns.email);
    return `${username}@${domain}`;
  }

  generateUsername() {
    const firstName = this.randomChoice(this.patterns.firstNames).toLowerCase();
    const lastName = this.randomChoice(this.patterns.lastNames).toLowerCase();
    const number = this.randomInt(1, 999);
    return `${firstName}.${lastName}${number}`;
  }

  generatePassword(length = 12) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = upper + lower + numbers + special;
    
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  generateFullName() {
    return `${this.randomChoice(this.patterns.firstNames)} ${this.randomChoice(this.patterns.lastNames)}`;
  }

  generatePhone() {
    return `+1-${this.randomInt(200, 999)}-${this.randomInt(200, 999)}-${this.randomInt(1000, 9999)}`;
  }

  generateAddress() {
    return {
      street: `${this.randomInt(1, 9999)} ${this.randomChoice(this.patterns.lastNames)} St`,
      city: this.randomChoice(this.patterns.cities),
      state: this.randomChoice(this.patterns.states),
      zipcode: this.generateZipcode(),
      country: this.randomChoice(this.patterns.countries)
    };
  }

  generateZipcode() {
    return String(this.randomInt(10000, 99999));
  }

  generateURL() {
    const domain = this.randomChoice(this.patterns.domains);
    const path = this.generateString('path').toLowerCase().replace(/\s/g, '-');
    return `https://${domain}/${path}`;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateDate() {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  generateDateTime() {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
  }

  generateProduct() {
    const adj = ['Premium', 'Deluxe', 'Standard', 'Pro', 'Ultra', 'Smart'];
    const product = this.randomChoice(this.patterns.products);
    return `${this.randomChoice(adj)} ${product}`;
  }

  generateJSON() {
    return {
      id: this.generateUUID(),
      name: this.generateFullName(),
      active: Math.random() > 0.5
    };
  }

  generateArray(length = 3) {
    return Array(length).fill(null).map((_, i) => `item_${i + 1}`);
  }

  generateCreditCard() {
    const prefix = this.randomChoice(['4', '5', '37', '6']);
    let card = prefix;
    const targetLength = prefix === '37' ? 15 : 16;
    
    while (card.length < targetLength - 1) {
      card += this.randomInt(0, 9);
    }
    
    // Luhn algorithm checksum
    let sum = 0;
    let double = false;
    for (let i = card.length - 1; i >= 0; i--) {
      let digit = parseInt(card[i]);
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    const checksum = (10 - (sum % 10)) % 10;
    
    return card + checksum;
  }

  generateSSN() {
    return `${this.randomInt(100, 999)}-${this.randomInt(10, 99)}-${this.randomInt(1000, 9999)}`;
  }

  generateIPAddress() {
    return `${this.randomInt(1, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(1, 255)}`;
  }

  generateMACAddress() {
    return Array(6).fill(null)
      .map(() => this.randomInt(0, 255).toString(16).padStart(2, '0'))
      .join(':');
  }

  generateUserAgent() {
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    ];
    return this.randomChoice(browsers);
  }

  generateAPIKey() {
    return `sk_test_${this.randomString(32, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;
  }

  generateToken() {
    return this.randomString(64, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  }

  generateString(fieldName, length) {
    const words = ['test', 'data', 'sample', 'demo', 'example'];
    const base = this.randomChoice(words);
    const suffix = fieldName || 'value';
    return `${base}_${suffix}_${this.randomInt(1, 999)}`;
  }

  generateFromPattern(pattern) {
    // Simple pattern matching (e.g., "###-###-####" for phone)
    return pattern.replace(/#/g, () => this.randomInt(0, 9))
                  .replace(/A/g, () => String.fromCharCode(65 + this.randomInt(0, 25)))
                  .replace(/a/g, () => String.fromCharCode(97 + this.randomInt(0, 25)));
  }

  randomString(length, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
  }

  // Generate test data for common scenarios
  generateUserData(count = 1) {
    const schema = {
      id: 'uuid',
      username: 'username',
      email: 'email',
      password: 'password',
      firstName: 'firstName',
      lastName: 'lastName',
      phone: 'phone',
      role: 'role',
      status: 'status',
      createdAt: 'datetime',
      lastLogin: 'datetime'
    };
    return this.generateTestData(schema, count);
  }

  generateProductData(count = 1) {
    const schema = {
      id: 'uuid',
      sku: { type: 'string', pattern: 'PRD-####-AAA' },
      name: 'product',
      description: 'string',
      category: 'category',
      price: 'price',
      currency: 'currency',
      stock: { type: 'integer', min: 0, max: 1000 },
      active: 'boolean',
      createdAt: 'datetime'
    };
    return this.generateTestData(schema, count);
  }

  generateOrderData(count = 1) {
    const schema = {
      orderId: 'uuid',
      customerId: 'uuid',
      orderNumber: { type: 'string', pattern: 'ORD-######' },
      items: { type: 'array', items: 'product', length: 3 },
      totalAmount: 'price',
      currency: 'currency',
      status: { enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
      paymentMethod: { enum: this.patterns.paymentMethods },
      shippingAddress: 'address',
      orderDate: 'datetime',
      deliveryDate: 'date'
    };
    return this.generateTestData(schema, count);
  }

  generateAPITestData(count = 1) {
    const schema = {
      endpoint: 'url',
      method: { enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      headers: {
        type: 'object',
        properties: {
          'Content-Type': { enum: ['application/json', 'application/xml', 'text/plain'] },
          'Authorization': 'token',
          'User-Agent': 'userAgent'
        }
      },
      queryParams: {
        type: 'object',
        properties: {
          page: { type: 'integer', min: 1, max: 100 },
          limit: { type: 'integer', min: 10, max: 100 },
          sort: { enum: ['asc', 'desc'] }
        }
      },
      requestBody: 'json',
      expectedStatus: { enum: [200, 201, 400, 401, 403, 404, 500] }
    };
    return this.generateTestData(schema, count);
  }

  // Export to JSON file format
  exportToJSON(data, filename = 'testdata.json') {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        generator: 'AI Test Data Generator v1.0'
      },
      data: data
    };
  }

  // Generate complete test suite
  generateTestSuite(config) {
    const suite = {
      suiteName: config.name || 'Test Suite',
      environment: config.environment || 'staging',
      generatedAt: new Date().toISOString(),
      testData: {}
    };

    for (const [key, value] of Object.entries(config.scenarios)) {
      if (typeof value === 'string') {
        // Predefined scenario
        const method = `generate${value.charAt(0).toUpperCase() + value.slice(1)}Data`;
        suite.testData[key] = this[method] ? this[method](config.count || 5) : [];
      } else {
        // Custom schema
        suite.testData[key] = this.generateTestData(value.schema, value.count || 5);
      }
    }

    return suite;
  }
}

// Example usage and API endpoints simulation
const generator = new TestDataGenerator();

// Example 1: Generate user data
const users = generator.generateUserData(5);
console.log('Generated Users:', JSON.stringify(users, null, 2));

// Example 2: Generate custom schema
const customSchema = {
  testId: 'uuid',
  testName: 'string',
  browser: { enum: ['chrome', 'firefox', 'safari', 'edge'] },
  viewport: {
    type: 'object',
    properties: {
      width: { type: 'integer', min: 1024, max: 1920 },
      height: { type: 'integer', min: 768, max: 1080 }
    }
  },
  timeout: { type: 'integer', min: 5000, max: 30000 },
  retries: { type: 'integer', min: 0, max: 3 }
};
const playwrightConfig = generator.generateTestData(customSchema, 3);
console.log('Playwright Config:', JSON.stringify(playwrightConfig, null, 2));

// Example 3: Generate complete test suite
const testSuite = generator.generateTestSuite({
  name: 'E-commerce Test Suite',
  environment: 'staging',
  count: 10,
  scenarios: {
    users: 'user',
    products: 'product',
    orders: 'order',
    apiTests: 'apiTest'
  }
});
console.log('Test Suite:', JSON.stringify(testSuite, null, 2));

// Export for use in Node.js or module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestDataGenerator;
}