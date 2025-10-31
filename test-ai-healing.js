/**
 * AI Healing Feature - Test Script
 * 
 * This script demonstrates how to use the AI Healing API
 * to analyze broken locators and get intelligent suggestions.
 */

const API_URL = 'http://localhost:3000/api';

// Example 1: Analyze a broken CSS locator
async function testAnalyzeLocator(token) {
  console.log('\n🔍 Test 1: Analyzing broken CSS locator...\n');
  
  const response = await fetch(`${API_URL}/ai-healing/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      brokenLocator: 'button.submit-btn-12345',
      brokenType: 'css',
      pageContext: {
        selectorCounts: {
          '[role="button"]': 5,
          'button': 12
        }
      },
      elementSnapshot: {
        tagName: 'button',
        textContent: 'Submit Form',
        attributes: {
          'id': 'submit-form',
          'class': 'btn btn-primary submit-btn-12345',
          'data-testid': 'submit-button',
          'aria-label': 'Submit form',
          'role': 'button',
          'name': 'submit'
        },
        boundingBox: { x: 100, y: 200, width: 150, height: 40 }
      },
      scriptId: 1
    })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('✅ Analysis Complete!\n');
    console.log(`Confidence: ${(data.data.confidence * 100).toFixed(0)}%`);
    console.log(`Recommended Action: ${data.data.recommendedAction}\n`);
    console.log('Top Suggestions:');
    data.data.suggestedLocators.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. [${(suggestion.score * 100).toFixed(0)}%] ${suggestion.locator}`);
      console.log(`     Type: ${suggestion.type}`);
      console.log(`     Reasoning: ${suggestion.reasoning}\n`);
    });
  } else {
    console.error('❌ Error:', data.error);
  }
  
  return data;
}

// Example 2: Batch analyze multiple locators
async function testBatchAnalyze(token) {
  console.log('\n🔍 Test 2: Batch analyzing multiple locators...\n');
  
  const response = await fetch(`${API_URL}/ai-healing/batch-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      locators: [
        {
          brokenLocator: '.old-class-123',
          brokenType: 'css',
          pageContext: {},
          elementSnapshot: {
            tagName: 'div',
            textContent: 'User Card',
            attributes: {
              'data-testid': 'user-card',
              'id': 'user-profile'
            }
          }
        },
        {
          brokenLocator: "//span[@id='temp-456']",
          brokenType: 'xpath',
          pageContext: {},
          elementSnapshot: {
            tagName: 'span',
            textContent: 'Welcome',
            attributes: {
              'aria-label': 'Welcome message',
              'role': 'status'
            }
          }
        },
        {
          brokenLocator: 'input.email-field-old',
          brokenType: 'css',
          pageContext: {},
          elementSnapshot: {
            tagName: 'input',
            attributes: {
              'name': 'email',
              'type': 'email',
              'placeholder': 'Enter email',
              'aria-label': 'Email address'
            }
          }
        }
      ]
    })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log(`✅ Batch analysis complete! Analyzed ${data.data.length} locators\n`);
    data.data.forEach((analysis, index) => {
      console.log(`Locator ${index + 1}:`);
      console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
      console.log(`  Best Suggestion: ${analysis.suggestedLocators[0]?.locator}`);
      console.log(`  Action: ${analysis.recommendedAction}\n`);
    });
  } else {
    console.error('❌ Error:', data.error);
  }
  
  return data;
}

// Example 3: Get AI Healing statistics
async function testGetStats(token) {
  console.log('\n📊 Test 3: Getting AI Healing statistics...\n');
  
  const response = await fetch(`${API_URL}/ai-healing/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('✅ Statistics Retrieved!\n');
    console.log(`Total Analyzed: ${data.data.totalAnalyzed}`);
    console.log(`Auto-Healed: ${data.data.autoHealed}`);
    console.log(`Manual Review: ${data.data.manualReview}`);
    console.log(`Success Rate: ${data.data.successRate.toFixed(1)}%`);
    console.log(`Average Confidence: ${(data.data.avgConfidence * 100).toFixed(0)}%\n`);
  } else {
    console.error('❌ Error:', data.error);
  }
  
  return data;
}

// Example 4: Demonstrate different element types
async function testVariousElementTypes(token) {
  console.log('\n🔍 Test 4: Testing various element types...\n');
  
  const elementTests = [
    {
      name: 'Link with text',
      data: {
        brokenLocator: 'a.nav-link-old',
        brokenType: 'css',
        pageContext: {},
        elementSnapshot: {
          tagName: 'a',
          textContent: 'Dashboard',
          attributes: {
            'href': '/dashboard',
            'aria-label': 'Navigate to dashboard'
          }
        }
      }
    },
    {
      name: 'Input with placeholder',
      data: {
        brokenLocator: '#password-temp',
        brokenType: 'css',
        pageContext: {},
        elementSnapshot: {
          tagName: 'input',
          attributes: {
            'type': 'password',
            'name': 'password',
            'placeholder': 'Enter password',
            'data-testid': 'password-input'
          }
        }
      }
    },
    {
      name: 'Select dropdown',
      data: {
        brokenLocator: 'select.country-old',
        brokenType: 'css',
        pageContext: {},
        elementSnapshot: {
          tagName: 'select',
          attributes: {
            'name': 'country',
            'aria-label': 'Select country',
            'data-testid': 'country-select'
          }
        }
      }
    }
  ];

  for (const test of elementTests) {
    console.log(`Testing: ${test.name}`);
    const response = await fetch(`${API_URL}/ai-healing/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(test.data)
    });

    const data = await response.json();
    if (data.success) {
      const topSuggestion = data.data.suggestedLocators[0];
      console.log(`  ✅ Top: ${topSuggestion.locator} (${(topSuggestion.score * 100).toFixed(0)}%)\n`);
    }
  }
}

// Main execution
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🤖 AI HEALING FEATURE - TEST SUITE                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  // First, you need to login to get a token
  console.log('\n⚠️  Note: Replace YOUR_TOKEN_HERE with actual JWT token from login\n');
  console.log('To get a token:');
  console.log('1. POST http://localhost:3000/api/auth/login');
  console.log('2. Body: { "email": "your@email.com", "password": "yourpassword" }');
  console.log('3. Copy the accessToken from response\n');
  
  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please update the token variable with your JWT token');
    console.log('\nExample login command (PowerShell):');
    console.log(`
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" \`
    -Method POST \`
    -ContentType "application/json" \`
    -Body $loginBody

$token = ($response.Content | ConvertFrom-Json).accessToken
Write-Host "Your token: $token"
    `);
    return;
  }
  
  try {
    await testAnalyzeLocator(token);
    await testBatchAnalyze(token);
    await testGetStats(token);
    await testVariousElementTypes(token);
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS COMPLETED SUCCESSFULLY                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Uncomment to run:
// runAllTests();

// Export functions for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAnalyzeLocator,
    testBatchAnalyze,
    testGetStats,
    testVariousElementTypes,
    runAllTests
  };
}
