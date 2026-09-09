import { useEffect, useRef, useState } from 'react';
import Shell from './features/shell/Shell.jsx';
import UpdateCenter from './features/updater/UpdateCenter.jsx';
import useUpdater from './features/updater/useUpdater.js';

const GUEST = { id: 'guest', name: 'Guest', uuid: null, type: 'guest', isMicrosoft: false };

export default function App() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const autoShownVersion = useRef(null);
  const updater = useUpdater();

  const activeAccount = accounts.find(a => a.id === activeId) ?? null;
  const account = activeAccount
    ? { ...activeAccount, isMicrosoft: activeAccount.type === 'microsoft' }
    : GUEST;

  useEffect(() => {
    window.native?.onMaximizedChange(setIsMaximized);
    // Apply saved theme immediately on startup
    window.native?.settings?.load().then((s) => {
      const theme = s?.appearance?.theme ?? 'redstone';
      if (theme !== 'redstone') document.documentElement.dataset.theme = theme;
    });
    // Load saved accounts on startup
    window.native?.accounts?.list().then((res) => {
      if (res?.accounts?.length) {
        setAccounts(res.accounts);
        setActiveId(res.activeId);
      }
    });
  }, []);

  useEffect(() => {
    const { type, version } = updater.status;
    if (type === 'available' && version && autoShownVersion.current !== version) {
      autoShownVersion.current = version;
      setUpdateOpen(true);
    }
    if (type === 'downloaded') setUpdateOpen(true);
  }, [updater.status]);

  const refreshAccounts = async () => {
    const res = await window.native?.accounts?.list();
    if (res) {
      setAccounts(res.accounts ?? []);
      setActiveId(res.activeId ?? null);
    }
  };

  const handleAddMicrosoft = async () => {
    const res = await window.native?.accounts?.addMicrosoft();
    if (res?.ok) await refreshAccounts();
    return res;
  };

  const handleAddOffline = async (name) => {
    const res = await window.native?.accounts?.addOffline(name);
    if (res?.ok) {
      setAccounts(prev => [...prev, res.account]);
      if (!activeId) setActiveId(res.account.id);
    }
    return res;
  };

  const handleSwitchAccount = async (id) => {
    await window.native?.accounts?.setActive(id);
    setActiveId(id);
  };

  const handleRemoveAccount = async (id) => {
    await window.native?.accounts?.remove(id);
    await refreshAccounts();
  };

  return (
    <div className={`window-frame${isMaximized ? ' maximized' : ''}`}>
      <UpdateCenter
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        status={updater.status}
        onCheck={updater.check}
        onDownload={updater.download}
        onCancel={updater.cancel}
        onInstall={updater.install}
      />
      <Shell
        isMaximized={isMaximized}
        account={account}
        accounts={accounts}
        activeId={activeId}
        onAddMicrosoft={handleAddMicrosoft}
        onAddOffline={handleAddOffline}
        onSwitchAccount={handleSwitchAccount}
        onRemoveAccount={handleRemoveAccount}
        updateStatus={updater.status}
        onOpenUpdater={() => setUpdateOpen(true)}
      />
    </div>
  );
}
