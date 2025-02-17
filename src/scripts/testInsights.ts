import { localAIService } from '../services/LocalAIService';
import { testTransactions } from '../data/testTransactions';

async function testInsights() {
  console.log('🔍 Testing AI Insights System...\n');

  try {
    console.log('📊 Analyzing test transactions...');
    const insights = await localAIService.analyzeTransactions(testTransactions);

    console.log('\n✨ Generated Insights:');
    insights.forEach((insight, index) => {
      console.log(`\n🔹 Insight ${index + 1}:`);
      console.log(`Type: ${insight.type}`);
      console.log(`Title: ${insight.title}`);
      console.log(`Description: ${insight.description}`);
      console.log(`Impact: £${Math.abs(insight.impact).toFixed(2)}`);
      console.log(`Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      if (insight.category) {
        console.log(`Category: ${insight.category}`);
      }
      if (insight.action) {
        console.log(`Action: ${insight.action.description}`);
      }
    });

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testInsights();
