import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function LogsTab({ cluster }) {
  const { locale, t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const logContainerRef = useRef(null);

  useEffect(() => {
    // Fetch initial log if available
    if (window.native?.instance?.getLogFile && cluster?.id) {
      window.native.instance.getLogFile(cluster.id).then((content) => {
        if (content) {
          const lines = content.split('\n').filter(Boolean);
          setLogs(lines.map((text, i) => ({ id: i, text, time: '' })));
        }
      });
    }

    // Subscribe to live log streaming from launcher
    const offLog = window.native?.launcher?.onLog?.((line) => {
      setLogs((prev) => [...prev.slice(-3000), { id: Date.now() + Math.random(), text: line, time: new Date().toLocaleTimeString(locale) }]);
    });

    return () => {
      if (offLog) offLog();
    };
  }, [cluster?.id, locale]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter
    ? logs.filter((l) => l.text.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const handleCopy = () => {
    const text = logs.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleUploadMclogs = async () => {
    if (logs.length === 0) return;
    setUploading(true);
    try {
      const text = logs.map((l) => l.text).join('\n');
      const response = await fetch('https://api.mclo.gs/1/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ content: text })
      });
      const data = await response.json();
      if (data.url) {
        setUploadedUrl(data.url);
        navigator.clipboard.writeText(data.url);
      }
    } catch (e) {
      console.error('Failed to upload log to mclo.gs:', e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cluster-tab-pane logs-tab">
      <div className="tab-pane-toolbar">
        <div className="tab-search-box">
          <Icon name="search-md" size={14} />
          <input
            type="text"
            placeholder={t('logs.filter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>{t('logs.autoScroll')}</span>
          </label>

          <button className="sub-btn" onClick={handleCopy}>
            <Icon name="code-snippet-02" size={14} />
            <span>{copied ? t('logs.copied') : t('logs.copy')}</span>
          </button>

          <button className="sub-btn" onClick={handleClear}>
            <Icon name="trash-01" size={14} />
            <span>{t('common.clear')}</span>
          </button>

          <button
            className="sub-btn brand-btn"
            onClick={handleUploadMclogs}
            disabled={uploading || logs.length === 0}
          >
            <Icon name="link-external" size={14} />
            <span>{uploading ? t('logs.uploading') : uploadedUrl ? t('logs.linkCopied') : t('logs.upload')}</span>
          </button>
        </div>
      </div>

      <div className="log-viewer-box" ref={logContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="log-empty-note">
            {logs.length === 0
              ? t('logs.empty')
              : t('logs.noMatch')}
          </div>
        ) : (
          filteredLogs.map((l) => (
            <div key={l.id} className="log-line">
              <span className="log-text">{l.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
