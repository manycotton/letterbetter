export interface UserStrength {
  generalStrength: string;
  keywordBasedStrength: Array<{
    keyword: string;
    content: string;
  }>;
}

export interface UserChallenge {
  context: string;
  challenge: string;
}

export interface User {
  userId: string;
  nickname: string;
  password: string;
  userIntroduction: string;
  userStrength: UserStrength;
  userChallenge: UserChallenge;
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
  highlightedItems: HighlightedItem[];
  strengthItems?: StrengthItem[];
  reflectionItems?: ReflectionItem[];
  currentStep?: number;
  createdAt: string;
  updatedAt: string;
}

// 새로운 UnderstandingSession 인터페이스
export interface UnderstandingSession {
  understandingSessionId: string;
  letterId: string;
  highlightedItems: CleanHighlightedItem[];
  createdAt: string;
  updatedAt: string;
}

// Reflection Support Hints 인터페이스
export interface ReflectionSupportHints {
  id: string;
  userId: string;
  keywords: string[][]; // 2차원 배열: 각 새로고침마다 별도 배열로 저장
  createdAt: string;
}

// 새로운 StrengthFindingSession 인터페이스
export interface StrengthFindingSession {
  strengthFindingSessionId: string;
  letterId: string;
  highlightedItems: CleanStrengthItem[];
  createdAt: string;
  updatedAt: string;
}

// 정리된 HighlightedItem (고민 이해하기용)
export interface CleanHighlightedItem {
  id: string;
  color: string;
  highlightedText: string;
  problemReason?: string;
  userExplanation?: string;
  emotionInference?: string;
  completedAt?: string;
}

// 정리된 StrengthItem (강점 찾기용)
export interface CleanStrengthItem {
  id: string;
  color: string;
  highlightedText: string;
  strengthDescription?: string;
  strengthApplication?: string;
  completedAt?: string;
}

// Legacy HighlightedItem - 기존 코드 호환성을 위해 유지
export interface HighlightedItem {
  id: string;
  text: string;
  color: string;
  originalText?: string;  // Made optional as we're phasing this out
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
  originalText?: string;  // Made optional as we're phasing this out
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
  sessionId: string;
  content: string;
  selectedHints?: string[];
  selectedFactors?: string[];
  inspectionStep?: number;
  emotionCheckResult?: EmotionCheckResult;
  blameCheckResult?: BlameCheckResult;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  solutionIds?: string[];
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

export interface Letter {
  letterId: string;
  userId: string;
  characterName: string;
  age: number;
  occupation: string;
  letterContent: string[];
  usedStrengths: string[];
  createdAt: string;
  understandingSessionId: string;
  strengthFindingSessionId: string;
  reflectionSessionId: string;
  solutionSessionId: string;
}

// Legacy interface - 기존 코드 호환성을 위해 유지
export interface GeneratedLetter {
  id: string;
  userId: string;
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
    answers: {
      question: string;
      answer: string;
    }[];
    timestamp: string;
  }[];
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