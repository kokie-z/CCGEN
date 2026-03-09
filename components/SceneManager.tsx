import React, { useState, useCallback } from 'react';
import { Scene } from '../types';

interface SceneManagerProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSetActiveScene: (sceneId: string | null) => void;
  onCreateScene: (name: string) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
  onDeleteScene: (sceneId: string) => void;
  isLoading: boolean;
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  scenes,
  activeSceneId,
  onSetActiveScene,
  onCreateScene,
  onRenameScene,
  onDeleteScene,
  isLoading,
}) => {
  const [newSceneName, setNewSceneName] = useState('');
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreateScene = useCallback(() => {
    if (newSceneName.trim()) {
      onCreateScene(newSceneName.trim());
      setNewSceneName('');
    }
  }, [newSceneName, onCreateScene]);

  const startRename = useCallback((sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      setRenamingSceneId(sceneId);
      setRenameValue(scene.name);
    }
  }, [scenes]);

  const confirmRename = useCallback(() => {
    if (renamingSceneId && renameValue.trim()) {
      onRenameScene(renamingSceneId, renameValue.trim());
    }
    setRenamingSceneId(null);
    setRenameValue('');
  }, [renamingSceneId, renameValue, onRenameScene]);

  const activeSceneExists = activeSceneId && scenes.some(s => s.id === activeSceneId);

  return (
    <div className="mb-6 p-4 border border-slate-700 rounded-lg bg-slate-700/30">
      <h2 className="text-xl font-semibold text-sky-400 mb-4">Manage Scenes</h2>
      
      {/* Create Scene */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newSceneName}
          onChange={(e) => setNewSceneName(e.target.value)}
          placeholder="New scene name..."
          className="flex-grow bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
          disabled={isLoading}
          aria-label="New scene name"
        />
        <button
          onClick={handleCreateScene}
          disabled={!newSceneName.trim() || isLoading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Create new scene"
        >
          Create Scene
        </button>
      </div>

      {/* Scene Selection and Actions */}
      {scenes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-grow">
            <label htmlFor="sceneSelect" className="block text-sm font-medium text-sky-300 mb-1">
              Active Scene
            </label>
            <select
              id="sceneSelect"
              value={activeSceneId || ''}
              onChange={(e) => onSetActiveScene(e.target.value || null)}
              className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 disabled:opacity-50"
              disabled={isLoading}
              aria-label="Select active scene"
            >
              <option value="">-- Select a Scene --</option>
              {scenes.map(scene => (
                <option key={scene.id} value={scene.id}>{scene.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => activeSceneId && startRename(activeSceneId)}
            disabled={!activeSceneExists || isLoading}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Rename active scene"
          >
            Rename Active
          </button>
          <button
            onClick={() => activeSceneId && onDeleteScene(activeSceneId)}
            disabled={!activeSceneExists || isLoading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Delete active scene"
          >
            Delete Active
          </button>
        </div>
      )}

      {/* Rename Modal (simple version) */}
      {renamingSceneId && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="rename-dialog-title">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 w-full max-w-md">
            <h3 id="rename-dialog-title" className="text-lg font-medium text-sky-300 mb-4">Rename Scene</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400"
              aria-label="New name for scene"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingSceneId(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md shadow-md transition-colors"
                aria-label="Cancel rename"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                disabled={!renameValue.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-md disabled:opacity-50 transition-colors"
                aria-label="Confirm rename"
              >
                Confirm Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
