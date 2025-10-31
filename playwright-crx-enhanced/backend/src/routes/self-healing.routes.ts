import { Router } from 'express';
import { HealingSuggestion } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();

// Get all healing suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await prisma.healingSuggestion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    logger.info(`Retrieved ${suggestions.length} healing suggestions`);
    res.json({ data: { suggestions } });
  } catch (error) {
    logger.error('Error fetching healing suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch healing suggestions' });
  }
});

// Approve a suggestion
router.post('/suggestions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.healingSuggestion.update({
      where: { id },
      data: { status: 'approved' }
    });
    
    logger.info(`Approved healing suggestion: ${id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error approving suggestion:', error);
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
});

// Reject a suggestion
router.post('/suggestions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.healingSuggestion.update({
      where: { id },
      data: { status: 'rejected' }
    });
    
    logger.info(`Rejected healing suggestion: ${id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error rejecting suggestion:', error);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

export default router;