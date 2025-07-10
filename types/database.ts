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