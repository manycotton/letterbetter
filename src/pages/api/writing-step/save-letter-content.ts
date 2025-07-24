import { NextApiRequest, NextApiResponse } from 'next';
import { saveLetterContentData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, letterContent, strengthKeywords } = req.body;

    if (!sessionId || !letterContent) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, letterContent' 
      });
    }

    const letterContentData = await saveLetterContentData(sessionId, letterContent, strengthKeywords || []);

    res.status(200).json({ 
      message: 'Letter content data saved successfully',
      letterContentData
    });

  } catch (error) {
    console.error('Error saving letter content data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}