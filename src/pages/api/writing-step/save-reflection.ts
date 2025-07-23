import { NextApiRequest, NextApiResponse } from 'next';
import { saveReflectionStepDataWithVersioning } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, reflectionItems, selectedHintTags, allGeneratedHints } = req.body;

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