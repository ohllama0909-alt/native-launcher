import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import './CreateInstanceModal.css';

const POPULAR_VERSIONS = [
  '26.2', '26.1.2', '1.21.11', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'
];

const LOADERS = ['Fabric', 'Forge', 'NeoForge', 'Vanilla', 'Quilt'];

export default function CreateInstanceModal({
  open,
  onClose,
  onCreate
}) {
  const [version, setVersion] = useState('1.21.1');
  const [loader, setLoader] = useState('Fabric');
  const [name, setName] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const instName = name.trim() || `${version} ${loader}`;
    onCreate({
      version,
      mc_version: version,
      loader,
      mc_loader: loader,
      name: instName,
      description: `Minecraft ${version} running with ${loader}.`
    });
    setName('');
    onClose();
  };

  return (
    <div className="instance-modal-backdrop" onClick={onClose}>
      <div className="instance-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="instance-modal-header">
          <h2 className="instance-modal-title">New Minecraft Version</h2>
          <button className="icon-ctrl-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="instance-modal-body">
            <div className="form-field">
              <label className="form-label">Instance Name (Optional)</label>
              <input
                type="text"
                className="text-input"
                placeholder={`${version} ${loader}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Minecraft Version</label>
              <select
                className="form-select"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              >
                {POPULAR_VERSIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Mod Loader</label>
              <select
                className="form-select"
                value={loader}
                onChange={(e) => setLoader(e.target.value)}
              >
                {LOADERS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="instance-modal-footer">
            <button type="button" className="sub-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sub-btn brand-btn">
              Create Version
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
