import { NextApiRequest, NextApiResponse } from 'next';
import { saveResponseLetterData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, originalGeneratedLetter, finalEditedLetter, characterName } = req.body;

    if (!sessionId || !originalGeneratedLetter || !finalEditedLetter || !characterName) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, originalGeneratedLetter, finalEditedLetter, characterName' 
      });
    }

    const responseLetterData = await saveResponseLetterData(sessionId, originalGeneratedLetter, finalEditedLetter, characterName);

    res.status(200).json({ 
      message: 'Response letter data saved successfully',
      responseLetterData
    });

  } catch (error) {
    console.error('Error saving response letter data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}