import { NextApiRequest, NextApiResponse } from 'next';
import { saveInspectionData } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, inspectionResults } = req.body;

    if (!sessionId || !inspectionResults) {
      return res.status(400).json({ 
        message: 'Missing required fields: sessionId, inspectionResults' 
      });
    }

    const inspectionData = await saveInspectionData(sessionId, inspectionResults);

    res.status(200).json({ 
      message: 'Inspection data saved successfully',
      inspectionData
    });

  } catch (error) {
    console.error('Error saving inspection data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}