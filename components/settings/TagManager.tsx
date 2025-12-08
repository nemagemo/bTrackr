
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Hash, Tag } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

interface TagManagerProps {
  allTags: string[];
  onRenameTag?: (oldName: string, newName: string) => void;
  onDeleteTag?: (tagName: string) => void;
  onAddTag?: (tagName: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ allTags, onRenameTag, onDeleteTag, onAddTag }) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagEditValue, setTagEditValue] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);

  const handleStartEditTag = (tag: string) => {
     setEditingTag(tag);
     setTagEditValue(tag);
  };
  
  const handleSaveTag = () => {
     if (editingTag && tagEditValue.trim() && tagEditValue !== editingTag) {
        if (onRenameTag) onRenameTag(editingTag, tagEditValue.trim());
     }
     setEditingTag(null);
  };

  const handleAddTag = () => {
     if (newTagName.trim() && onAddTag) {
        onAddTag(newTagName.trim().replace(/^#/, ''));
        setNewTagName('');
        setIsAddingTag(false);
     }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 w-full transition-colors">
       <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          Zarządzanie Tagami <span className="text-sm font-normal text-slate-400">({allTags.length})</span>
       </h2>
       
       {allTags.length === 0 && !isAddingTag ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl mb-4">
             <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-3">
                <Tag size={24} className="opacity-40" />
             </div>
             <p className="text-sm">Brak zdefiniowanych tagów.</p>
          </div>
       ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             {allTags.map(tag => (
                <div key={tag} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group bg-white dark:bg-slate-800">
                   {editingTag === tag ? (
                       <div className="flex items-center gap-2 flex-1">
                          <span className="text-slate-400">#</span>
                          <div className="relative flex-1 min-w-0">
                            <input 
                               type="text" 
                               value={tagEditValue} 
                               onChange={(e) => setTagEditValue(e.target.value)}
                               className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none pr-6"
                               autoFocus
                            />
                            {tagEditValue && (
                              <button onClick={() => setTagEditValue('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"><X size={12} /></button>
                            )}
                          </div>
                          <button onClick={handleSaveTag} className="text-green-600 dark:text-green-400 p-1 bg-green-50 dark:bg-green-900/30 rounded hover:bg-green-100 dark:hover:bg-green-900/50"><Check size={16}/></button>
                          <button onClick={() => setEditingTag(null)} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={16}/></button>
                       </div>
                   ) : (
                       <>
                          <div className="flex items-center gap-2 truncate">
                             <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded text-sm font-medium truncate">#{tag}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleStartEditTag(tag)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="Zmień nazwę">
                                <Edit2 size={14} />
                             </button>
                             <button onClick={() => setConfirmDeleteTag(tag)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Usuń tag">
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </>
                   )}
                </div>
             ))}
          </div>
       )}

       {/* Add New Tag Button */}
       {isAddingTag ? (
          <div className="border border-pink-200 dark:border-pink-800 rounded-xl p-3 bg-pink-50 dark:bg-pink-900/20 flex items-center gap-2 h-[58px]">
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg text-pink-500 dark:text-pink-400">
               <Hash size={16} />
            </div>
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nowy tag (np. wakacje)"
                className="w-full border border-pink-200 dark:border-pink-800 rounded px-2 py-1 text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-6"
                autoFocus
                onKeyDown={(e) => {
                   if(e.key === 'Enter') handleAddTag();
                   if(e.key === 'Escape') setIsAddingTag(false);
                }}
              />
              {newTagName && (
                <button onClick={() => setNewTagName('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"><X size={12} /></button>
              )}
            </div>
            <button onClick={handleAddTag} className="text-pink-600 dark:text-pink-400 p-1 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-pink-100 dark:hover:bg-pink-900/50"><Check size={16}/></button>
            <button onClick={() => setIsAddingTag(false)} className="text-slate-400 p-1 hover:text-slate-600 dark:hover:text-slate-300"><X size={16}/></button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingTag(true)}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all font-medium text-sm gap-2 h-[58px] w-full"
          >
            <Plus size={16} /> Dodaj nowy tag
          </button>
        )}

        <ConfirmModal 
            isOpen={!!confirmDeleteTag}
            title="Usuń Tag"
            message={`Czy na pewno chcesz usunąć tag #${confirmDeleteTag} ze wszystkich transakcji?`}
            onConfirm={() => { if(onDeleteTag && confirmDeleteTag) onDeleteTag(confirmDeleteTag); setConfirmDeleteTag(null); }}
            onClose={() => setConfirmDeleteTag(null)}
        />
    </div>
  );
};
