import React, { useState, KeyboardEvent, useEffect } from 'react';
import { X, Hash } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[]; // List of all tags used in app for autocomplete
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, existingTags }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-500">Tagi (opcjonalne)</label>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-slate-900 focus-within:bg-white transition-all">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
            #{tag}
            <button 
              type="button" 
              onClick={() => removeTag(tag)}
              className="hover:text-indigo-900"
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
            className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
          />
          
          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-slate-700"
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