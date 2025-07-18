export interface User {
  id: string;
  nickname: string;
  password: string;
  createdAt: string;
}

export interface QuestionAnswers {
  id: string;
  userId: string;
  answers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LetterSession {
  id: string;
  userId: string;
  questionAnswersId?: string;
  highlightedItems: HighlightedItem[];
  strengthItems?: StrengthItem[];
  reflectionItems?: ReflectionItem[];
  currentStep?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HighlightedItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  userExplanation?: string;
  conversationHistory?: QAPair[];
  problemReason?: string;
  emotionInference?: string;
}

export interface StrengthItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  strengthDescription?: string;
  strengthApplication?: string;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

export interface ReflectionItem {
  id: string;
  content: string;
  keywords?: string[];
  selectedTags?: Array<{tag: string, type: 'keyword' | 'factor'}>;
  inspectionStep?: number;
  emotionCheckResult?: EmotionCheckResult;
  blameCheckResult?: BlameCheckResult;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  solutionContent?: string;
  solutionCompleted?: boolean;
}

export interface EmotionCheckResult {
  hasEmotion: boolean;
  suggestion?: string;
  situationSummary?: string;
}

export interface BlameCheckResult {
  hasBlamePattern: boolean;
  warning?: string;
  environmentalFactors?: string[];
}

export interface StrengthAnalysisLog {
  id: string;
  answersId: string;
  userId: string;
  userStrengthsAnalysis: {
    tagBasedStrengths: Array<{
      tag: string;
      content: string;
      source: 'tag_based';
    }>;
    generalStrengthsCategorized: Array<{
      originalContent: string;
      existingCategories: string[];
      newCategories: string[];
      source: 'user_general';
    }>;
  };
  selectedStrengthsForLetter: Array<{
    name: string;
    description?: string;
    userContent?: string;
    source: 'tag_based' | 'existing_category' | 'new_category' | 'random';
  }>;
  createdAt: string;
}

export interface GeneratedLetter {
  id: string;
  answersId: string;
  characterName: string;
  age: number;
  occupation: string;
  letterContent: string[];
  usedStrengths: string[];
  strengthAnalysisLogId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionHints {
  id: string;
  sessionId: string;
  characterName: string;
  highlightedData: HighlightedItem[];
  generatedHints: string[];
  createdAt: string;
  updatedAt: string;
}

// New interfaces for comprehensive logging
export interface WritingStepData {
  id: string;
  sessionId: string;
  stepType: 'understanding' | 'strength_finding';
  highlightedItems: HighlightedItem[];
  userAnswers: {
    itemId: string;
    answer: string;
  }[];
  completedAt: string;
  createdAt: string;
}

export interface ReflectionStepData {
  id: string;
  sessionId: string;
  reflectionItems: ReflectionItem[];
  selectedHintTags: Array<{
    reflectionId: string;
    tags: string[];
  }>;
  allGeneratedHints: string[];
  completedAt: string;
  createdAt: string;
}

export interface InspectionData {
  id: string;
  sessionId: string;
  inspectionResults: {
    reflectionId: string;
    emotionCheck: EmotionCheckResult;
    blameCheck: BlameCheckResult;
  }[];
  completedAt: string;
  createdAt: string;
}

export interface SuggestionData {
  id: string;
  sessionId: string;
  suggestionResults: {
    reflectionId: string;
    warningText?: string;
    environmentalFactors: string[];
  }[];
  allGeneratedFactors: string[];
  completedAt: string;
  createdAt: string;
}

export interface LetterContentData {
  id: string;
  sessionId: string;
  letterContent: string;
  strengthKeywords: string[];
  completedAt: string;
  createdAt: string;
}

// New interfaces for additional logging requirements
export interface SolutionExplorationData {
  id: string;
  sessionId: string;
  solutionsByReflection: {
    reflectionId: string;
    userSolutions: {
      solutionId: string;
      content: string;
      isAiGenerated: boolean;
      selectedTags?: string[];
      strengthTags?: string[];
      solutionCategories?: string[];
      originalAiSolution?: string;
      isModified: boolean;
      createdAt: string;
      updatedAt?: string;
    }[];
  }[];
  completedAt: string;
  createdAt: string;
}

export interface AIStrengthTagsData {
  id: string;
  sessionId: string;
  strengthTagsByReflection: {
    reflectionId: string;
    aiStrengthTags: string[];
    generatedAt: string;
  }[];
  createdAt: string;
}

export interface MagicMixInteractionData {
  id: string;
  sessionId: string;
  interactions: {
    interactionId: string;
    reflectionId: string;
    selectedStrengthTags: string[];
    selectedSolutionCategories: string[];
    generatedSolutions: string[];
    selectedSolutionIndex?: number;
    addedToSolutionField: boolean;
    solutionFieldId?: string;
    finalModifiedContent?: string;
    timestamp: string;
  }[];
  totalMixCount: number;
  totalSolutionsAdded: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseLetterData {
  id: string;
  sessionId: string;
  originalGeneratedLetter: string;
  finalEditedLetter: string;
  characterName: string;
  userNickname: string;
  generatedAt: string;
  finalizedAt: string;
  createdAt: string;
}