import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('=== SIMPLE COMPLETION TEST ===');
    console.log('Request body:', req.body);

    // Just return success for now
    res.status(200).json({ 
      message: 'Simple completion test successful',
      receivedData: req.body
    });

  } catch (error) {
    console.error('Error in simple completion test:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}