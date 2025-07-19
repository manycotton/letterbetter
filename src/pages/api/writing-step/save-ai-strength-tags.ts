import { NextApiRequest, NextApiResponse } from 'next';
import { saveAIStrengthTagsData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, strengthTagsByReflection } = req.body;

    if (!sessionId || !strengthTagsByReflection) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, strengthTagsByReflection' 
      });
    }

    const aiStrengthTagsData = await saveAIStrengthTagsData(sessionId, strengthTagsByReflection);

    res.status(200).json({ 
      message: 'AI strength tags data saved successfully',
      aiStrengthTagsData
    });

  } catch (error) {
    console.error('Error saving AI strength tags data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}