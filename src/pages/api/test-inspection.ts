import { NextApiRequest, NextApiResponse } from 'next';
import { saveInspectionData, getReflectionItem } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== TEST INSPECTION API CALLED ===');
    
    // Test with hardcoded data to see if the data flow works
    const testSessionId = '1753281769014:ocjgaaxg1';
    const testInspectionResults = [{
      reflectionId: '1753282523676',
      emotionCheck: {
        hasEmotion: true,
        suggestion: 'Test emotion suggestion',
        situationSummary: 'Test situation'
      },
      blameCheck: {
        hasBlamePattern: true,
        warning: 'Test warning',
        environmentalFactors: ['Test factor 1', 'Test factor 2']
      }
    }];
    
    // First, check if the reflection item exists
    console.log('Checking if reflection item exists before calling saveInspectionData...');
    const existingItem = await getReflectionItem('1753282523676', testSessionId);
    console.log('Existing item:', existingItem);
    
    console.log('About to call saveInspectionData with test data:', {
      sessionId: testSessionId,
      inspectionResults: testInspectionResults
    });
    
    const result = await saveInspectionData(testSessionId, testInspectionResults);
    
    console.log('saveInspectionData completed successfully:', result);
    
    // Check the item again after update
    const updatedItem = await getReflectionItem('1753282523676', testSessionId);
    console.log('Item after update:', updatedItem);
    
    return res.status(200).json({
      success: true,
      message: 'Test inspection data saved',
      result,
      debug: {
        existingItemBefore: existingItem,
        updatedItemAfter: updatedItem,
        idComparison: {
          existingId: existingItem?.id,
          existingIdType: typeof existingItem?.id,
          reflectionId: '1753282523676',
          reflectionIdType: typeof '1753282523676',
          areEqual: existingItem?.id == '1753282523676'
        }
      }
    });
    
  } catch (error) {
    console.error('Error in test inspection API:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
  }
}