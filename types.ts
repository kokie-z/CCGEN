export interface PromptData {
  // For Character 1 / Main character editor
  characterName: string;
  characterDescription: string;
  uploadedHeadshotDataUrl?: string | null; // For new headshot upload

  artStyle: string;
  backgroundTheme: string;
  uploadedBackgroundEnhancerDataUrl?: string | null; // For background image upload
  sceneDescription: string; // Will describe interactions of ALL characters

  numberOfCharactersInScene: number; // Total characters for the image (1 to N, default 1)

  // Stores the NAMES of SAVED characters for slots.
  // Array length will be `numberOfCharactersInScene`.
  // Index 0 is for Character 1 (can be "" if using characterName/Desc fields directly, or a name if loaded)
  // Index 1 to N-1 are for Additional Characters (must be a name from saved characters if numberOfCharactersInScene > 1)
  sceneCharacterSlots: string[];
}

export interface NotificationMessage {
  message: string | null;
  type: 'success' | 'error' | 'info';
}

export interface SavedCharacter {
  name: string;
  description: string;
  headshotUrl?: string; // Added for character headshot preview
}

export interface SceneFrame {
  id: string; // Unique ID for the frame, e.g., timestamp or UUID
  imageUrl: string;
  narrative: string;
  promptData: PromptData; // Store the prompt used to generate this image
  createdAt: number;
}

export interface Scene {
  id: string; // Unique ID for the scene, e.g., timestamp or UUID
  name: string; // User-defined name, must be unique
  frames: SceneFrame[];
  createdAt: number;
  updatedAt: number;
}