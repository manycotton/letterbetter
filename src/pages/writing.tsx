import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Writing.module.css';

interface Question {
  id: string;
  text: string;
  isSelected: boolean;
  userAnswer?: string;
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
}

interface HighlightedItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  questions?: Question[];
  isLoadingQuestions?: boolean;
  selectedQuestion?: Question;
  userAnswer?: string;
  conversationHistory?: QAPair[];
  editingQAId?: string;
  problemReason?: string; // 왜 고민이라고 생각했는지
  userExplanation?: string;
  emotionInference?: string;
}

interface StrengthItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  strengthDescription?: string;
  strengthApplication?: string;
}

interface AiSuggestion {
  text: string;
  category: string;
  categoryLabel: string;
}

interface ReflectionItem {
  id: string;
  content: string;
  selectedHints?: string[]; // 선택된 힌트 태그들
  selectedFactors?: string[]; // 선택된 환경적 요인 태그들
  keywords?: string[];
  isLoadingKeywords?: boolean;
  inspectionStep?: number; // 0: 미시작, 1: 첫번째완료(감정제안), 2: 두번째완료(비난제안 또는 모든완료), 3: 모든검사완료
  emotionCheckResult?: {
    hasEmotion: boolean;
    suggestion?: string;
    situationSummary?: string;
  };
  blameCheckResult?: {
    hasBlamePattern: boolean;
    warning?: string;
    environmentalFactors?: string[];
    isRegenerating?: boolean;
  };
  blameWarningExpanded?: boolean; // blame warning 펼치기 상태
  isProcessing?: boolean;
  personalReflection?: string;
  aiSuggestions?: AiSuggestion[];
  isLoadingAiSuggestions?: boolean;
  selectedAiSuggestions?: AiSuggestion[];
  solutionContent?: string;
  solutionInputs?: { id: string; content: string; showStrengthHelper?: boolean }[];
  solutionCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

const Writing: React.FC = () => {
  const router = useRouter();
  const { answersId } = router.query;
  const [highlightedItems, setHighlightedItems] = useState<HighlightedItem[]>([]);
  const [letterContent, setLetterContent] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 현재 단계 (1: 이해하기, 2: 강점찾기, 3: 고민 정리하기, 4: 해결책 탐색)
  const [reflectionItems, setReflectionItems] = useState<ReflectionItem[]>([
    { 
      id: Date.now().toString(), 
      content: '', 
      selectedHints: [],
      selectedFactors: [],
      keywords: [], 
      isLoadingKeywords: false, 
      inspectionStep: 0, 
      isProcessing: false,
      personalReflection: '',
      aiSuggestions: [],
      isLoadingAiSuggestions: false,
      selectedAiSuggestions: [],
      solutionInputs: [{ id: Date.now().toString(), content: '', showStrengthHelper: false }]
    }
  ]);
  const [strengthItems, setStrengthItems] = useState<StrengthItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<{[itemId: string]: Array<{tag: string, type: 'keyword' | 'factor'}>}>({});
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // 생성된 편지 데이터
  const [generatedLetter, setGeneratedLetter] = useState<any>(null);
  
  const highlightColors = ['#03ff00']; // 1단계: 이해하기용
  const strengthColor = '#00cdff'; // 2단계: 강점찾기용
  const [colorIndex, setColorIndex] = useState(0);
  const [isUnderstandingCompleted, setIsUnderstandingCompleted] = useState(false);
  const [isStrengthCompleted, setIsStrengthCompleted] = useState(false);
  
  // 고민 정리 힌트 키워드
  const [reflectionHints, setReflectionHints] = useState<string[]>([]);
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  // 기본 편지 내용 (fallback)
  const defaultLetterParagraphs = [
    "안녕하세요. 저는 현재 직장에서 일하고 있는 양양입니다. 저는 ADHD를 가지고 있어요. 요즘 들어 직장에서 업무를 수행하는 데 많은 어려움을 겪고 있어, 조언을 구하고자 이렇게 편지를 쓰게 되었습니다.",
    "업무에 집중하기가 너무 힘듭니다. 작은 소리에도 쉽게 산만해지고, 한 가지 일에 꾸준히 몰두하기가 어렵습니다. 이로 인해 마감 기한을 놓치거나, 실수가 잦아지는 등 업무 효율이 떨어지고 있습니다. 해야 할 일이 많을 때는 어디서부터 시작해야 할지 막막하고, 우선순위를 정하는 것도 버겁게 느껴집니다.",
    "또한, 제 행동으로 인해 동료들에게 피해를 주는 것은 아닐까 하는 걱정이 큽니다. 중요한 회의 내용을 놓치거나, 다른 사람의 말을 도중에 끊는 경우도 종종 있어 난처할 때가 많습니다. 이러한 상황들이 반복되면서 자신감도 떨어지고, 스스로에게 실망하는 날들이 늘어나고 있습니다.",
    "ADHD 증상으로 인해 직장 생활에 어려움을 겪는 것이 저만의 문제는 아니라는 것을 알고 있습니다. 하지만 매일같이 반복되는 이러한 상황들 속에서 어떻게 현명하게 대처해야 할지 막막하기만 합니다."
  ];

  // 생성된 편지가 있으면 사용, 없으면 기본값 사용
  const letterParagraphs = generatedLetter?.letterContent || defaultLetterParagraphs;

  // 캐릭터 이름 추출
  const getCharacterName = () => {
    if (generatedLetter?.characterName) {
      return generatedLetter.characterName;
    }
    const firstParagraph = letterParagraphs[0];
    const nameMatch = firstParagraph.match(/저는.*?([가-힣]{2,3})입니다/);
    return nameMatch ? nameMatch[1] : "양양";
  };

  const characterName = getCharacterName();

  // 생성된 편지 로드
  useEffect(() => {
    const loadGeneratedLetter = async () => {
      if (answersId) {
        try {
          const response = await fetch(`/api/get-generated-letter?answersId=${answersId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.letter) {
              setGeneratedLetter(data.letter);
            }
          }
        } catch (error) {
          console.error('Error loading generated letter:', error);
        }
      }
    };

    loadGeneratedLetter();
  }, [answersId]);

  // 편지 내용이 변경될 때마다 업데이트
  useEffect(() => {
    setLetterContent([...letterParagraphs]);
  }, [generatedLetter]);

  // 사용자 정보 로드
  useEffect(() => {
    
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // 세션 데이터 로드 (answersId가 있을 때)
  useEffect(() => {
    if (currentUser && answersId) {
      const loadSessionData = async () => {
        try {
          const response = await fetch(`/api/sessions/list?userId=${currentUser.id}`);
          if (response.ok) {
            const { sessions } = await response.json();
            
            // answersId와 매칭되는 세션 찾기
            const matchingSession = sessions.find((session: any) => 
              session.questionAnswersId === answersId
            );
            
            if (matchingSession) {
              setSessionId(matchingSession.id);
              setHighlightedItems(matchingSession.highlightedItems || []);
              setStrengthItems(matchingSession.strengthItems || []);
              
              // reflectionItems 복원
              const loadedReflectionItems = matchingSession.reflectionItems || [
                { 
                  id: Date.now().toString(), 
                  content: '', 
                  selectedHints: [],
                  selectedFactors: [],
                  keywords: [], 
                  isLoadingKeywords: false, 
                  inspectionStep: 0, 
                  isProcessing: false,
                  personalReflection: '',
                  aiSuggestions: [],
                  isLoadingAiSuggestions: false,
                  selectedAiSuggestions: []
                }
              ];
              
              // 임시 상태 속성 추가
              const restoredReflectionItems = loadedReflectionItems.map((item: any) => ({
                ...item,
                isLoadingKeywords: false,
                isProcessing: false,
                isLoadingAiSuggestions: false,
                selectedAiSuggestions: item.selectedAiSuggestions || []
              }));
              
              setReflectionItems(restoredReflectionItems);
              
              // selectedTags 복원
              const restoredSelectedTags: {[itemId: string]: Array<{tag: string, type: 'keyword' | 'factor'}>} = {};
              loadedReflectionItems.forEach((item: any) => {
                if (item.selectedTags) {
                  restoredSelectedTags[item.id] = item.selectedTags;
                }
              });
              setSelectedTags(restoredSelectedTags);
              
              setCurrentStep(matchingSession.currentStep || 1);
              
              // 완료 상태 복원
              setIsUnderstandingCompleted(matchingSession.isUnderstandingCompleted || false);
              setIsStrengthCompleted(matchingSession.isStrengthCompleted || false);
              
              // 하이라이트 복원 (이해하기와 강점찾기 모두)
              if ((matchingSession.highlightedItems && matchingSession.highlightedItems.length > 0) || 
                  (matchingSession.strengthItems && matchingSession.strengthItems.length > 0)) {
                restoreHighlights(matchingSession.highlightedItems || [], matchingSession.strengthItems || []);
              }
            }
          }
        } catch (error) {
          console.error('Error loading session data:', error);
        }
      };
      
      loadSessionData();
    }
  }, [currentUser, answersId]);

  // 텍스트 영역 높이 자동 조절 함수
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
    }
  };

  // 모든 reflection input 텍스트 영역 높이 자동 조절
  useEffect(() => {
    const adjustAllTextareas = () => {
      reflectionItems.forEach(item => {
        const textarea = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLTextAreaElement;
        if (textarea && item.content) {
          adjustTextareaHeight(textarea);
        }
      });
    };

    // 컴포넌트 마운트 후 약간의 딜레이를 두고 실행
    const timeoutId = setTimeout(adjustAllTextareas, 100);
    
    return () => clearTimeout(timeoutId);
  }, [reflectionItems]);

  // 하이라이트 복원 함수 - 이해하기와 강점찾기 모두 처리
  const restoreHighlights = (highlightItems: any[], strengthItems: any[] = []) => {
    setLetterContent(prev => {
      const newContent = [...letterParagraphs];
      
      // 각 문단별로 하이라이트 적용
      for (let paragraphIndex = 0; paragraphIndex < newContent.length; paragraphIndex++) {
        let finalParagraph = letterParagraphs[paragraphIndex];
        
        // 해당 문단의 이해하기 하이라이트들 적용
        const highlightItemsForParagraph = highlightItems.filter(item => item.paragraphIndex === paragraphIndex);
        highlightItemsForParagraph.forEach(item => {
          finalParagraph = finalParagraph.replace(
            new RegExp(item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<span style="background-color: ${item.color}; color: #000000;">${item.text}</span>`
          );
        });
        
        // 해당 문단의 강점찾기 하이라이트들 적용
        const strengthItemsForParagraph = strengthItems.filter(item => item.paragraphIndex === paragraphIndex);
        strengthItemsForParagraph.forEach(item => {
          finalParagraph = finalParagraph.replace(
            new RegExp(item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<span style="background-color: ${item.color}; color: #000000;">${item.text}</span>`
          );
        });
        
        newContent[paragraphIndex] = finalParagraph;
      }
      
      return newContent;
    });
  };

  // 세션 자동 저장
  useEffect(() => {
    if (currentUser && (highlightedItems.length > 0 || strengthItems.length > 0 || reflectionItems.length > 0)) {
      const saveSession = async () => {
        try {
          // 데이터베이스 저장용 reflectionItems 준비 (임시 상태 제거)
          const reflectionItemsForDB = reflectionItems.map(item => ({
            ...item,
            selectedTags: selectedTags[item.id] || [],
            isLoadingKeywords: undefined,
            isProcessing: undefined,
            isLoadingAiSuggestions: undefined,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: item.inspectionStep === 3 ? new Date().toISOString() : undefined
          }));

          const response = await fetch('/api/sessions/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: currentUser.id,
              highlightedItems,
              strengthItems,
              reflectionItems: reflectionItemsForDB,
              currentStep,
              sessionId,
              questionAnswersId: answersId,
              isUnderstandingCompleted,
              isStrengthCompleted
            }),
          });

          if (response.ok) {
            const { session } = await response.json();
            if (!sessionId) {
              setSessionId(session.id);
            }
          }
        } catch (error) {
          console.error('Error saving session:', error);
        }
      };

      // 디바운스: 2초 후 저장
      const timeoutId = setTimeout(saveSession, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [highlightedItems, strengthItems, reflectionItems, selectedTags, currentStep, currentUser, sessionId, isUnderstandingCompleted, isStrengthCompleted]);

  // 3단계 진입 시 고민 정리 힌트 자동 생성
  useEffect(() => {
    if (currentStep === 3 && highlightedItems.length > 0 && reflectionHints.length === 0 && !isLoadingHints) {
      generateReflectionHints();
    }
  }, [currentStep, highlightedItems]);

  // 단계 변경 시 편지 본문 하이라이트 업데이트
  useEffect(() => {
    updateLetterHighlights();
  }, [currentStep, highlightedItems, strengthItems]);

  // 모든 하이라이트를 편지 본문에 표시 (이해하기 + 강점찾기)
  const updateLetterHighlights = () => {
    setLetterContent(prev => {
      const newContent = [...letterParagraphs];
      
      // 각 문단별로 하이라이트 적용
      for (let paragraphIndex = 0; paragraphIndex < newContent.length; paragraphIndex++) {
        let finalParagraph = letterParagraphs[paragraphIndex];
        
        // 이해하기 하이라이트 적용 (연두색)
        const itemsForParagraph = highlightedItems.filter(item => item.paragraphIndex === paragraphIndex);
        itemsForParagraph.forEach(item => {
          finalParagraph = finalParagraph.replace(
            new RegExp(item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<span style="background-color: ${item.color}; color: #000000;">${item.text}</span>`
          );
        });
        
        // 강점찾기 하이라이트 적용 (하늘색)
        const strengthItemsForParagraph = strengthItems.filter(item => item.paragraphIndex === paragraphIndex);
        strengthItemsForParagraph.forEach(item => {
          finalParagraph = finalParagraph.replace(
            new RegExp(item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<span style="background-color: ${item.color}; color: #000000;">${item.text}</span>`
          );
        });
        
        newContent[paragraphIndex] = finalParagraph;
      }
      
      return newContent;
    });
  };

  // 텍스트 선택 및 하이라이트 기능
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const selectedText = selection.toString().trim();
          const range = selection.getRangeAt(0);
          const parentElement = range.commonAncestorContainer.parentElement;
          
          // 편지 텍스트 영역인지 확인
          if (parentElement && parentElement.closest('.letterText')) {
            const paragraphElement = parentElement.closest('.letterText');
            const paragraphIndex = parseInt(paragraphElement?.getAttribute('data-paragraph') || '0');
            
            // 하이라이트 로직 재구성
            if (currentStep === 1) {
              if (!isUnderstandingCompleted) {
                // 이해하기 완료 전 -> 연두색 하이라이트
                const currentColor = highlightColors[colorIndex];
                const newItem: HighlightedItem = {
                  id: Date.now().toString(),
                  text: selectedText,
                  color: currentColor,
                  originalText: letterParagraphs[paragraphIndex],
                  paragraphIndex: paragraphIndex
                };
                setHighlightedItems(prev => [...prev, newItem]);
              } else {
                // 이해하기 완료 후 -> 하늘색 하이라이트 (강점찾기 모드)
                const newStrengthItem: StrengthItem = {
                  id: Date.now().toString(),
                  text: selectedText,
                  color: strengthColor,
                  originalText: letterParagraphs[paragraphIndex],
                  paragraphIndex: paragraphIndex
                };
                setStrengthItems(prev => [...prev, newStrengthItem]);
              }
            } else if (currentStep === 2) {
              if (!isStrengthCompleted) {
                // 강점찾기 완료 전 -> 하늘색 하이라이트
                const newStrengthItem: StrengthItem = {
                  id: Date.now().toString(),
                  text: selectedText,
                  color: strengthColor,
                  originalText: letterParagraphs[paragraphIndex],
                  paragraphIndex: paragraphIndex
                };
                setStrengthItems(prev => [...prev, newStrengthItem]);
              }
              // 강점찾기 완료 후 -> 하이라이트 기능 중지 (아무것도 하지 않음)
            }
            
            // 질문 자동 생성 제거 - 사용자가 버튼을 눌러야 생성됨
            
            // 선택 해제
            selection.removeAllRanges();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [colorIndex, highlightedItems, currentStep, isUnderstandingCompleted, isStrengthCompleted]);


  const removeHighlightedItem = (id: string) => {
    setHighlightedItems(prev => prev.filter(item => item.id !== id));
  };

  const removeStrengthItem = (id: string) => {
    setStrengthItems(prev => prev.filter(item => item.id !== id));
  };

  const generateQuestions = async (itemId: string, additionalInput?: string, itemText?: string) => {
    console.log('generateQuestions called with itemId:', itemId, 'additionalInput:', additionalInput, 'itemText:', itemText);
    
    setHighlightedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isLoadingQuestions: true }
        : item
    ));
    
    try {
      let item;
      let textToUse;
      
      if (itemText) {
        textToUse = itemText;
      } else {
        item = highlightedItems.find(item => item.id === itemId);
        console.log('Found item:', item);
        if (!item) {
          console.error('Item not found for itemId:', itemId);
          return;
        }
        textToUse = item.text;
      }
      
      console.log('Making API call with:', { highlightedTexts: [textToUse], userInput: additionalInput });
      
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          highlightedTexts: [textToUse],
          userInput: additionalInput,
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      const newQuestions: Question[] = data.questions.map((questionText: string, index: number) => ({
        id: `question-${Date.now()}-${index}`,
        text: questionText,
        isSelected: false,
      }));

      console.log('Generated questions:', newQuestions);

      setHighlightedItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, questions: newQuestions, isLoadingQuestions: false, selectedQuestion: undefined, userAnswer: '' }
          : item
      ));
    } catch (error) {
      console.error('Error generating questions:', error);
      setHighlightedItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, isLoadingQuestions: false }
          : item
      ));
    }
  };

  const selectQuestion = (itemId: string, question: Question) => {
    // 질문 선택 시 즉시 history에 추가
    const newQAPair: QAPair = {
      id: `qa-${Date.now()}`,
      question: question.text,
      answer: ''
    };
    
    setHighlightedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            conversationHistory: [...(item.conversationHistory || []), newQAPair],
            selectedQuestion: undefined,
            userAnswer: '',
            questions: undefined
          }
        : item
    ));
  };

  // Reflection item 관리 함수들
  const addReflectionItem = (initialHint?: string) => {
    const newItem: ReflectionItem = {
      id: Date.now().toString(),
      content: '',
      selectedHints: initialHint ? [initialHint] : [],
      selectedFactors: [],
      keywords: [],
      isLoadingKeywords: false,
      inspectionStep: 0,
      isProcessing: false,
      personalReflection: '',
      aiSuggestions: [],
      isLoadingAiSuggestions: false,
      selectedAiSuggestions: []
    };
    setReflectionItems(prev => [...prev, newItem]);
  };

  const removeReflectionItem = (id: string) => {
    setReflectionItems(prev => prev.filter(item => item.id !== id));
  };

  const updateReflectionItem = (id: string, content: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === id ? { ...item, content } : item
    ));
  };

  // 힌트 태그 선택 함수
  const selectReflectionHint = (hint: string) => {
    // 빈 reflection item이 있으면 그곳에 추가, 없으면 새로 생성
    const emptyItem = reflectionItems.find(item => !item.content.trim() && (!item.selectedHints || item.selectedHints.length === 0));
    
    if (emptyItem) {
      // 빈 아이템에 힌트 추가 (content에는 자동 추가하지 않음)
      setReflectionItems(prev => prev.map(item => 
        item.id === emptyItem.id 
          ? { 
              ...item, 
              selectedHints: [...(item.selectedHints || []), hint]
            }
          : item
      ));
    } else {
      // 새 아이템 생성
      addReflectionItem(hint);
    }
  };

  // 힌트 태그 제거 함수
  const removeHintFromReflection = (itemId: string, hintToRemove: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            selectedHints: (item.selectedHints || []).filter(hint => hint !== hintToRemove)
          }
        : item
    ));
  };


  // 환경적 요인 클릭 시 reflection item에 태그로 추가 (input에는 자동 추가 안함)
  const addFactorToReflection = (itemId: string, factor: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            selectedFactors: [...(item.selectedFactors || []), factor]
          }
        : item
    ));
  };

  // 환경적 요인 태그 제거 함수
  const removeFactorFromReflection = (itemId: string, factorToRemove: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            selectedFactors: (item.selectedFactors || []).filter(factor => factor !== factorToRemove)
          }
        : item
    ));
  };

  // 선택된 태그 제거
  const removeSelectedTag = (itemId: string, tagToRemove: string) => {
    setSelectedTags(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(item => item.tag !== tagToRemove)
    }));
    
    // reflection input에서도 해당 태그 제거
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (currentItem) {
      const newContent = currentItem.content.replace(new RegExp(`\\b${tagToRemove}\\b`, 'g'), '').replace(/\s+/g, ' ').trim();
      updateReflectionItem(itemId, newContent);
      
      // textarea 높이도 업데이트
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-item-id="${itemId}"]`) as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
        }
      }, 0);
    }
  };

  // 텍스트 영역 자동 높이 조절
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>, id: string) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
    updateReflectionItem(id, textarea.value);
  };

  // 고민 정리 힌트 생성 함수
  const generateReflectionHints = async () => {
    setIsLoadingHints(true);
    
    try {
      // 모든 하이라이트된 정보 수집
      const highlightData = highlightedItems.map(item => ({
        text: item.text,
        problemReason: item.problemReason || '', // 새로 추가된 필드
        userExplanation: item.userExplanation || '',
        emotionInference: item.emotionInference || ''
      }));

      const response = await fetch('/api/generate-reflection-hints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName,
          highlightedData: highlightData,
          letterContent: letterParagraphs.join(' ')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate reflection hints');
      }

      const data = await response.json();
      setReflectionHints(data.hints || []);
    } catch (error) {
      console.error('Error generating reflection hints:', error);
      // 기본 힌트 제공
      setReflectionHints([
        '집중력 부족으로 인한 어려움',
        '업무 효율성 문제',
        '동료와의 관계 걱정',
        '자신감 하락',
        '우선순위 설정의 어려움'
      ]);
    } finally {
      setIsLoadingHints(false);
    }
  };


  // 로그 추가 함수
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 고민 완료 처리 함수 (매번 검사 실행)
  const completeReflection = async (itemId: string) => {
    console.log('completeReflection 함수 호출됨', itemId);
    
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (!currentItem || !currentItem.content.trim()) {
      alert('고민 내용을 작성해주세요.');
      return;
    }

    // 매번 검사를 실행하기 위해 로그 초기화
    setDebugLogs([]);
    addLog(`완료 버튼 클릭 - 검사 시작`);

    // 처리 중 상태로 변경
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isProcessing: true }
        : item
    ));

    try {
      // 매번 감정 검사와 비난 패턴 검사를 동시에 실행
      addLog('검사 시작');
      
      const emotionResult = await checkEmotionAndReturn(itemId);
      addLog('감정 검사 완료');
      
      const blameResult = await checkBlamePatternAndReturn(itemId);
      addLog('비난 패턴 검사 완료');

      addLog(`감정: ${emotionResult?.hasEmotion ? 'true' : 'false'}, 비난: ${blameResult?.hasBlamePattern ? 'true' : 'false'}`);

      // 둘 다 완료되면 inspectionStep 3으로 설정 (한 번에 다 보여주기)
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              inspectionStep: 3, 
              isProcessing: false, 
              completedAt: new Date().toISOString() 
            }
          : item
      ));

    } catch (error) {
      console.error('Error processing reflection:', error);
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, isProcessing: false }
          : item
      ));
    }
  };


  // 상황 요약 함수
  const summarizeSituation = async (content: string): Promise<string> => {
    try {
      const response = await fetch('/api/summarize-situation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reflectionContent: content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to summarize situation');
      }

      const data = await response.json();
      return data.summary || "이 상황";
    } catch (error) {
      console.error('Error summarizing situation:', error);
      return "이 상황";
    }
  };

  // 감정 검사 함수 (결과 반환)
  const checkEmotionAndReturn = async (itemId: string) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (!currentItem) return null;

    try {
      const [emotionResponse, situationSummary] = await Promise.all([
        fetch('/api/check-emotion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reflectionContent: currentItem.content,
            originalLetter: letterParagraphs.join(' '),
          }),
        }),
        summarizeSituation(currentItem.content)
      ]);

      if (!emotionResponse.ok) {
        throw new Error('Failed to check emotion');
      }

      const emotionData = await emotionResponse.json();
      
      const emotionResult = {
        ...emotionData,
        situationSummary
      };

      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, emotionCheckResult: emotionResult }
          : item
      ));

      return emotionResult;
    } catch (error) {
      console.error('Error checking emotion:', error);
      return null;
    }
  };


  // 비난 패턴 검사 함수 (결과 반환)
  const checkBlamePatternAndReturn = async (itemId: string) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (!currentItem) return null;

    try {
      const response = await fetch('/api/check-blame-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reflectionContent: currentItem.content,
          originalLetter: letterParagraphs.join(' '),
          characterName: characterName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check blame pattern');
      }

      const data = await response.json();
      
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, blameCheckResult: data }
          : item
      ));

      return data;
    } catch (error) {
      console.error('Error checking blame pattern:', error);
      return null;
    }
  };


  // 환경적 요인 재추천 함수
  const regenerateEnvironmentalFactors = async (itemId: string) => {
    // 로딩 상태 추가 (blameCheckResult에 isRegenerating 플래그)
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId && item.blameCheckResult
        ? { 
            ...item, 
            blameCheckResult: { 
              ...item.blameCheckResult, 
              isRegenerating: true 
            } 
          }
        : item
    ));

    // 비난 패턴 검사를 다시 실행
    await checkBlamePatternAndReturn(itemId);

    // 로딩 상태 제거
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId && item.blameCheckResult
        ? { 
            ...item, 
            blameCheckResult: { 
              ...item.blameCheckResult, 
              isRegenerating: false 
            } 
          }
        : item
    ));
  };

  // Step 3: 해결책 입력 핸들러
  const handleSolutionInput = (e: React.ChangeEvent<HTMLTextAreaElement>, itemId: string, solutionId: string) => {
    const value = e.target.value;
    const textarea = e.target;
    
    // 높이 자동 조절
    textarea.style.height = 'auto';
    textarea.style.maxHeight = 'none';
    textarea.style.height = Math.max(50, textarea.scrollHeight) + 'px';
    
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            solutionInputs: (item.solutionInputs || []).map(input => 
              input.id === solutionId ? { ...input, content: value } : input
            )
          }
        : item
    ));
  };

  // 해결책 입력 추가
  const addSolutionInput = (itemId: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            solutionInputs: [...(item.solutionInputs || []), { id: Date.now().toString(), content: '', showStrengthHelper: false }]
          }
        : item
    ));
  };

  // 해결책 입력 삭제
  const removeSolutionInput = (itemId: string, solutionId: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            solutionInputs: (item.solutionInputs || []).filter(input => input.id !== solutionId)
          }
        : item
    ));
  };

  // 강점 도우미 토글
  const toggleStrengthHelper = (itemId: string, solutionId: string) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            solutionInputs: (item.solutionInputs || []).map(input => 
              input.id === solutionId 
                ? { ...input, showStrengthHelper: !input.showStrengthHelper }
                : input
            )
          }
        : item
    ));
  };

  // 강점 키워드 상태
  const [strengthKeywords, setStrengthKeywords] = useState<string[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);

  // 강점 키워드 생성 API 호출
  const generateStrengthKeywords = async () => {
    if (strengthItems.length === 0) return [];
    
    setIsLoadingKeywords(true);
    
    try {
      const response = await fetch('/api/generate-strength-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strengthItems,
          characterName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate keywords');
      }

      const data = await response.json();
      setStrengthKeywords(data.keywords || []);
      return data.keywords || [];
    } catch (error) {
      console.error('Error generating strength keywords:', error);
      // 에러 시 기본 키워드 사용
      const fallbackKeywords = ['강점', '능력', '특성'];
      setStrengthKeywords(fallbackKeywords);
      return fallbackKeywords;
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  // 강점 완료 시 키워드 생성
  useEffect(() => {
    if (isStrengthCompleted && strengthItems.length > 0 && strengthKeywords.length === 0) {
      generateStrengthKeywords();
    }
  }, [isStrengthCompleted, strengthItems.length]);

  // Step 3: 개인 경험 반영 핸들러
  const handlePersonalReflectionInput = (e: React.ChangeEvent<HTMLTextAreaElement>, itemId: string) => {
    const value = e.target.value;
    const textarea = e.target;
    
    // 높이 자동 조절
    textarea.style.height = 'auto';
    textarea.style.maxHeight = 'none';
    textarea.style.height = Math.max(16, textarea.scrollHeight) + 'px';
    
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, personalReflection: value }
        : item
    ));
  };

  // Step 3: AI 대안 추천 생성 함수
  const generateAiSuggestions = async (itemId: string) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (!currentItem) return;

    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isLoadingAiSuggestions: true }
        : item
    ));

    try {
      const response = await fetch('/api/generate-solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemContent: currentItem.content,
          personalReflection: currentItem.personalReflection,
          characterName: characterName,
          letterContent: letterParagraphs.join(' ')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI suggestions');
      }

      const data = await response.json();
      
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, aiSuggestions: data.suggestions || [], isLoadingAiSuggestions: false }
          : item
      ));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, isLoadingAiSuggestions: false }
          : item
      ));
    }
  };

  // Step 3: 선택된 AI 제안 제거
  const removeSelectedAiSuggestion = (itemId: string, suggestionToRemove: AiSuggestion) => {
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            selectedAiSuggestions: (item.selectedAiSuggestions || []).filter(s => s.text !== suggestionToRemove.text)
          }
        : item
    ));
    
    // solutionContent에서도 해당 텍스트 제거
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (currentItem && currentItem.solutionContent) {
      const newContent = currentItem.solutionContent.replace(suggestionToRemove.text, '').replace(/\s+/g, ' ').trim();
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, solutionContent: newContent }
          : item
      ));
    }
  };

  // Step 3: AI 제안 키워드를 해결책에 추가
  const addAiSuggestionToSolution = (itemId: string, suggestion: AiSuggestion) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (currentItem) {
      const currentContent = currentItem.solutionContent?.trim() || '';
      const newContent = currentContent 
        ? `${currentContent} ${suggestion.text}` 
        : suggestion.text;
      
      // 선택된 AI 제안 목록에 추가
      const selectedSuggestions = currentItem.selectedAiSuggestions || [];
      const isAlreadySelected = selectedSuggestions.some(s => s.text === suggestion.text);
      
      if (!isAlreadySelected) {
        setReflectionItems(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                solutionContent: newContent,
                selectedAiSuggestions: [...selectedSuggestions, suggestion]
              }
            : item
        ));
      }
    }
  };




  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.back()}
        className={styles.backButton}
      >
        ← 뒤로
      </button>
      
      <div className={styles.content}>
        <div className={styles.leftSection}>
          <div className={styles.letterDisplay}>
            <div className={styles.letterBox}>
              <div className={styles.letterContent}>
                {letterContent.map((paragraph, index) => (
                  <p 
                    key={index} 
                    className={`${styles.letterText} letterText`}
                    data-paragraph={index}
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.rightSection}>
          {/* 단계 네비게이션 */}
          <div className={styles.stepNavigation}>
            <button 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className={styles.stepButton}
            >
              &lt;
            </button>
            <div className={styles.stepInfo}>
              <div className={`${styles.stepDot} ${currentStep === 1 ? styles.active : ''}`}></div>
              <div className={`${styles.stepDot} ${currentStep === 2 ? styles.active : ''}`}></div>
              <div className={`${styles.stepDot} ${currentStep === 3 ? styles.active : ''}`}></div>
              <div className={`${styles.stepDot} ${currentStep === 4 ? styles.active : ''}`}></div>
            </div>
            <button 
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              disabled={currentStep === 4}
              className={styles.stepButton}
            >
              &gt;
            </button>
          </div>

          {/* 1단계: 이해하기 */}
          {currentStep === 1 && (
            <div className={styles.understandingSection}>
              <h2 className={styles.sectionTitle}>고민 이해하기</h2>
              <p className={styles.guideText}>편지에서 {characterName}의 고민이 보이는 부분을 드래그 한 뒤 Enter를 눌러주세요.</p>
            
              <div className={styles.highlightedItemsContainer}>
                {highlightedItems.map((item) => (
                  <div key={item.id} className={styles.highlightedItem}>
                    <div className={styles.highlightedItemHeader}>
                      <span 
                        className={styles.highlightedText}
                        style={{ backgroundColor: item.color, color: '#000000' }}
                      >
&quot;{item.text}&quot;
                      </span>
                      <button 
                        onClick={() => removeHighlightedItem(item.id)}
                        className={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>
                    
                    {/* 사용자 설명 입력 필드 - 항상 표시 */}
                    <div className={styles.explanationContainer}>
                      {/* 고민 이유 섹션 */}
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                          🎯 이 부분이 {characterName}의 고민이라고 생각한 이유는 무엇인가요?
                        </label>
                        <textarea
                          value={item.problemReason || ''}
                          onChange={(e) => {
                            const newProblemReason = e.target.value;
                            setHighlightedItems(prev => prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, problemReason: newProblemReason }
                                : prevItem
                            ));
                          }}
                          // placeholder={`이 부분에서 ${characterName}이 어떤 어려움이나 문제를 겪고 있다고 생각하는지 적어주세요...`}
                          className={styles.explanationInput}
                          spellCheck={false}
                        />
                      </div>
                      
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                          💭 {characterName}의 고민에 공감이 되셨나요? 나도 비슷한 경험이 있었나요?
                        </label>
                        <textarea
                          value={item.userExplanation || ''}
                          onChange={(e) => {
                            const newExplanation = e.target.value;
                            setHighlightedItems(prev => prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, userExplanation: newExplanation }
                                : prevItem
                            ));
                          }}
                          placeholder={`${characterName}의 고민에 공감되는 부분이나 비슷한 경험이 있다면 적어주세요...`}
                          className={styles.explanationInput}
                          spellCheck={false}
                        />
                      </div>
                      
                      {/* 감정 유추 필드 */}
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                        😊 {characterName}는 어떤 감정을 느꼈을지 생각해보세요.
                        </label>
                        <textarea
                          value={item.emotionInference || ''}
                          onChange={(e) => {
                            const newEmotionInference = e.target.value;
                            setHighlightedItems(prev => prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, emotionInference: newEmotionInference }
                                : prevItem
                            ));
                          }}
                          placeholder={`${characterName}가 이 상황에서 어떤 감정을 느꼈을지 생각해보고 적어주세요...`}
                          className={styles.explanationInput}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                    
                    {/* 이전 대화 히스토리와 질문 관련 기능은 주석처리됨 */}
                  </div>
                ))}
              </div>
              
              {/* 이해하기 완료/수정 버튼 */}
              <div className={styles.stepControlContainer}>
                {!isUnderstandingCompleted ? (
                  <button
                    onClick={() => setIsUnderstandingCompleted(true)}
                    className={styles.completeButton}
                    disabled={highlightedItems.length === 0}
                  >
                    ✅ 이해하기 완료
                  </button>
                ) : (
                  <div className={styles.completedSection}>
                    <span className={styles.completedText}>✅ 이해하기 완료됨</span>
                    <button
                      onClick={() => setIsUnderstandingCompleted(false)}
                      className={styles.editButton}
                    >
                      ✏️ 수정하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2단계: 강점찾기 */}
          {currentStep === 2 && (
            <div className={styles.strengthSection}>
              <h2 className={styles.sectionTitle}>강점찾기</h2>
              {!isUnderstandingCompleted ? (
                <div className={styles.warningMessage}>
                  <p className={styles.warningText}>
                    ⚠️ 먼저 1단계 이해하기를 완료해주세요.
                  </p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className={styles.goBackButton}
                  >
                    1단계로 이동
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.guideText}>편지에서 {characterName}의 강점이 보이는 부분을 드래그 해서 하이라이트 하고 Enter를 눌러주세요.</p>
            
              <div className={styles.strengthItemsContainer}>
                {strengthItems.map((item) => (
                  <div key={item.id} className={styles.strengthItem}>
                    <div className={styles.strengthItemHeader}>
                      <span 
                        className={styles.strengthText}
                        style={{ backgroundColor: item.color, color: '#000000' }}
                      >
                        &quot;{item.text}&quot;
                      </span>
                      <button 
                        onClick={() => removeStrengthItem(item.id)}
                        className={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>
                    
                    {/* 강점 설명 입력 필드 */}
                    <div className={styles.explanationContainer}>
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                          🤔 이 부분이 왜 강점이라고 생각하시나요?
                        </label>
                        <textarea
                          value={item.strengthDescription || ''}
                          onChange={(e) => {
                            const newDescription = e.target.value;
                            setStrengthItems(prev => prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, strengthDescription: newDescription }
                                : prevItem
                            ));
                          }}
                          placeholder={`이 부분이 ${characterName}의 강점이라고 생각하는 이유를 적어주세요...`}
                          className={styles.explanationInput}
                          spellCheck={false}
                        />
                      </div>
                      
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                          🌟 이 강점이 어떤 상황에서 어떻게 잘 발휘될 수 있을까요?
                        </label>
                        <textarea
                          value={item.strengthApplication || ''}
                          onChange={(e) => {
                            const newApplication = e.target.value;
                            setStrengthItems(prev => prev.map(prevItem => 
                              prevItem.id === item.id 
                                ? { ...prevItem, strengthApplication: newApplication }
                                : prevItem
                            ));
                          }}
                          placeholder={`이 강점이 어디서/어떤 상황에서, 어떻게 잘 발휘될 수 있을지 적어주세요...`}
                          className={styles.explanationInput}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 강점찾기 완료/수정 버튼 */}
              <div className={styles.stepControlContainer}>
                {!isStrengthCompleted ? (
                  <button
                    onClick={() => setIsStrengthCompleted(true)}
                    className={styles.completeButton}
                    disabled={strengthItems.length === 0}
                  >
                    ✅ 강점찾기 완료
                  </button>
                ) : (
                  <div className={styles.completedSection}>
                    <span className={styles.completedText}>✅ 강점찾기 완료됨</span>
                    <button
                      onClick={() => setIsStrengthCompleted(false)}
                      className={styles.editButton}
                    >
                      ✏️ 수정하기
                    </button>
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {/* 3단계: 고민 정리하기 */}
          {currentStep === 3 && (
            <div className={styles.reflectionSection}>
              <h2 className={styles.sectionTitle}>고민 정리하기</h2>
              <p className={styles.guideText}>{characterName}의 고민들을 {currentUser?.nickname || '사용자'}님의 언어로 다시 표현해 보세요.</p>
              
              {/* 고민 정리 힌트 섹션 */}
              {highlightedItems.length > 0 && (
                <div className={styles.reflectionHintsSection}>
                  <div className={styles.reflectionHintsHeader}>
                    <h4 className={styles.reflectionHintsTitle}>💡 이해하기 단계에서 작성한 내용을 바탕으로 한 고민 정리 힌트</h4>
                    <button
                      onClick={generateReflectionHints}
                      disabled={isLoadingHints}
                      className={styles.regenerateHintsButton}
                    >
                      🔄
                    </button>
                  </div>
                  
                  {isLoadingHints ? (
                    <div className={styles.loadingContainer}>
                      <p className={styles.loadingText}>힌트를 생성하고 있습니다...</p>
                    </div>
                  ) : (
                    <div className={styles.reflectionHintsList}>
                      {reflectionHints.map((hint, index) => (
                        <span 
                          key={index} 
                          className={styles.reflectionHintTag}
                          onClick={() => selectReflectionHint(hint)}
                        >
                          {hint}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className={styles.reflectionContainer}>
                {reflectionItems.map((item, index) => (
                  <div key={item.id} className={styles.reflectionItem}>
                    {/* 고민 헤더 */}
                    <div className={styles.reflectionItemTitle}>
                      <div className={styles.titleAndTags}>
                        <h4 className={styles.reflectionTitle}>🤔 고민 {index + 1}</h4>
                        {/* 선택된 힌트 태그들과 환경적 요인 태그들 */}
                        {((item.selectedHints && item.selectedHints.length > 0) || (item.selectedFactors && item.selectedFactors.length > 0)) && (
                          <div className={styles.selectedTagsNextToTitle}>
                            {/* 힌트 태그들 */}
                            {item.selectedHints && item.selectedHints.map((hint, hintIndex) => (
                              <span 
                                key={`hint-${hintIndex}`}
                                className={styles.selectedHintTag}
                              >
                                {hint}
                                <button 
                                  onClick={() => removeHintFromReflection(item.id, hint)}
                                  className={styles.removeTagButton}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {/* 환경적 요인 태그들 */}
                            {item.selectedFactors && item.selectedFactors.map((factor, factorIndex) => (
                              <span 
                                key={`factor-${factorIndex}`}
                                className={styles.selectedFactorTagInTitle}
                              >
                                {factor}
                                <button 
                                  onClick={() => removeFactorFromReflection(item.id, factor)}
                                  className={styles.removeTagButton}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => removeReflectionItem(item.id)}
                        className={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className={styles.reflectionItemHeader}>
                      <textarea
                        value={item.content}
                        onChange={(e) => handleTextareaInput(e, item.id)}
                        placeholder="여기에 편지 속에 담긴 고민을 한 문장으로 표현해보세요."
                        className={styles.reflectionInput}
                        rows={1}
                        spellCheck={false}
                        data-item-id={item.id}
                      />
                    </div>
                    
                    {/* 선택된 태그 표시 */}
                    {selectedTags[item.id] && selectedTags[item.id].length > 0 && (
                      <div className={styles.selectedTagsContainer}>
                        {selectedTags[item.id].map((tagItem, index) => (
                          <span 
                            key={index} 
                            className={tagItem.type === 'keyword' ? styles.selectedKeywordTag : styles.selectedFactorTag}
                          >
                            {tagItem.tag}
                            <button 
                              onClick={() => removeSelectedTag(item.id, tagItem.tag)}
                              className={styles.removeTagButton}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    

                    {/* 검사 결과 표시 - 한 번에 모두 보여주기 */}
                    {item.inspectionStep === 3 && (
                      <div className={styles.inspectionResults}>
                        {/* 감정 검사 결과 */}
                        {item.emotionCheckResult && !item.emotionCheckResult.hasEmotion && (
                          <div className={styles.emotionSuggestion}>
                            <div className={styles.suggestionHeader}>
                              <span className={styles.suggestionIcon}>💭</span>
                              <h5 className={styles.suggestionTitle}>
                                {item.emotionCheckResult.situationSummary || "이 상황"}에서 양양은 어떤 감정을 느꼈을지도 추가해볼까요?
                              </h5>
                            </div>
                          </div>
                        )}

                        {/* 비난 패턴 검사 결과 */}
                        {item.blameCheckResult && item.blameCheckResult.hasBlamePattern && (
                          <div className={styles.blameWarning}>
                            <div className={styles.warningHeader}>
                              <div className={styles.warningTitleSection}>
                                <span className={styles.warningIcon}>⚠️</span>
                                <h5 className={styles.warningTitle}>관점 확장 제안</h5>
                              </div>
                              <button 
                                className={styles.expandToggle}
                                onClick={() => {
                                  setReflectionItems(prev => prev.map(prevItem => 
                                    prevItem.id === item.id 
                                      ? { ...prevItem, blameWarningExpanded: !prevItem.blameWarningExpanded }
                                      : prevItem
                                  ));
                                }}
                              >
                                {item.blameWarningExpanded ? 'v' : '>'}
                              </button>
                            </div>
                            
                            {item.blameWarningExpanded && (
                              <>
                                <p className={styles.warningText}>
                                  {item.blameCheckResult.warning}
                                </p>
                                
                                {item.blameCheckResult.environmentalFactors && item.blameCheckResult.environmentalFactors.length > 0 && (
                                  <div className={styles.environmentalFactors}>
                                    <div className={styles.factorsHeader}>
                                      <h6 className={styles.factorsTitle}>고려해볼 주변 요인들:</h6>
                                      <button
                                        onClick={() => regenerateEnvironmentalFactors(item.id)}
                                        disabled={item.blameCheckResult.isRegenerating}
                                        className={styles.regenerateFactorsButton}
                                      >
                                        🔄
                                      </button>
                                    </div>
                                    <div className={styles.factorsList}>
                                      {item.blameCheckResult.environmentalFactors.map((factor, index) => (
                                        <span 
                                          key={index} 
                                          className={styles.factorTag}
                                          onClick={() => addFactorToReflection(item.id, factor)}
                                        >
                                          {factor}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 완료 버튼 (맨 밑으로 이동) */}
                    <div className={styles.completeSection}>
                      <button
                        onClick={() => completeReflection(item.id)}
                        disabled={item.isProcessing || !item.content.trim()}
                        className={styles.completeReflectionButton}
                      >
                        {item.isProcessing ? (
                          <>⏳ 검사 중...</>
                        ) : (
                          <>✅ 완료하기</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => addReflectionItem()}
                  className={styles.addReflectionButton}
                >
                  + 새로운 고민 추가하기
                </button>

                {/* 디버그 로그 창 */}
                {debugLogs.length > 0 && (
                  <div className={styles.debugLogContainer}>
                    <div className={styles.debugLogHeader}>
                      <h4 className={styles.debugLogTitle}>🔍 검사 로그</h4>
                      <button
                        onClick={() => setDebugLogs([])}
                        className={styles.clearLogButton}
                      >
                        지우기
                      </button>
                    </div>
                    <div className={styles.debugLogContent}>
                      {debugLogs.map((log, index) => (
                        <div key={index} className={styles.debugLogItem}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4단계: 해결책 탐색 */}
          {currentStep === 4 && (
            <div className={styles.solutionSection}>
              <h2 className={styles.sectionTitle}>해결책 탐색하기</h2>
              <p className={styles.guideText}>
                앞서 정리한 고민에 대한 해결방안을 제안해주세요.
              </p>
              
              <div className={styles.solutionContainer}>
                {reflectionItems
                  .filter(item => item.content.trim().length > 0)
                  .map((item, index) => (
                    <div key={item.id} className={styles.solutionItem}>
                      <div className={styles.problemSummary}>
                        <h4 className={styles.problemTitle}>📝 정리한 고민 {index + 1}</h4>
                        <div className={styles.problemContent}>{item.content}</div>
                        
                        {/* 검사 결과 표시
                        {(item.emotionCheckResult || item.blameCheckResult) && (
                          <div className={styles.problemInsights}>
                            {item.emotionCheckResult && !item.emotionCheckResult.hasEmotion && (
                              <div className={styles.insight}>
                                💭 <span>{characterName}의 감정도 함께 고려해주세요</span>
                              </div>
                            )}
                            {item.blameCheckResult && item.blameCheckResult.hasBlamePattern && (
                              <div className={styles.insight}>
                                🌱 <span>주변 환경과 {characterName}의 강점을 생각해보세요</span>
                              </div>
                            )}
                          </div>
                        )} */}
                      </div>
                      
                      {/* 개인 경험 반영 섹션 */}
                      <div className={styles.personalReflectionInput}>
                        <h4 className={styles.personalReflectionTitle}>🤔 나라면 어떻게 해볼까?</h4>
                        <textarea
                          value={item.personalReflection || ''}
                          onChange={(e) => handlePersonalReflectionInput(e, item.id)}
                          placeholder={`비슷한 경험이 있었다면 그때의 대처방안이 뭐였는지, 뭐가 좋고 나빴는지 작성해보세요.`}
                          className={styles.personalReflectionTextarea}
                          rows={4}
                          spellCheck={false}
                        />
                      </div>

                      <div className={styles.solutionInput}>
                        <h4 className={styles.solutionTitle}>💡 {characterName}에게 조언해주기</h4>
                        <p className={styles.solutionGuideText}>
                        {currentUser?.nickname || '사용자'}님의 경험과 AI 추천을 참고해서 {characterName}에게 구체적이고 실행 가능한 조언을 해주세요.
                        </p>
                        
                        {/* 해결책 입력들 */}
                        {(item.solutionInputs || []).map((solutionInput) => (
                          <div key={solutionInput.id} className={styles.solutionInputItem}>
                            <textarea
                              value={solutionInput.content}
                              onChange={(e) => handleSolutionInput(e, item.id, solutionInput.id)}
                              onFocus={() => !solutionInput.showStrengthHelper && toggleStrengthHelper(item.id, solutionInput.id)}
                              placeholder="고민을 해결할 수 있는 방법을 작성해주세요."
                              className={styles.solutionTextarea}
                              rows={1}
                              spellCheck={false}
                            />
                            {(item.solutionInputs || []).length > 1 && (
                              <button 
                                onClick={() => removeSolutionInput(item.id, solutionInput.id)}
                                className={styles.removeSolutionButton}
                              >
                                ×
                              </button>
                            )}
                            
                            {/* 강점 도우미 박스 */}
                            {solutionInput.showStrengthHelper && (
                              <div className={styles.strengthHelper}>
                                <div className={styles.strengthHelperHeader}>
                                  <h5 className={styles.strengthHelperTitle}>💪 {characterName}의 강점을 고민 해결 방법에 활용해보세요!</h5>
                                  <button 
                                    onClick={() => toggleStrengthHelper(item.id, solutionInput.id)}
                                    className={styles.closeHelperButton}
                                  >
                                    ×
                                  </button>
                                </div>
                                <p className={styles.strengthHelperGuide}>
                                  {currentUser?.nickname || '사용자'}님이 찾아주신 {characterName}의 강점들을 아래에 정리해 보았어요. 이 강점들을 활용해서 고민을 해결할 방안을 찾아보세요.
                                </p>
                                <div className={styles.strengthKeywords}>
                                  {isLoadingKeywords ? (
                                    <span className={styles.loadingKeywords}>키워드를 생성하고 있습니다...</span>
                                  ) : (
                                    strengthKeywords.map((keyword, index) => (
                                      <span key={index} className={styles.strengthKeyword}>
                                        {keyword}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* 추가 버튼 */}
                        <button 
                          onClick={() => addSolutionInput(item.id)}
                          className={styles.addSolutionButton}
                        >
                          + 조언 추가하기
                        </button>
                        
                        {/* 선택된 AI 제안 태그 표시 */}
                        {item.selectedAiSuggestions && item.selectedAiSuggestions.length > 0 && (
                          <div className={styles.selectedAiSuggestionsContainer}>
                            {item.selectedAiSuggestions.map((suggestion, index) => (
                              <span 
                                key={index} 
                                className={styles.selectedAiSuggestionTag}
                              >
                                {suggestion.text}
                                <button 
                                  onClick={() => removeSelectedAiSuggestion(item.id, suggestion)}
                                  className={styles.removeTagButton}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AI 대안 추천 섹션 */}
                      <div className={styles.aiSuggestionsSection}>
                        <div className={styles.aiSuggestionsHeader}>
                          <h4 className={styles.aiSuggestionsTitle}>🤖 힌트 얻기</h4>
                          <button
                            onClick={() => generateAiSuggestions(item.id)}
                            disabled={item.isLoadingAiSuggestions}
                            className={styles.generateSuggestionsButton}
                          >
                            {item.isLoadingAiSuggestions ? '생성 중...' : '추천받기'}
                          </button>
                        </div>
                        
                        {item.isLoadingAiSuggestions ? (
                          <div className={styles.loadingContainer}>
                            <p className={styles.loadingText}>AI가 대안을 생성하고 있습니다...</p>
                          </div>
                        ) : (
                          <div className={styles.aiSuggestionsList}>
                            {(item.aiSuggestions || []).slice(0, 3).map((suggestion, index) => (
                              <div 
                                key={index} 
                                className={styles.aiSuggestionItem}
                                onClick={() => addAiSuggestionToSolution(item.id, suggestion)}
                              >
                                <div className={styles.aiSuggestionText}>
                                  {suggestion.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                    </div>
                  ))}
                  
                {reflectionItems.filter(item => item.content.trim().length > 0).length === 0 && (
                  <div className={styles.noReflections}>
                    <p className={styles.noReflectionsText}>
                      3단계에서 고민을 정리한 후에 해결책을 탐색할 수 있습니다.
                    </p>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className={styles.goToStep2Button}
                    >
                      3단계로 이동
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Writing;