const express = require('express');
const router = express.Router();
const {
  getWorkspaceFiles,
  getWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  createWorkspaceFile,
  deleteWorkspaceFile,
  updateWorkspacePresence,
  getWorkspacePresence,
  getLiveWorkspaceDraft,
  updateLiveWorkspaceDraft,
  logWorkspaceActivity,
  getWorkspaceActivities,
} = require('../services/workspaceService');

// GET /api/workspace/:workspaceId/files - List all files in workspace
router.get('/:workspaceId/files', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const files = await getWorkspaceFiles(workspaceId);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/:workspaceId/files - Create a new file in workspace
router.post('/:workspaceId/files', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { initialDraft, lastEditedBy, name } = req.body || {};
    const created = await createWorkspaceFile(workspaceId, initialDraft, lastEditedBy, name);
    res.json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workspace/:workspaceId/files/:fileId/draft - Get draft for specific file
router.get('/:workspaceId/files/:fileId/draft', async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const draftEntry = await getWorkspaceFileDraft(workspaceId, fileId);
    res.json({ success: true, data: draftEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/:workspaceId/files/:fileId/draft - Save draft for specific file
router.post('/:workspaceId/files/:fileId/draft', async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const { draft, lastEditedBy, name } = req.body || {};
    if (!draft) {
      return res.status(400).json({ success: false, error: 'Draft data required' });
    }
    const updated = await updateWorkspaceFileDraft(workspaceId, fileId, draft, lastEditedBy, name);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/workspace/:workspaceId/files/:fileId - Delete a file from workspace
router.delete('/:workspaceId/files/:fileId', async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const deleted = await deleteWorkspaceFile(workspaceId, fileId);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/:workspaceId/presence - Heartbeat user active file
router.post('/:workspaceId/presence', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, userLabel, fileId } = req.body || {};
    const presence = updateWorkspacePresence(workspaceId, userId, userLabel, fileId);
    res.json({ success: true, presence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workspace/:workspaceId/presence - Get live user presence for files
router.get('/:workspaceId/presence', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const active = getWorkspacePresence(workspaceId);
    res.json({ success: true, active });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy backward-compatibility endpoints:
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
    const { draft, lastEditedBy } = req.body || {};
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
