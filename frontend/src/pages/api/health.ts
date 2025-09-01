import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple health check for frontend
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'document-extraction-frontend'
  });
}

