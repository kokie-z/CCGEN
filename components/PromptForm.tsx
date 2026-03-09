import React, { useState, useEffect, useCallback } from 'react';
import type { PromptData, SavedCharacter } from '../types';

interface PromptFormProps {
  promptData: PromptData;
  onFormChange: (newPromptData: Partial<PromptData>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  
  savedBackgrounds: string[];
  onSaveCurrentBackground: () => void;
  onDeleteBackground: (theme: string) => void;

  savedCharacters: SavedCharacter[];
  onSaveCurrentCharacter: () => void;
  onDeleteCharacter: (characterName: string) => void;
}

const MAX_CHARACTERS_IN_SCENE = 5;

const PRESET_ART_STYLES = [
  "Pixar animation", "Classic Disney (2D)", "Ghibli inspired", "Anime (Modern Shonen)", "Anime (Shojo)",
  "Chibi style", "Cartoon Network (90s)", "Looney Tunes style", "Comic Book (Marvel style)",
  "Comic Book (DC style - darker)", "Manga (Black & White)", "Watercolor illustration", "Oil painting",
  "Impressionistic", "Surrealist", "Pop Art", "Art Deco", "Steampunk", "Cyberpunk",
  "Fantasy art (D&D style)", "Pixel art (16-bit)", "Claymation style", "Stop-motion (fabric)",
  "Minimalist line art", "Vector art (Flat design)", "Children's book illustration", "Chalk art",
  "Silhouette", "Ukiyo-e (Japanese woodblock)", "Vintage poster art", "Photorealistic", "Sketch",
  "Cel-shaded", "Storybook illustration"
].sort();


const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const InputField: React.FC<{
  id: keyof PromptData | string; // Allow string for dynamic IDs
  label: string;
  value: string;
  onChange: (id: keyof PromptData | string, value: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
  rows?: number;
  helpText?: string;
  readOnly?: boolean;
  disabled?: boolean;
}> = ({ id, label, value, onChange, placeholder, type = 'text', rows = 3, helpText, readOnly = false, disabled = false }) => (
  <div className="mb-6">
    <label htmlFor={id as string} className="block text-sm font-medium text-sky-300 mb-1">
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        id={id as string}
        name={id as string}
        rows={rows}
        className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        aria-label={label}
      />
    ) : (
      <input
        type="text"
        id={id as string}
        name={id as string}
        className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        aria-label={label}
      />
    )}
    {helpText && <p className="mt-1 text-xs text-slate-400">{helpText}</p>}
  </div>
);

const CharacterHeadshotPreview: React.FC<{ character?: SavedCharacter, uploadedHeadshotDataUrl?: string | null, defaultText?: string }> = ({ character, uploadedHeadshotDataUrl, defaultText }) => {
  const displayUrl = uploadedHeadshotDataUrl || character?.headshotUrl;
  const altText = character ? `${character.name} headshot` : "Character headshot preview placeholder";

  return (
    <div 
      className="p-1 border border-slate-500 rounded-md bg-slate-700 w-32 h-32 flex items-center justify-center text-center" 
      aria-label={altText}
    >
      {displayUrl ? (
        <img 
          src={displayUrl} 
          alt={altText} 
          className="w-full h-full object-contain rounded" 
        />
      ) : character && !character.headshotUrl && !uploadedHeadshotDataUrl ? (
         <div className="text-xs text-slate-400 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Headshot for "{character.name}" missing. Re-save character or upload image.
        </div>
      ) : (
        <div className="text-xs text-slate-400 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          {defaultText || "Select a character to view their headshot."}
        </div>
      )
    }
    </div>
  );
};


