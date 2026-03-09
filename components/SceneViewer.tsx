import React, { useState, useCallback, useEffect } from 'react';
import { Scene, SceneFrame } from '../types';

interface SceneViewerProps {
  scene: Scene;
  onUpdateNarrative: (sceneId: string, frameId: string, newNarrative: string) => void;
  onRemoveFrame: (sceneId: string, frameId: string) => void;
  onMoveFrame: (sceneId: string, frameId: string, direction: 'up' | 'down') => void;
  isLoading: boolean;
}

const FrameNarrativeInput: React.FC<{
  sceneId: string;
  frameId: string;
  initialNarrative: string;
  onUpdateNarrative: (sceneId: string, frameId: string, newNarrative: string) => void;
  disabled: boolean;
}> = ({ sceneId, frameId, initialNarrative, onUpdateNarrative, disabled }) => {
  const [narrative, setNarrative] = useState(initialNarrative);

  useEffect(() => {
    setNarrative(initialNarrative);
  }, [initialNarrative]);

  const handleBlur = () => {
    if (narrative !== initialNarrative) {
      onUpdateNarrative(sceneId, frameId, narrative);
    }
  };
  
  // Optional: Add a debounce if you prefer saving while typing
  // For simplicity, saving on blur is implemented here.

  return (
    <textarea
      value={narrative}
      onChange={(e) => setNarrative(e.target.value)}
      onBlur={handleBlur}
      placeholder="Enter narrative for this image..."
      rows={4}
      className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
      disabled={disabled}
      aria-label={`Narrative for frame ${frameId}`}
    />
  );
};


export const SceneViewer: React.FC<SceneViewerProps> = ({
  scene,
  onUpdateNarrative,
  onRemoveFrame,
  onMoveFrame,
  isLoading,
}) => {
  if (!scene || !scene.frames) {
    return <p className="text-slate-400 text-center mt-4">No frames in this scene yet, or scene data is unavailable.</p>;
  }

  if (scene.frames.length === 0) {
    return <p className="text-slate-400 text-center mt-4">This scene is empty. Add some generated images to build your story!</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <h3 className="text-lg font-semibold text-sky-300 border-b border-slate-700 pb-2">
        Frames in Scene: <span className="text-sky-400">{scene.name}</span>
      </h3>
      {scene.frames.map((frame, index) => (
        <div key={frame.id} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-600 rounded-lg bg-slate-700/50 shadow-md" aria-labelledby={`frame-heading-${frame.id}`}>
          <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
            <img 
              src={frame.imageUrl} 
              alt={`Scene frame ${index + 1}`} 
              className="rounded-md object-contain w-full aspect-square bg-slate-600" 
            />
             <p id={`frame-heading-${frame.id}`} className="text-xs text-slate-400 mt-1 text-center">Frame {index + 1}</p>
          </div>
          <div className="flex-grow space-y-3">
            <FrameNarrativeInput
              sceneId={scene.id}
              frameId={frame.id}
              initialNarrative={frame.narrative}
              onUpdateNarrative={onUpdateNarrative}
              disabled={isLoading}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => onMoveFrame(scene.id, frame.id, 'up')}
                disabled={index === 0 || isLoading}
                className="px-3 py-1.5 text-sm bg-sky-700 hover:bg-sky-800 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Move frame up"
              >
                Move Up
              </button>
              <button
                onClick={() => onMoveFrame(scene.id, frame.id, 'down')}
                disabled={index === scene.frames.length - 1 || isLoading}
                className="px-3 py-1.5 text-sm bg-sky-700 hover:bg-sky-800 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Move frame down"
              >
                Move Down
              </button>
              <button
                onClick={() => onRemoveFrame(scene.id, frame.id)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove frame from scene"
              >
                Remove from Scene
              </button>
               {/* Mini prompt display - could be expanded */}
              <details className="text-xs text-slate-400 flex-grow text-right">
                  <summary className="cursor-pointer hover:text-sky-300">View Prompt Details</summary>
                  <div className="mt-1 p-2 bg-slate-600 rounded max-h-32 overflow-y-auto text-left">
                      <p><strong>Art Style:</strong> {frame.promptData.artStyle}</p>
                      <p><strong>Background:</strong> {frame.promptData.backgroundTheme}</p>
                      <p><strong>Scene Desc:</strong> {frame.promptData.sceneDescription}</p>
                       <p><strong>Characters:</strong> 
                        {frame.promptData.numberOfCharactersInScene > 0 && !frame.promptData.sceneCharacterSlots[0] && frame.promptData.characterName ? ` Main: ${frame.promptData.characterName}` : ''}
                        {frame.promptData.sceneCharacterSlots.map((slot, idx) => slot ? ` Slot${idx+1}: ${slot}` : '').join('') || (frame.promptData.numberOfCharactersInScene === 0 ? 'None specified' : '')}
                      </p>
                  </div>
              </details>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
