
import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { X, Hash } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[]; // List of all tags used in app for autocomplete
  direction?: 'up' | 'down';
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, existingTags, direction = 'down' }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const lowerInput = inputValue.toLowerCase().replace('#', '');
    const filtered = existingTags
      .filter(t => t.toLowerCase().includes(lowerInput) && !tags.includes(t))
      .slice(0, 5);
    setSuggestions(filtered);
  }, [inputValue, existingTags, tags]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, ''); // Remove # if user typed it
    if (cleanTag && !tags.includes(cleanTag)) {
      onChange([...tags, cleanTag]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Tagi (opcjonalne)</label>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-slate-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all relative">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium">
            #{tag}
            <button 
              type="button" 
              onClick={() => removeTag(tag)}
              className="hover:text-indigo-900 dark:hover:text-indigo-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        
        <div className="relative flex-1 min-w-[100px]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "np. wakacje, remont (Enter)" : ""}
            className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pr-6"
          />
          
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
            >
              <X size={14} />
            </button>
          )}
          
          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <div className={`absolute left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-1'}`}>
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700 last:border-0"
                >
                  #{suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
