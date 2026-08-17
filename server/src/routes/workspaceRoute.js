const express = require('express');
const router = express.Router();
const {
  getLiveWorkspaceDraft,
  updateLiveWorkspaceDraft,
  logWorkspaceActivity,
  getWorkspaceActivities,
} = require('../services/workspaceService');

// GET /api/workspace/:workspaceId/draft
router.get('/:workspaceId/draft', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const draftEntry = await getLiveWorkspaceDraft(workspaceId);
    res.json({ success: true, data: draftEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/:workspaceId/draft
router.post('/:workspaceId/draft', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { draft, lastEditedBy } = req.body;
    if (!draft) {
      return res.status(400).json({ success: false, error: 'Draft data required' });
    }
    const updated = await updateLiveWorkspaceDraft(workspaceId, draft, lastEditedBy);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workspace/:workspaceId/activity
router.get('/:workspaceId/activity', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const activities = getWorkspaceActivities(workspaceId);
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/:workspaceId/activity
router.post('/:workspaceId/activity', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const logged = logWorkspaceActivity(workspaceId, req.body);
    res.json({ success: true, data: logged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
