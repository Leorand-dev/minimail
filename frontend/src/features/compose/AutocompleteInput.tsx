import React, { useState, useRef, useEffect, useCallback } from 'react';
import { autocompleteContacts } from '@/api/contacts';
import type { Contact } from '@/api/contacts';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function AutocompleteInput({ value, onChange, placeholder, label, inputRef }: Props) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取当前正在输入的词 (最后一个逗号后的内容)
  const currentQuery = value.split(',').pop()?.trim() || '';

  // 自动完成搜索 (300ms 防抖)
  const doSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const results = await autocompleteContacts(query, 8);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(currentQuery), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentQuery, doSearch]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectContact = (contact: Contact) => {
    const parts = value.split(',');
    parts[parts.length - 1] = ` ${contact.display_name || contact.email} <${contact.email}>`;
    onChange(parts.join(','));
    setShowDropdown(false);
    inputRef?.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectContact(suggestions[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center border-b border-gray-200">
        <label className="w-16 flex-shrink-0 px-3 text-xs font-medium text-gray-500">{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className="flex-1 px-2 py-2.5 text-sm border-0 outline-none"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 left-16 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((contact, index) => (
            <div
              key={contact.id}
              onClick={() => selectContact(contact)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm ${
                index === activeIndex ? 'bg-[#e8f4fd] text-[#066da5]' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[#066da5] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(contact.display_name || contact.email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {contact.display_name || '(未命名)'}
                </div>
                <div className="text-xs text-gray-400 truncate">{contact.email}</div>
              </div>
              {contact.organization && (
                <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:inline">
                  {contact.organization}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
