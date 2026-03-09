import React, { useState, useCallback, useEffect } from 'react';
import { PromptForm } from './components/PromptForm';
import { ImageDisplay } from './components/ImageDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { Notification } from './components/Notification';
import { SceneManager } from './components/SceneManager';
import { SceneViewer } from './components/SceneViewer';
import { generateImageWithGemini, describeImageWithGemini } from './services/geminiService';
import { PromptData, NotificationMessage, SavedCharacter, Scene, SceneFrame } from './types';

const App: React.FC = () => {
  const [promptData, setPromptData] = useState<PromptData>({
    characterName: 'Sparky the Dog',
    characterDescription: 'A small, fluffy golden retriever puppy with big, curious eyes and a perpetually wagging tail. Wears a red collar.',
    uploadedHeadshotDataUrl: null,
    artStyle: 'Pixar animation style, vibrant colors, soft lighting',
    backgroundTheme: 'A sunny park with green grass and tall trees',
    uploadedBackgroundEnhancerDataUrl: null,
    sceneDescription: 'happily chasing a butterfly',
    numberOfCharactersInScene: 1,
    sceneCharacterSlots: [""],
  });
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Generating your image, please wait...');
  const [error, setError] = useState<string | null>(null);
  
  const [savedBackgrounds, setSavedBackgrounds] = useState<string[]>([]);
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([]);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedBackgrounds = localStorage.getItem('savedCharacterArtBackgrounds');
      if (storedBackgrounds) setSavedBackgrounds(JSON.parse(storedBackgrounds));
      
      const storedCharacters = localStorage.getItem('savedCharacterArtCharacters');
      if (storedCharacters) setSavedCharacters(JSON.parse(storedCharacters));

      const storedScenes = localStorage.getItem('characterArtScenes');
      if (storedScenes) {
        const parsedScenes = JSON.parse(storedScenes) as Scene[];
        setScenes(parsedScenes);
        const storedActiveSceneId = localStorage.getItem('characterArtActiveSceneId');
        if (storedActiveSceneId && parsedScenes.some(s => s.id === storedActiveSceneId)) {
          setActiveSceneId(storedActiveSceneId);
        } else if (parsedScenes.length > 0) {
           setActiveSceneId(null);
        }
      }
    } catch (e) {
      console.error("Failed to load saved data from localStorage:", e);
      setNotification({ message: "Could not load some saved data.", type: 'error' });
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('savedCharacterArtBackgrounds', JSON.stringify(savedBackgrounds)); }
    catch (e) { console.error("Failed to save backgrounds to localStorage:", e); }
  }, [savedBackgrounds]);

  useEffect(() => {
    try { localStorage.setItem('savedCharacterArtCharacters', JSON.stringify(savedCharacters)); }
    catch (e) { console.error("Failed to save characters to localStorage:", e); }
  }, [savedCharacters]);

  useEffect(() => {
    try { localStorage.setItem('characterArtScenes', JSON.stringify(scenes));}
    catch (e) { console.error("Failed to save scenes to localStorage:", e); }
  }, [scenes]);

  useEffect(() => {
    try {
      if (activeSceneId) localStorage.setItem('characterArtActiveSceneId', activeSceneId);
      else localStorage.removeItem('characterArtActiveSceneId');
    } catch (e) { console.error("Failed to save active scene ID to localStorage:", e); }
  }, [activeSceneId]);


  const handleFormChange = useCallback((newPromptData: Partial<PromptData>) => {
    setPromptData(prev => {
      const updatedData = { ...prev, ...newPromptData };
      if (newPromptData.numberOfCharactersInScene !== undefined && newPromptData.numberOfCharactersInScene !== prev.numberOfCharactersInScene) {
        const newNum = newPromptData.numberOfCharactersInScene;
        const currentSlots = updatedData.sceneCharacterSlots || [];
        const newSlots = Array(newNum).fill("").map((_, idx) => currentSlots[idx] || "");
        updatedData.sceneCharacterSlots = newSlots;
      }
      return updatedData;
    });
  }, []);

  const handleSaveCurrentBackground = useCallback(() => {
    const themeToSave = promptData.backgroundTheme.trim();
    if (themeToSave && !savedBackgrounds.includes(themeToSave)) {
      setSavedBackgrounds(prev => [...prev, themeToSave].sort());
      setNotification({ message: 'Background text saved!', type: 'success' });
    } else if (savedBackgrounds.includes(themeToSave)) {
      setNotification({ message: 'This background text is already saved.', type: 'info' });
    } else {
       setNotification({ message: 'Background theme text is empty, cannot save.', type: 'error' });
    }
  }, [promptData.backgroundTheme, savedBackgrounds]);

  const handleDeleteBackground = useCallback((themeToDelete: string) => {
    setSavedBackgrounds(prev => prev.filter(bg => bg !== themeToDelete));
    setNotification({ message: 'Background text deleted!', type: 'success' });
  }, []);

  const handleSaveCurrentCharacter = useCallback(async () => {
    const nameToSave = promptData.characterName.trim();
    const descToSave = promptData.characterDescription.trim();
    const artStyleForHeadshot = promptData.artStyle.trim();
    const uploadedHeadshot = promptData.uploadedHeadshotDataUrl;

    if (!nameToSave || !descToSave) {
      setNotification({ message: 'Character name and description cannot be empty.', type: 'error'});
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(uploadedHeadshot ? `Saving "${nameToSave}" with uploaded image...` : `Saving "${nameToSave}" and generating headshot...`);
    setNotification({ message: loadingMessage, type: 'info' });

    let headshotUrl: string | undefined = uploadedHeadshot || savedCharacters.find(char => char.name === nameToSave)?.headshotUrl;
    let headshotGeneratedOrProvidedSuccessfully = !!uploadedHeadshot;

    try {
      if (!uploadedHeadshot) { // Only generate if no image was uploaded
        if (!process.env.API_KEY) throw new Error("API_KEY environment variable is not set.");
        const headshotPrompt = `A clear, centered headshot of character "${nameToSave}" described as "${descToSave}". Art Style: "${artStyleForHeadshot}". Generate a portrait focusing on the character's face and upper shoulders. Use a simple, clean, neutral background.`;
        headshotUrl = await generateImageWithGemini(headshotPrompt);
        headshotGeneratedOrProvidedSuccessfully = true;
      }
    } catch (err) {
      console.error("Headshot generation/provision failed:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error during headshot handling.";
      setNotification({ message: `Character "${nameToSave}" saved. Headshot handling failed: ${errorMsg}`, type: 'error'});
    }

    setSavedCharacters(prev => {
      const existingCharIndex = prev.findIndex(char => char.name === nameToSave);
      const characterData: SavedCharacter = { name: nameToSave, description: descToSave, headshotUrl };
      if (existingCharIndex !== -1) {
        const updatedChars = [...prev];
        updatedChars[existingCharIndex] = characterData;
        return updatedChars.sort((a, b) => a.name.localeCompare(b.name));
      }
      return [...prev, characterData].sort((a, b) => a.name.localeCompare(b.name));
    });

    if (headshotGeneratedOrProvidedSuccessfully) {
       setNotification({ message: `Character "${nameToSave}" ${uploadedHeadshot ? 'saved with uploaded image' : (headshotUrl ? 'updated' : 'saved') +' with new headshot'}!`, type: 'success' });
    }
    // Clear uploaded headshot from form state after saving
    handleFormChange({ uploadedHeadshotDataUrl: null });
    setIsLoading(false);
  }, [promptData, savedCharacters, handleFormChange]);
  
  const handleDeleteCharacter = useCallback((characterNameToDelete: string) => {
    if (!characterNameToDelete) return;
    setSavedCharacters(prevChs => prevChs.filter(char => char.name !== characterNameToDelete));
    setNotification({ message: `Character "${characterNameToDelete}" deleted!`, type: 'success' });
    setPromptData(prevPD => {
        const newSlots = prevPD.sceneCharacterSlots.map(slotName => slotName === characterNameToDelete ? "" : slotName);
        let newCharName = prevPD.characterName;
        let newCharDesc = prevPD.characterDescription;
        if (prevPD.characterName === characterNameToDelete && newSlots[0] === "") {
            newCharName = ''; newCharDesc = '';
        }
        return {...prevPD, sceneCharacterSlots: newSlots, characterName: newCharName, characterDescription: newCharDesc, uploadedHeadshotDataUrl: null };
    });
  }, []);

  const handleSubmit = useCallback(async (currentPromptData: PromptData) => {
    setIsLoading(true); setError(null); setGeneratedImageUrl(null); setNotification(null);
    setLoadingMessage('Preparing prompt...');

    let finalBackgroundTheme = currentPromptData.backgroundTheme;

    if (currentPromptData.uploadedBackgroundEnhancerDataUrl) {
      try {
        setLoadingMessage('Analyzing background image...');
        setNotification({ message: 'Analyzing uploaded background image...', type: 'info' });
        const imageDescription = await describeImageWithGemini(currentPromptData.uploadedBackgroundEnhancerDataUrl);
        setNotification({ message: 'Background image analysis complete!', type: 'success' });
        finalBackgroundTheme = `Based on an uploaded image (described as: "${imageDescription}"). Additional user instructions for background: ${currentPromptData.backgroundTheme || "None"}`;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred during background image analysis.';
        setError(errorMsg); 
        setNotification({ message: `Background Analysis Error: ${errorMsg}. Proceeding with text description only.`, type: 'error'});
        console.error("Background image description error:", err);
        // Proceed with text-only background theme if description fails
      }
    }
    
    setLoadingMessage('Generating image...');
    let charactersPromptPart = "Characters involved:\n";
    const charactersForScene: { name: string; description: string }[] = [];

    for (let i = 0; i < currentPromptData.numberOfCharactersInScene; i++) {
      const slotCharacterName = currentPromptData.sceneCharacterSlots[i];
      let charName = "", charDesc = "";
      if (i === 0 && !slotCharacterName) {
        charName = currentPromptData.characterName.trim(); charDesc = currentPromptData.characterDescription.trim();
        if (!charName) { setError("Character 1 name is missing."); setNotification({ message: "Character 1 name is missing.", type: 'error' }); setIsLoading(false); return; }
      } else if (slotCharacterName) {
        const savedChar = savedCharacters.find(sc => sc.name === slotCharacterName);
        if (savedChar) { charName = savedChar.name; charDesc = savedChar.description; } 
        else { setError(`Saved character "${slotCharacterName}" for slot ${i + 1} not found.`); setNotification({ message: `Details for character in slot ${i+1} ("${slotCharacterName}") could not be loaded.`, type: 'error'}); setIsLoading(false); return; }
      } else { setError(`Character for slot ${i + 1} is not selected.`); setNotification({ message: `Please select a character for slot ${i + 1}.`, type: 'error' }); setIsLoading(false); return; }
      charactersForScene.push({ name: charName, description: charDesc });
      charactersPromptPart += `- Character ${i + 1} (Name: "${charName}"): ${charDesc}\n`;
    }
    if (charactersForScene.length === 0) { setError("No characters defined for the scene."); setNotification({ message: "Please define at least one character.", type: 'error' }); setIsLoading(false); return; }
    
    const characterNamesInScene = charactersForScene.map(c => `"${c.name}"`).join(charactersForScene.length > 2 ? ", " : " and ");
    const fullPrompt = `Image Generation Request:\n${charactersPromptPart}Art Style: ${currentPromptData.artStyle}\nBackground Theme: ${finalBackgroundTheme}\nScene Description: ${currentPromptData.sceneDescription}. The scene features ${characterNamesInScene}.\nInstruction: Generate an image based on the above details. Crucially, maintain consistent character appearances for all listed characters and a consistent "${currentPromptData.artStyle}" art style and background style if these characters/scene were part of a series. Ensure all listed characters are present and interacting or co-existing as described in the scene.`.trim();

    try {
      if (!process.env.API_KEY) throw new Error("API_KEY environment variable is not set.");
      const imageUrl = await generateImageWithGemini(fullPrompt);
      setGeneratedImageUrl(imageUrl);
      setNotification({ message: 'Image generated successfully!', type: 'success' });
      handleFormChange({ uploadedBackgroundEnhancerDataUrl: null }); // Clear after successful use
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred during image generation.';
      setError(errorMsg); setNotification({ message: `Image Generation Error: ${errorMsg}`, type: 'error'});
      console.error("Image generation error:", err);
    } finally { setIsLoading(false); }
  }, [savedCharacters, handleFormChange]);

  const handleCreateScene = useCallback((name: string) => {
    if (!name.trim()) {
      setNotification({ message: "Scene name cannot be empty.", type: 'error' });
      return;
    }
    if (scenes.some(scene => scene.name.toLowerCase() === name.trim().toLowerCase())) {
      setNotification({ message: `Scene name "${name.trim()}" already exists.`, type: 'error' });
      return;
    }
    const newScene: Scene = { id: Date.now().toString(), name: name.trim(), frames: [], createdAt: Date.now(), updatedAt: Date.now() };
    setScenes(prev => [...prev, newScene].sort((a,b) => a.name.localeCompare(b.name)));
    setActiveSceneId(newScene.id);
    setNotification({ message: `Scene "${newScene.name}" created.`, type: 'success' });
  }, [scenes]);

  const handleRenameScene = useCallback((sceneId: string, newName: string) => {
    if (!newName.trim()) {
      setNotification({ message: "New scene name cannot be empty.", type: 'error' });
      return;
    }
    if (scenes.some(scene => scene.id !== sceneId && scene.name.toLowerCase() === newName.trim().toLowerCase())) {
      setNotification({ message: `Scene name "${newName.trim()}" already exists.`, type: 'error' });
      return;
    }
    setScenes(prev => prev.map(scene => scene.id === sceneId ? { ...scene, name: newName.trim(), updatedAt: Date.now() } : scene).sort((a,b) => a.name.localeCompare(b.name)));
    setNotification({ message: `Scene renamed to "${newName.trim()}".`, type: 'success' });
  }, [scenes]);

  const handleDeleteScene = useCallback((sceneId: string) => {
    const sceneToDelete = scenes.find(s => s.id === sceneId);
    if (!sceneToDelete) return;
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Are you sure you want to delete scene "${sceneToDelete.name}" and all its frames? This cannot be undone.`)) {
        setScenes(prev => prev.filter(scene => scene.id !== sceneId));
        if (activeSceneId === sceneId) setActiveSceneId(null);
        setNotification({ message: `Scene "${sceneToDelete.name}" deleted.`, type: 'success' });
    }
  }, [scenes, activeSceneId]);

  const handleAddImageToActiveScene = useCallback(() => {
    if (!activeSceneId) {
      setNotification({ message: "No active scene selected. Please select or create a scene first.", type: 'error' });
      return;
    }
    if (!generatedImageUrl) {
      setNotification({ message: "No image has been generated yet to add.", type: 'error' });
      return;
    }
    const promptDataCopy: PromptData = JSON.parse(JSON.stringify({
      ...promptData, 
      uploadedHeadshotDataUrl: null, // Don't save temporary upload state with frame
      uploadedBackgroundEnhancerDataUrl: null // Don't save temporary upload state with frame
    }));

    const newFrame: SceneFrame = {
      id: Date.now().toString(),
      imageUrl: generatedImageUrl,
      narrative: "",
      promptData: promptDataCopy,
      createdAt: Date.now(),
    };
    setScenes(prevScenes => prevScenes.map(scene => {
      if (scene.id === activeSceneId) {
        return { ...scene, frames: [...scene.frames, newFrame], updatedAt: Date.now() };
      }
      return scene;
    }));
    setNotification({ message: `Image added to scene "${scenes.find(s=>s.id === activeSceneId)?.name}".`, type: 'success' });
  }, [activeSceneId, generatedImageUrl, promptData, scenes]);

  const handleUpdateFrameNarrative = useCallback((sceneId: string, frameId: string, newNarrative: string) => {
    setScenes(prevScenes => prevScenes.map(scene => {
      if (scene.id === sceneId) {
        return {
          ...scene,
          frames: scene.frames.map(frame => frame.id === frameId ? { ...frame, narrative: newNarrative } : frame),
          updatedAt: Date.now(),
        };
      }
      return scene;
    }));
  }, []);

  const handleRemoveFrameFromScene = useCallback((sceneId: string, frameId: string) => {
    setScenes(prevScenes => prevScenes.map(scene => {
      if (scene.id === sceneId) {
        return { ...scene, frames: scene.frames.filter(frame => frame.id !== frameId), updatedAt: Date.now() };
      }
      return scene;
    }));
    setNotification({ message: 'Frame removed from scene.', type: 'success' });
  }, []);

  const handleMoveFrame = useCallback((sceneId: string, frameId: string, direction: 'up' | 'down') => {
    setScenes(prevScenes => prevScenes.map(scene => {
      if (scene.id === sceneId) {
        const frames = [...scene.frames];
        const index = frames.findIndex(frame => frame.id === frameId);
        if (index === -1) return scene;

        if (direction === 'up' && index > 0) {
          [frames[index - 1], frames[index]] = [frames[index], frames[index - 1]];
        } else if (direction === 'down' && index < frames.length - 1) {
          [frames[index + 1], frames[index]] = [frames[index], frames[index + 1]];
        }
        return { ...scene, frames, updatedAt: Date.now() };
      }
      return scene;
    }));
     setNotification({ message: `Frame moved ${direction}.`, type: 'info' });
  }, []);
  
  const activeScene = scenes.find(s => s.id === activeSceneId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
      <header className="w-full max-w-5xl mb-8 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-rose-400 to-lime-400 pb-2">
          CCGEN
        </h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-300 mt-1">
          Consistent Character Image Generator
        </h2>
        <p className="text-slate-400 text-lg mt-3">
          Craft unique artwork for your cartoon series. Define characters, backgrounds, and scenes, then bring them to life. Designed & developed by Kokiez.
        </p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
          <PromptForm
            promptData={promptData}
            onFormChange={handleFormChange}
            onSubmit={() => handleSubmit(promptData)}
            isLoading={isLoading}
            savedBackgrounds={savedBackgrounds}
            onSaveCurrentBackground={handleSaveCurrentBackground}
            onDeleteBackground={handleDeleteBackground}
            savedCharacters={savedCharacters}
            onSaveCurrentCharacter={handleSaveCurrentCharacter}
            onDeleteCharacter={handleDeleteCharacter}
          />
        </section>

        <section className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 flex flex-col justify-start items-center min-h-[400px] lg:min-h-0">
          {isLoading && <LoadingSpinner message={loadingMessage} />}
          {error && !isLoading && <ErrorDisplay message={error} />}
          {!isLoading && !error && generatedImageUrl && (
            <>
              <ImageDisplay imageUrl={generatedImageUrl} altText="Generated Character Image" />
              <button
                onClick={handleAddImageToActiveScene}
                disabled={!activeSceneId || isLoading}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={activeSceneId ? `Add image to scene: ${activeScene?.name}` : "Add image to scene (select or create a scene first)"}
              >
                {activeSceneId ? `Add to Scene: "${activeScene?.name}"` : "Add to Scene (Select Scene First)"}
              </button>
            </>
          )}
          {!isLoading && !error && !generatedImageUrl && (
            <div className="text-center text-slate-500 my-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xl font-semibold">Your masterpiece awaits!</p>
              <p>Fill in the details and click "Generate Image" to see your vision come to life.</p>
            </div>
          )}
        </section>
      </main>

      <section className="w-full max-w-5xl mt-8 bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <SceneManager
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSetActiveScene={setActiveSceneId}
            onCreateScene={handleCreateScene}
            onRenameScene={handleRenameScene}
            onDeleteScene={handleDeleteScene}
            isLoading={isLoading}
        />
        {activeScene && (
            <SceneViewer
                scene={activeScene}
                onUpdateNarrative={handleUpdateFrameNarrative}
                onRemoveFrame={handleRemoveFrameFromScene}
                onMoveFrame={handleMoveFrame}
                isLoading={isLoading}
            />
        )}
        {!activeSceneId && scenes.length > 0 && (
          <p className="text-center text-slate-400 mt-6">Select a scene to view its frames, or create a new one.</p>
        )}
         {!activeSceneId && scenes.length === 0 && (
          <p className="text-center text-slate-400 mt-6">Create your first scene to start building a sequence!</p>
        )}
      </section>

      <footer className="w-full max-w-5xl mt-12 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Image Generator. Powered by Gemini.</p>
         { !process.env.API_KEY && <p className="text-red-400 mt-2 font-semibold">Warning: API_KEY is not configured. Image generation will not work.</p>}
      </footer>
    </div>
  );
};

export default App;