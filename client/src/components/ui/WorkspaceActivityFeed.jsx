import { useState, useEffect } from 'react';
import {
  getWorkspaceActivities,
  subscribeToWorkspaceActivity,
  getUserDisplayLabel,
  setUserDisplayName,
} from '../../services/workspaceCollabStore';
import { getWorkspaceId, getClientId } from '../../services/historyStore';
import { useToast } from './Toast';

export default function WorkspaceActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const toast = useToast();

  const workspaceId = getWorkspaceId();
  const myClientId = getClientId();
  const isShared = workspaceId && workspaceId !== myClientId && !workspaceId.startsWith('user_');

  useEffect(() => {
    if (!isShared) {
      setActivities([]);
      return;
    }

    setActivities(getWorkspaceActivities(workspaceId));

    const unsubscribe = subscribeToWorkspaceActivity(workspaceId, (newActivity) => {
      setActivities((prev) => [newActivity, ...prev].slice(0, 40));

      // If action was performed by another team member, show a live collaboration toast!
      if (newActivity.userId !== myClientId) {
        toast.gold(
          `${newActivity.userLabel} in Workspace`,
          newActivity.details || 'Updated invoice details.'
        );
      }
    });

    return () => unsubscribe();
  }, [workspaceId, isShared, myClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveName = (e) => {
    e.preventDefault();
    setUserDisplayName(nameInput);
    setIsNameModalOpen(false);
    toast.info('Display Name Updated', `Your team will now see you as "${getUserDisplayLabel(myClientId)}".`);
  };

  // If private session, do not render collaborative feed
  if (!isShared) return null;

  return (
    <>
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-semibold text-primary transition-all shadow-xs"
          title="View Live Workspace Team Activity Feed"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="material-symbols-outlined text-[15px]">group</span>
          <span>Live Workspace Feed</span>
          {activities.length > 0 && (
            <span className="ml-0.5 bg-primary text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {activities.length}
            </span>
          )}
        </button>

        {/* Dropdown Live Activity Feed */}
        {isOpen && (
          <div className="absolute right-0 top-10 w-80 max-w-[90vw] bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                <span className="font-semibold text-xs text-on-surface">
                  Workspace: <span className="text-primary font-bold">{workspaceId}</span>
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-on-surface-variant">
                You: <strong className="text-on-surface">{getUserDisplayLabel(myClientId)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setNameInput(getUserDisplayLabel(myClientId));
                  setIsNameModalOpen(true);
                }}
                className="text-primary hover:underline font-semibold text-[11px]"
              >
                Change Name
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {activities.length === 0 ? (
                <div className="text-center py-6 text-xs text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-[24px] opacity-40 mb-1 block">
                    sync_saved_locally
                  </span>
                  No recent team actions yet. Adding items or sections will be visible to your team in real-time!
                </div>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className={`p-2.5 rounded-xl text-xs border ${
                      act.userId === myClientId
                        ? 'bg-surface-container-low/40 border-outline-variant/20'
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-primary">
                          {act.userId === myClientId ? 'person' : 'account_circle'}
                        </span>
                        {act.userLabel} {act.userId === myClientId && <span className="opacity-60 font-normal">(You)</span>}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/70">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed text-[11px]">{act.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Set User Display Name Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#041627]/60 backdrop-blur-md"
            onClick={() => setIsNameModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-6 z-10">
            <h3 className="font-headline-md text-[16px] text-on-surface font-semibold mb-2">
              Your Team Display Name
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Enter your name so other team members in workspace <strong className="text-primary">{workspaceId}</strong> know who added line items and changes.
            </p>

            <form onSubmit={handleSaveName} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="e.g. Ruth, Elvis, Lead Decorator"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
