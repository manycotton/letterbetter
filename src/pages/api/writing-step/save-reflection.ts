import { NextApiRequest, NextApiResponse } from 'next';
import { saveReflectionStepDataWithVersioning } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, reflectionItems, selectedHintTags, allGeneratedHints } = req.body;

    console.log('Save reflection API called with:');
    console.log('- sessionId:', sessionId);
    console.log('- reflectionItems count:', reflectionItems?.length);
    console.log('- selectedHintTags:', JSON.stringify(selectedHintTags, null, 2));
    console.log('- allGeneratedHints:', JSON.stringify(allGeneratedHints, null, 2));
    
    // Debug each reflection item's metadata
    if (reflectionItems && Array.isArray(reflectionItems)) {
      reflectionItems.forEach((item, index) => {
        console.log(`Reflection item ${index}:`, {
          id: item.id,
          hasContent: !!item.content,
          selectedHints: item.selectedHints || [],
          selectedFactors: item.selectedFactors || []
        });
      });
    }

    if (!sessionId || !reflectionItems || !selectedHintTags || !allGeneratedHints) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, reflectionItems, selectedHintTags, allGeneratedHints' 
      });
    }

    const reflectionData = await saveReflectionStepDataWithVersioning(sessionId, reflectionItems, selectedHintTags, allGeneratedHints);

    res.status(200).json({ 
      message: 'Reflection step data saved successfully',
      reflectionData
    });

  } catch (error) {
    console.error('Error saving reflection step data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}