import { NextApiRequest, NextApiResponse } from 'next';
import { saveReflectionStepDataWithVersioning } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, reflectionItems, selectedHintTags, selectedFactors, selectedHints, allGeneratedHints } = req.body;

    console.log('Save reflection API called with:');
    console.log('- sessionId:', sessionId);
    console.log('- reflectionItems count:', reflectionItems?.length);
    console.log('- selectedHintTags (legacy):', JSON.stringify(selectedHintTags, null, 2));
    console.log('- selectedFactors:', JSON.stringify(selectedFactors, null, 2));
    console.log('- selectedHints:', JSON.stringify(selectedHints, null, 2));
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

    if (!sessionId || !reflectionItems || !allGeneratedHints) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, reflectionItems, allGeneratedHints' 
      });
    }
    
    // Transform hint data for database storage - support both legacy and new format
    let selectedHintData = [];
    
    if (selectedFactors && selectedHints) {
      // New format: separate factors and hints
      selectedHintData = reflectionItems.map((item: any) => ({
        reflectionId: item.id,
        selectedFactors: selectedFactors[item.id] || [],
        selectedHints: selectedHints[item.id] || []
      }));
    } else if (selectedHintTags) {
      // Legacy format: convert selectedHintTags to factors/hints split
      selectedHintData = selectedHintTags.map((item: any) => ({
        reflectionId: item.reflectionId,
        selectedFactors: item.tags || [], // For now, treat all as factors until we have proper categorization
        selectedHints: []
      }));
    } else {
      selectedHintData = [];
    }

    const reflectionData = await saveReflectionStepDataWithVersioning(sessionId, reflectionItems, selectedHintData, allGeneratedHints);

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