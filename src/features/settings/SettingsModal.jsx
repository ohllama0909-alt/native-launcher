import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import AppearancePanel from './AppearancePanel.jsx';
import StoragePanel from './StoragePanel.jsx';
import ChangelogPanel from './ChangelogPanel.jsx';
import { SUPPORTED_LOCALES } from '../../i18n/catalogs.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './SettingsModal.css';

const TABS = [
  { id: 'launcher', key: 'settings.launcher', icon: 'settings-02' },
  { id: 'minecraft', key: 'settings.minecraft', icon: 'play' },
  { id: 'appearance', key: 'settings.appearance', icon: 'paint-pour' },
  { id: 'java', key: 'settings.java', icon: 'terminal' },
  { id: 'storage', key: 'settings.storage', icon: 'database' },
  { id: 'changelog', key: 'settings.changelog', icon: 'clock-rewind' }
];

const PREFS_KEY = 'native.preferences';

const DEFAULT_PREFS = {
  discordRpc: true,
  closeOnLaunch: false,
  keepLogs: true,
  fullscreen: false,
  ram: 4,
  javaPath: '',
  javaArgs: ''
};

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)',
  tr: 'Türkçe'
};

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function SettingsModal({
  open,
  onClose,
  instances = [],
  onOpenUpdater
}) {
  const { locale, setLocale, t } = useI18n();
  const [activeTab, setActiveTab] = useState('launcher');
  const [prefs, setPrefs] = useState(readPrefs);
  const [dataDir, setDataDir] = useState('');
  const [updates, setUpdates] = useState({ checkOnStartup: true, backgroundChecks: true, autoDownload: false });

  useEffect(() => {
    if (window.native?.settings?.dataDir) {
      window.native.settings.dataDir().then(setDataDir).catch(() => {});
    }
  }, []);

  // Load the persisted auto-update preferences whenever the modal opens, so the
  // toggles reflect exactly what the updater reads live (settings store `updates`).
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stored = window.native?.settings?.load
          ? await window.native.settings.load()
          : JSON.parse(localStorage.getItem('native.settings') || '{}');
        const u = stored?.updates ?? {};
        if (!cancelled) {
          setUpdates({
            checkOnStartup: u.checkOnStartup !== false,
            backgroundChecks: u.backgroundChecks !== false,
            autoDownload: u.autoDownload === true
          });
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const updatePref = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const handleOpenDataDir = () => {
    if (window.native?.settings?.openDataDir) window.native.settings.openDataDir();
  };

  const changeLanguage = async (nextLocale) => {
    setLocale(nextLocale);
    if (window.native?.settings) {
      const current = await window.native.settings.load();
      await window.native.settings.save({
        ...current,
        onboarding: { ...(current?.onboarding ?? {}), language: nextLocale }
      });
    } else {
      const current = JSON.parse(localStorage.getItem('native.settings') || '{}');
      localStorage.setItem('native.settings', JSON.stringify({
        ...current,
        onboarding: { ...(current.onboarding ?? {}), language: nextLocale }
      }));
    }
  };

  // Persist one auto-update preference. Mirrors changeLanguage's load-spread-save
  // so the updater (which reads settings.updates live) picks it up without a restart.
  const changeUpdateSetting = async (patch) => {
    setUpdates((prev) => ({ ...prev, ...patch }));
    try {
      if (window.native?.settings) {
        const current = await window.native.settings.load();
        await window.native.settings.save({
          ...current,
          updates: { ...(current?.updates ?? {}), ...patch }
        });
      } else {
        const current = JSON.parse(localStorage.getItem('native.settings') || '{}');
        localStorage.setItem('native.settings', JSON.stringify({
          ...current,
          updates: { ...(current.updates ?? {}), ...patch }
        }));
      }
    } catch {
      /* ignore persistence failures */
    }
  };

  if (!open) return null;

  const wide = activeTab === 'storage' || activeTab === 'changelog';

  return (
    <div
      className="settings-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={'settings-shell-container ' + (wide ? 'is-wide' : '')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-title">{t('common.settings')}</span>
          </div>

          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={16} />
              <span>{t(tab.key)}</span>
            </button>
          ))}
        </aside>

        <main className="settings-content-area">
          <div className="settings-content-header">
            <h2 className="settings-pane-title">{t(TABS.find((tab) => tab.id === activeTab)?.key)}</h2>
            <button className="icon-ctrl-btn" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="settings-scroll-body">
            {activeTab === 'launcher' && (
              <>
                <div className="settings-section">
                  <h4 className="settings-section-heading">{t('settings.language')}</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.interfaceLanguage')}</span>
                      <span className="settings-row-desc">{t('settings.interfaceLanguageDesc')}</span>
                    </div>
                    <Dropdown
                      className="settings-language-dropdown"
                      value={locale}
                      options={SUPPORTED_LOCALES.map((code) => ({
                        value: code,
                        label: LANGUAGE_NAMES[code] || code
                      }))}
                      onChange={(next) => changeLanguage(next)}
                    />
                  </div>
                </div>
                <div className="settings-section">
                  <h4 className="settings-section-heading">{t('settings.behavior')}</h4>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.discordPresence')}</span>
                      <span className="settings-row-desc">{t('settings.discordDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.discordRpc}
                        onChange={(event) => updatePref({ discordRpc: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.closeOnLaunch')}</span>
                      <span className="settings-row-desc">{t('settings.closeOnLaunchDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.closeOnLaunch}
                        onChange={(event) => updatePref({ closeOnLaunch: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.keepLogs')}</span>
                      <span className="settings-row-desc">{t('settings.keepLogsDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.keepLogs}
                        onChange={(event) => updatePref({ keepLogs: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">{t('settings.dataFolder')}</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.dataLocation')}</span>
                      <span className="settings-row-desc">{dataDir || t('settings.defaultData')}</span>
                    </div>
                    <button className="sub-btn" onClick={handleOpenDataDir}>
                      <Icon name="folder" size={14} />
                      <span>{t('instances.openFolder')}</span>
                    </button>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">{t('settings.updates')}</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Noctra Client</span>
                      <span className="settings-row-desc">v{window.native?.version || '1.0.0'}</span>
                    </div>
                    <button className="sub-btn brand-btn" onClick={onOpenUpdater}>
                      <Icon name="refresh" size={14} />
                      <span>{t('settings.checkUpdates')}</span>
                    </button>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.checkOnStartup')}</span>
                      <span className="settings-row-desc">{t('settings.checkOnStartupDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={updates.checkOnStartup}
                        onChange={(event) => changeUpdateSetting({ checkOnStartup: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.backgroundChecks')}</span>
                      <span className="settings-row-desc">{t('settings.backgroundChecksDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={updates.backgroundChecks}
                        onChange={(event) => changeUpdateSetting({ backgroundChecks: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">{t('settings.autoDownload')}</span>
                      <span className="settings-row-desc">{t('settings.autoDownloadDesc')}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={updates.autoDownload}
                        onChange={(event) => changeUpdateSetting({ autoDownload: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'minecraft' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">{t('settings.gameSettings')}</h4>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">{t('settings.fullscreen')}</span>
                    <span className="settings-row-desc">{t('settings.fullscreenDesc')}</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={prefs.fullscreen}
                      onChange={(event) => updatePref({ fullscreen: event.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">{t('settings.defaultMemory')}</span>
                    <span className="settings-row-desc">{t('settings.defaultMemoryDesc')}</span>
                  </div>
                  <div className="ram-slider-control">
                    <input
                      type="range"
                      min="2"
                      max="16"
                      step="1"
                      value={prefs.ram}
                      onChange={(event) => updatePref({ ram: Number(event.target.value) })}
                      className="range-input"
                    />
                    <span className="ram-badge">{prefs.ram} GB</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && <AppearancePanel />}

            {activeTab === 'java' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">{t('settings.javaRuntime')}</h4>

                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">{t('settings.javaExecutable')}</span>
                    <span className="settings-row-desc">{t('settings.javaExecutableDesc')}</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    placeholder={t('settings.javaAuto')}
                    value={prefs.javaPath}
                    onChange={(event) => updatePref({ javaPath: event.target.value })}
                  />
                </div>

                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">{t('settings.jvmArgs')}</span>
                    <span className="settings-row-desc">{t('settings.jvmArgsDesc')}</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    placeholder="-XX:+UseG1GC"
                    value={prefs.javaArgs}
                    onChange={(event) => updatePref({ javaArgs: event.target.value })}
                  />
                </div>
              </div>
            )}

            {activeTab === 'storage' && <StoragePanel instances={instances} />}

            {activeTab === 'changelog' && <ChangelogPanel onOpenUpdater={onOpenUpdater} />}
          </div>
        </main>
      </div>
    </div>
  );
}
