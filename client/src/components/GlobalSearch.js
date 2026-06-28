import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const groupConfig = {
  memos: { label: 'Memos', icon: '📨', path: (id) => `/memos/${id}` },
  workflows: { label: 'Workflows', icon: '🔁', path: (id) => `/workflows/${id}` },
  tasks: { label: 'Tasks', icon: '✔', path: (id) => `/tasks/${id}` },
  assets: { label: 'Assets', icon: '🗂', path: (id) => `/assets/${id}` },
  documents: { label: 'Documents', icon: '📄', path: (id) => `/documents/${id}` },
  contracts: { label: 'Contracts', icon: '📑', path: () => `/contracts` },
  tickets: { label: 'Tickets', icon: '🎫', path: (id) => `/tickets/${id}` },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.get('/search', { params: { q: query } })
        .then(r => { setResults(r.data); setOpen(true); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (group, id) => {
    setOpen(false); setQuery('');
    navigate(groupConfig[group].path(id));
  };

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search memos, workflows, tasks, assets, documents..."
          style={styles.input}
        />
        {loading && <span style={styles.loadingDot}>···</span>}
      </div>

      {open && results && (
        <div style={styles.dropdown}>
          {totalResults === 0 && <div style={styles.noResults}>No results for "{query}"</div>}
          {Object.entries(results).map(([group, items]) => {
            if (!items.length) return null;
            const cfg = groupConfig[group];
            return (
              <div key={group} style={styles.group}>
                <div style={styles.groupLabel}>{cfg.icon} {cfg.label}</div>
                {items.map(item => (
                  <div key={item.id} onClick={() => handleSelect(group, item.id)} style={styles.resultRow}>
                    {item.ref && <span style={styles.resultRef}>{item.ref}</span>}
                    <span style={styles.resultTitle}>{item.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: 420 },
  inputWrap: { display: 'flex', alignItems: 'center', background: '#F0F2F5', borderRadius: 8, padding: '0 12px', border: '1px solid transparent' },
  searchIcon: { fontSize: 13, marginRight: 8, opacity: 0.6 },
  input: { border: 'none', background: 'transparent', padding: '8px 0', fontSize: 13, flex: 1, boxShadow: 'none' },
  loadingDot: { color: '#8B949E', fontSize: 14, letterSpacing: 1 },
  dropdown: { position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E6EA', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 440, overflowY: 'auto', zIndex: 200 },
  noResults: { padding: '20px', textAlign: 'center', color: '#8B949E', fontSize: 13 },
  group: { padding: '8px 0', borderBottom: '1px solid #F0F2F5' },
  groupLabel: { fontSize: 11, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 16px' },
  resultRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  resultRef: { fontSize: 11, fontFamily: 'monospace', color: '#006B3C', flexShrink: 0 },
  resultTitle: { color: '#0D1117', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};
