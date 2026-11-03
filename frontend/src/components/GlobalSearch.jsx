import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Building2,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { globalSearch } from '../services/api';
import { getDemoGlobalSearch } from '../demo/demoService';

export default function GlobalSearch({
  onSelectAsset,
  onOpenDocument,
  isDemo = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const inputRef = useRef(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (isDemo) {
          const res = await getDemoGlobalSearch(query, 12);
          setResults(res.results || []);
        } else {
          const res = await globalSearch(query, 12);
          setResults(res.results || []);
        }
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isDemo]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    if (item.entity_type === 'asset') {
      if (onSelectAsset) onSelectAsset(item.entity_id);
    } else if (item.entity_type === 'finding') {
      if (onSelectAsset) onSelectAsset(item.asset_id);
    } else if (item.entity_type === 'document') {
      if (onOpenDocument) onOpenDocument(item.entity_id);
    }
  };

  const assetResults = results.filter((r) => r.entity_type === 'asset');
  const findingResults = results.filter((r) => r.entity_type === 'finding');
  const docResults = results.filter((r) => r.entity_type === 'document');

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="w-4 h-4 text-[#647775] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search for a bridge, dam, school, road, or any infrastructure..."
          className="w-full pl-9 pr-14 py-2 rounded-xl border border-[#E1EBE7] bg-[#F4F8F7]/70 hover:bg-[#F4F8F7] focus:bg-white text-xs text-[#142B2A] placeholder-[#647775] focus:outline-none focus:ring-2 focus:ring-[#087F4F] focus:border-transparent transition-all shadow-2xs"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-[#087F4F] animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium font-mono text-[#647775] bg-white border border-[#E1EBE7] rounded-md shadow-2xs">
              ⌘ K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto animate-fadeIn divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Search Results ({results.length})</span>
            <span className="text-green-700 font-semibold lowercase">Press Esc to dismiss</span>
          </div>

          {/* Group 1: Assets */}
          {assetResults.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-green-700" />
                Infrastructure Assets
              </div>
              {assetResults.map((item) => (
                <div
                  key={item.entity_id}
                  onClick={() => handleSelect(item)}
                  className="px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  {item.risk_score !== undefined && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                      Risk {item.risk_score.toFixed(0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Group 2: Findings */}
          {findingResults.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Observed Defects & Findings
              </div>
              {findingResults.map((item) => (
                <div
                  key={item.entity_id}
                  onClick={() => handleSelect(item)}
                  className="px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate">{item.snippet}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Group 3: Documents */}
          {docResults.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-green-700" />
                Evidence Documents
              </div>
              {docResults.map((item) => (
                <div
                  key={item.entity_id}
                  onClick={() => handleSelect(item)}
                  className="px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-800 font-semibold border border-green-200 shrink-0">
                    Inspect
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