export const PromptForm: React.FC<PromptFormProps> = ({ 
  promptData, 
  onFormChange, 
  onSubmit, 
  isLoading,
  savedBackgrounds,
  onSaveCurrentBackground,
  onDeleteBackground,
  savedCharacters,
  onSaveCurrentCharacter,
  onDeleteCharacter
}) => {
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(promptData.uploadedHeadshotDataUrl || null);
  const [backgroundEnhancerPreview, setBackgroundEnhancerPreview] = useState<string | null>(promptData.uploadedBackgroundEnhancerDataUrl || null);

  useEffect(() => {
    setHeadshotPreview(promptData.uploadedHeadshotDataUrl || null);
  }, [promptData.uploadedHeadshotDataUrl]);

  useEffect(() => {
    setBackgroundEnhancerPreview(promptData.uploadedBackgroundEnhancerDataUrl || null);
  }, [promptData.uploadedBackgroundEnhancerDataUrl]);

  const handleFileChange = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'headshot' | 'backgroundEnhancer'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await fileToDataUrl(file);
        if (type === 'headshot') {
          setHeadshotPreview(dataUrl);
          onFormChange({ uploadedHeadshotDataUrl: dataUrl });
        } else {
          setBackgroundEnhancerPreview(dataUrl);
          onFormChange({ uploadedBackgroundEnhancerDataUrl: dataUrl });
        }
      } catch (error) {
        console.error("Error converting file to data URL:", error);
        // Optionally set an error notification
      }
    }
    // Clear input value to allow re-uploading the same file after clearing
    event.target.value = ''; 
  }, [onFormChange]);

  const clearUploadedImage = useCallback((type: 'headshot' | 'backgroundEnhancer') => {
    if (type === 'headshot') {
      setHeadshotPreview(null);
      onFormChange({ uploadedHeadshotDataUrl: null });
    } else {
      setBackgroundEnhancerPreview(null);
      onFormChange({ uploadedBackgroundEnhancerDataUrl: null });
    }
  }, [onFormChange]);


  const handleChange = (id: keyof PromptData | string, value: string) => {
    onFormChange({ [id as keyof PromptData]: value });
  };

  const handleSceneCharacterSlotChange = (slotIndex: number, characterName: string) => {
    const newSlots = [...promptData.sceneCharacterSlots];
    newSlots[slotIndex] = characterName;
    
    if (slotIndex === 0) { // Main character slot also updates main fields
      if (characterName) {
        const charToLoad = savedCharacters.find(char => char.name === characterName);
        if (charToLoad) {
          onFormChange({ characterName: charToLoad.name, characterDescription: charToLoad.description, sceneCharacterSlots: newSlots, uploadedHeadshotDataUrl: null }); // Clear uploaded headshot if loading saved
          setHeadshotPreview(null);
        }
      } else {
        // Cleared main slot, clear main fields
        onFormChange({ characterName: '', characterDescription: '', sceneCharacterSlots: newSlots, uploadedHeadshotDataUrl: null });
        setHeadshotPreview(null);
      }
    } else {
        onFormChange({ sceneCharacterSlots: newSlots });
    }
  };
  
  const currentBgTheme = promptData.backgroundTheme.trim();
  const isCurrentBgSaved = savedBackgrounds.includes(currentBgTheme);
  const canSaveCurrentBg = currentBgTheme && !isCurrentBgSaved;

  const currentCharacterNameForSave = promptData.characterName.trim(); 
  const currentCharacterDescForSave = promptData.characterDescription.trim();
  const existingSavedCharacterForSave = savedCharacters.find(char => char.name === currentCharacterNameForSave);
  const canSaveCurrentCharacter = currentCharacterNameForSave && currentCharacterDescForSave;
  
  let saveCharButtonText = "Save Character & Generate Headshot";
  if (promptData.uploadedHeadshotDataUrl) {
    saveCharButtonText = existingSavedCharacterForSave ? "Update Character with Uploaded Image" : "Save Character with Uploaded Image";
  } else if (existingSavedCharacterForSave) {
    saveCharButtonText = "Update Character & Re-generate Headshot";
  }
  
  const [selectedArtStylePreset, setSelectedArtStylePreset] = useState<string>("");

  useEffect(() => {
    if (PRESET_ART_STYLES.includes(promptData.artStyle)) {
      setSelectedArtStylePreset(promptData.artStyle);
    } else if (promptData.artStyle.trim() === "") {
      setSelectedArtStylePreset("");
    } else {
      setSelectedArtStylePreset("custom");
    }
  }, [promptData.artStyle]);

  const handleArtStylePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedArtStylePreset(value);
    if (value && value !== "custom") {
      onFormChange({ artStyle: value });
    } else if (value === "") {
      onFormChange({ artStyle: "" });
    }
  };

  const mainCharacterSlotName = promptData.sceneCharacterSlots[0];
  const characterToPreviewInMainSlot = mainCharacterSlotName 
    ? savedCharacters.find(char => char.name === mainCharacterSlotName) 
    : (promptData.characterName ? savedCharacters.find(char => char.name === promptData.characterName) : undefined);
  
  const isSubmitDisabled = isLoading || 
    (promptData.numberOfCharactersInScene > 0 && !promptData.sceneCharacterSlots[0] && !promptData.characterName.trim()) || 
    Array.from({ length: promptData.numberOfCharactersInScene -1 }).some((_,idx) => !promptData.sceneCharacterSlots[idx+1]);


  return (
    <form onSubmit={(e) => { e.preventDefault(); if(!isSubmitDisabled) onSubmit(); }} className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-400 border-b border-slate-700 pb-2 mb-6">Describe Your Vision</h2>

      <div className="mb-6">
        <label htmlFor="numberOfCharactersInScene" className="block text-sm font-medium text-sky-300 mb-1">
          Number of Characters in Scene
        </label>
        <select
          id="numberOfCharactersInScene"
          value={promptData.numberOfCharactersInScene}
          onChange={(e) => onFormChange({ numberOfCharactersInScene: parseInt(e.target.value, 10) })}
          disabled={isLoading}
          className="block w-full sm:w-1/2 bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
          aria-label="Select number of characters in the scene"
        >
          {Array.from({ length: MAX_CHARACTERS_IN_SCENE }, (_, i) => i + 1).map(num => (
            <option key={num} value={num}>{num} Character{num > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2 p-4 border border-slate-600 rounded-lg bg-slate-700/30">
        <h3 className="text-lg font-medium text-sky-300 mb-3">Character 1 Details</h3>
        <InputField
          id="characterName"
          label="Character 1: Name/ID"
          value={promptData.characterName}
          onChange={handleChange}
          placeholder="e.g., Captain Astra, Zorp the Alien"
          helpText="Unique name for saving or custom name for Character 1."
          disabled={isLoading}
        />

        <InputField
          id="characterDescription"
          label="Character 1: Core Description"
          value={promptData.characterDescription}
          onChange={handleChange}
          placeholder="e.g., Tall robot with glowing blue eyes..."
          type="textarea"
          rows={4}
          helpText="Detailed features for Character 1. Used for main image and headshot generation if saved."
          disabled={isLoading}
        />

        <div className="mb-4">
            <label htmlFor="characterHeadshotUpload" className="block text-sm font-medium text-sky-300 mb-1">
                Upload Headshot Image (Optional)
            </label>
            <input
                type="file"
                id="characterHeadshotUpload"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'headshot')}
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700 disabled:opacity-50"
                disabled={isLoading}
                aria-label="Upload headshot image for character 1"
            />
            {headshotPreview && (
                <div className="mt-2 flex items-center gap-2">
                    <img src={headshotPreview} alt="Headshot preview" className="h-16 w-16 object-cover rounded border border-slate-500" />
                    <button 
                        type="button" 
                        onClick={() => clearUploadedImage('headshot')}
                        className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded"
                        aria-label="Clear uploaded headshot"
                    >
                        Clear
                    </button>
                </div>
            )}
            <p className="mt-1 text-xs text-slate-400">If uploaded, this image will be used as the headshot. Otherwise, one will be generated upon saving.</p>
        </div>


        <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
          <button
            type="button"
            onClick={onSaveCurrentCharacter} 
            disabled={isLoading || !canSaveCurrentCharacter}
            className="w-full sm:w-auto flex-grow items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={saveCharButtonText}
          >
            {saveCharButtonText}
          </button>
          {existingSavedCharacterForSave && promptData.characterDescription.trim() === existingSavedCharacterForSave.description && !promptData.uploadedHeadshotDataUrl && (
             <span className="text-xs text-emerald-400 block sm:inline sm:ml-2 p-1 bg-emerald-900/50 rounded">Desc. matches saved</span>
           )}
        </div>

        {savedCharacters.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <label htmlFor="mainCharacterSelect" className="block text-sm font-medium text-sky-300 mb-1">
                     Load Saved Character into Slot 1
                    </label>
                    <select
                        id="mainCharacterSelect"
                        value={promptData.sceneCharacterSlots[0] || ""}
                        onChange={(e) => handleSceneCharacterSlotChange(0, e.target.value)}
                        disabled={isLoading}
                        className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
                        aria-label="Select a saved character for Character 1 slot"
                    >
                        <option value="">-- Use fields above or select to load --</option>
                        {savedCharacters.map(char => (
                        <option key={char.name} value={char.name}>
                            {char.name}
                        </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={() => {
                      const charNameToDelete = promptData.sceneCharacterSlots[0] || (existingSavedCharacterForSave ? currentCharacterNameForSave : "");
                      if (charNameToDelete) {
                          onDeleteCharacter(charNameToDelete); 
                      }
                    }}
                    disabled={isLoading || (!promptData.sceneCharacterSlots[0] && !existingSavedCharacterForSave)}
                    className="px-3 py-2 h-fit border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Delete character currently in Character 1 fields/slot from saved characters"
                >
                    Delete
                </button>
            </div>
            <div className="mt-3 flex justify-center sm:justify-start" aria-live="polite">
             <CharacterHeadshotPreview 
                character={characterToPreviewInMainSlot} 
                uploadedHeadshotDataUrl={promptData.uploadedHeadshotDataUrl}
                defaultText="Character 1: Preview (select or fill fields)" 
              />
            </div>
          </div>
        )}
      </div>

      {Array.from({ length: promptData.numberOfCharactersInScene - 1 }).map((_, index) => {
        const slotIndex = index + 1; 
        const selectedCharNameInSlot = promptData.sceneCharacterSlots[slotIndex];
        const characterToPreviewInSlot = selectedCharNameInSlot 
            ? savedCharacters.find(char => char.name === selectedCharNameInSlot)
            : undefined;

        return (
            <div key={`char-slot-${slotIndex}`} className="space-y-2 p-4 border border-slate-600 rounded-lg bg-slate-700/30">
                <h3 className="text-lg font-medium text-sky-300 mb-3">Additional Character {slotIndex + 1}</h3>
                {savedCharacters.length > 0 ? (
                    <>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <label htmlFor={`characterSelectSlot${slotIndex}`} className="block text-sm font-medium text-sky-300 mb-1">
                                    Load Saved Character into Slot {slotIndex + 1}
                                </label>
                                <select
                                    id={`characterSelectSlot${slotIndex}`}
                                    value={selectedCharNameInSlot || ""}
                                    onChange={(e) => handleSceneCharacterSlotChange(slotIndex, e.target.value)}
                                    disabled={isLoading}
                                    className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
                                    aria-label={`Select a saved character for slot ${slotIndex + 1}`}
                                >
                                    <option value="">-- Select Character {slotIndex + 1} --</option>
                                    {savedCharacters.map(char => (
                                        <option key={char.name} value={char.name} disabled={promptData.sceneCharacterSlots.includes(char.name) && promptData.sceneCharacterSlots[slotIndex] !== char.name}>
                                            {char.name} {promptData.sceneCharacterSlots.includes(char.name) && promptData.sceneCharacterSlots[slotIndex] !== char.name ? '(selected elsewhere)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedCharNameInSlot && (
                                <button
                                    type="button"
                                    onClick={() => handleSceneCharacterSlotChange(slotIndex, "")}
                                    disabled={isLoading}
                                    className="px-3 py-2 h-fit border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-600 disabled:opacity-50 transition-colors"
                                    aria-label={`Clear character from slot ${slotIndex + 1}`}
                                >
                                    Clear Slot
                                </button>
                            )}
                        </div>
                        <div className="mt-3 flex justify-center sm:justify-start" aria-live="polite">
                            <CharacterHeadshotPreview character={characterToPreviewInSlot} defaultText={`Character ${slotIndex + 1}: Preview`} />
                        </div>
                    </>
                ) : (
                    <p className="text-slate-400 text-sm">No saved characters available to select. Please save some characters first.</p>
                )}
            </div>
        );
      })}


      <div className="space-y-2 p-4 border border-slate-600 rounded-lg bg-slate-700/30">
        <h3 className="text-lg font-medium text-sky-300 mb-3">Art Style</h3>
        <div className="mb-3">
          <label htmlFor="artStylePresetSelect" className="block text-sm font-medium text-sky-300 mb-1">
            Select a Preset Art Style (Optional)
          </label>
          <select
            id="artStylePresetSelect"
            value={selectedArtStylePreset}
            onChange={handleArtStylePresetChange}
            disabled={isLoading}
            className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
            aria-label="Select a preset art style"
          >
            <option value="">-- Select a preset --</option>
            {PRESET_ART_STYLES.map(style => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
            <option value="custom">-- Custom (type below) --</option>
          </select>
        </div>
        <InputField
          id="artStyle"
          label="Custom Art Style / Details"
          value={promptData.artStyle}
          onChange={(id, val) => {
            handleChange(id as keyof PromptData, val);
            if (!PRESET_ART_STYLES.includes(val) && val.trim() !== "") {
              setSelectedArtStylePreset("custom");
            } else if (PRESET_ART_STYLES.includes(val)) {
              setSelectedArtStylePreset(val);
            } else {
              setSelectedArtStylePreset("");
            }
          }}
          placeholder="e.g., Pixar, Anime, Watercolor. Used for main image & headshots."
          helpText="Define visual style or use preset. Your text here overrides preset if different."
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2 p-4 border border-slate-600 rounded-lg bg-slate-700/30">
         <h3 className="text-lg font-medium text-sky-300 mb-3">Background Details</h3>
        <InputField
          id="backgroundTheme"
          label="Background Theme/Setting (Text Description)"
          value={promptData.backgroundTheme}
          onChange={handleChange}
          placeholder="e.g., Mystical forest, Futuristic cityscape, Cozy library"
          type="textarea"
          rows={3}
          helpText="Describe the environment. This text will be used for generation. You can enhance it with an uploaded image below."
          disabled={isLoading}
        />

        <div className="mb-4">
            <label htmlFor="backgroundEnhancerUpload" className="block text-sm font-medium text-sky-300 mb-1">
                Upload Background Reference Image (Optional)
            </label>
            <input
                type="file"
                id="backgroundEnhancerUpload"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'backgroundEnhancer')}
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700 disabled:opacity-50"
                disabled={isLoading}
                aria-label="Upload background reference image"
            />
            {backgroundEnhancerPreview && (
                <div className="mt-2 flex items-center gap-2">
                    <img src={backgroundEnhancerPreview} alt="Background reference preview" className="h-24 w-auto object-contain rounded border border-slate-500" />
                    <button 
                        type="button" 
                        onClick={() => clearUploadedImage('backgroundEnhancer')}
                        className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded self-start"
                        aria-label="Clear uploaded background reference"
                    >
                        Clear
                    </button>
                </div>
            )}
            <p className="mt-1 text-xs text-slate-400">If uploaded, AI will describe this image and combine it with your text description above to guide background generation.</p>
        </div>


        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <button
            type="button"
            onClick={onSaveCurrentBackground}
            disabled={isLoading || !canSaveCurrentBg}
            className="w-full sm:w-auto flex-grow items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Save current background theme text"
          >
            Save Current Background Text
          </button>
           {isCurrentBgSaved && (
             <span className="text-xs text-emerald-400 block sm:inline sm:ml-2 p-1 bg-emerald-900/50 rounded">Text Saved!</span>
           )}
        </div>
        
        {savedBackgrounds.length > 0 && (
          <div className="mt-4 space-y-2">
            <label htmlFor="savedBackgroundSelect" className="block text-sm font-medium text-sky-300 mb-1">
              Load a Saved Background Text
            </label>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <select
                id="savedBackgroundSelect"
                value={isCurrentBgSaved ? currentBgTheme : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    onFormChange({ backgroundTheme: e.target.value });
                  }
                }}
                disabled={isLoading}
                className="block w-full flex-grow bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 placeholder-slate-400 disabled:opacity-50"
                aria-label="Select a saved background theme text"
              >
                <option value="">-- Select a saved background text --</option>
                {savedBackgrounds.map(bg => (
                  <option key={bg} value={bg}>
                    {bg.length > 60 ? bg.substring(0, 57) + "..." : bg}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if(isCurrentBgSaved) onDeleteBackground(currentBgTheme);
                }}
                disabled={isLoading || !isCurrentBgSaved}
                className="w-full sm:w-auto px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Delete current background theme text from saved"
              >
                Delete Current Text
              </button>
            </div>
          </div>
        )}
      </div>
      
      <InputField
        id="sceneDescription"
        label="Specific Scene / Action"
        value={promptData.sceneDescription}
        onChange={handleChange}
        placeholder="e.g., reading a book by the fireplace, flying through space"
        type="textarea"
        rows={3}
        helpText="What are the characters doing? Describe their interaction and specific elements in this scene."
        disabled={isLoading}
      />

      <div>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label={isSubmitDisabled ? "Cannot generate: please complete character selections" : "Generate image with selected characters"}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Generate Image'
          )}
        </button>
        {isSubmitDisabled && !isLoading && (
            <p className="text-xs text-amber-400 mt-2 text-center">
                Please ensure Character 1 has a name (from fields or loaded) and all additional character slots are filled.
            </p>
        )}
      </div>
    </form>
  );
};