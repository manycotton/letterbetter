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