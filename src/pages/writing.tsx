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
  userExplanation?: string;
}

interface StrengthItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  strengthDescription?: string;
}

interface AiSuggestion {
  text: string;
  category: string;
  categoryLabel: string;
}

interface ReflectionItem {
  id: string;
  content: string;
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
  isProcessing?: boolean;
  personalReflection?: string;
  aiSuggestions?: AiSuggestion[];
  isLoadingAiSuggestions?: boolean;
  selectedAiSuggestions?: AiSuggestion[];
  solutionContent?: string;
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
      keywords: [], 
      isLoadingKeywords: false, 
      inspectionStep: 0, 
      isProcessing: false,
      personalReflection: '',
      aiSuggestions: [],
      isLoadingAiSuggestions: false,
      selectedAiSuggestions: []
    }
  ]);
  const [strengthItems, setStrengthItems] = useState<StrengthItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<{[itemId: string]: Array<{tag: string, type: 'keyword' | 'factor'}>}>({});
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const highlightColors = ['#03ff00']; // 1단계: 이해하기용
  const strengthColor = '#00cdff'; // 2단계: 강점찾기용
  const [colorIndex, setColorIndex] = useState(0);
  const [isUnderstandingCompleted, setIsUnderstandingCompleted] = useState(false);
  const [isStrengthCompleted, setIsStrengthCompleted] = useState(false);

  const letterParagraphs = [
    "안녕하세요. 저는 현재 직장에서 일하고 있는 양양입니다. 저는 ADHD를 가지고 있어요. 요즘 들어 직장에서 업무를 수행하는 데 많은 어려움을 겪고 있어, 조언을 구하고자 이렇게 편지를 쓰게 되었습니다.",
    "업무에 집중하기가 너무 힘듭니다. 작은 소리에도 쉽게 산만해지고, 한 가지 일에 꾸준히 몰두하기가 어렵습니다. 이로 인해 마감 기한을 놓치거나, 실수가 잦아지는 등 업무 효율이 떨어지고 있습니다. 해야 할 일이 많을 때는 어디서부터 시작해야 할지 막막하고, 우선순위를 정하는 것도 버겁게 느껴집니다.",
    "또한, 제 행동으로 인해 동료들에게 피해를 주는 것은 아닐까 하는 걱정이 큽니다. 중요한 회의 내용을 놓치거나, 다른 사람의 말을 도중에 끊는 경우도 종종 있어 난처할 때가 많습니다. 이러한 상황들이 반복되면서 자신감도 떨어지고, 스스로에게 실망하는 날들이 늘어나고 있습니다.",
    "ADHD 증상으로 인해 직장 생활에 어려움을 겪는 것이 저만의 문제는 아니라는 것을 알고 있습니다. 하지만 매일같이 반복되는 이러한 상황들 속에서 어떻게 현명하게 대처해야 할지 막막하기만 합니다."
  ];

  // 캐릭터 이름 추출
  const getCharacterName = () => {
    const firstParagraph = letterParagraphs[0];
    const nameMatch = firstParagraph.match(/저는.*?([가-힣]{2,3})입니다/);
    return nameMatch ? nameMatch[1] : "양양";
  };

  const characterName = getCharacterName();

  // 편지 내용 초기화 및 사용자 정보 로드
  useEffect(() => {
    // 편지 내용을 원본으로 초기화 (하이라이트 제거)
    setLetterContent([...letterParagraphs]);
    
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
  const addReflectionItem = () => {
    const newItem: ReflectionItem = {
      id: Date.now().toString(),
      content: '',
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

  // 키워드 클릭 시 reflection input에 추가
  const addKeywordToReflection = (itemId: string, keyword: string) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (currentItem) {
      const currentContent = currentItem.content.trim();
      const newContent = currentContent 
        ? `${currentContent} ${keyword}` 
        : keyword;
      
      updateReflectionItem(itemId, newContent);
      
      // 선택된 태그 목록에 추가
      setSelectedTags(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), {tag: keyword, type: 'keyword'}]
      }));
      
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

  // 환경적 요인 클릭 시 reflection input에 추가
  const addFactorToReflection = (itemId: string, factor: string) => {
    const currentItem = reflectionItems.find(item => item.id === itemId);
    if (currentItem) {
      const currentContent = currentItem.content.trim();
      const newContent = currentContent 
        ? `${currentContent} ${factor}` 
        : factor;
      
      updateReflectionItem(itemId, newContent);
      
      // 선택된 태그 목록에 추가
      setSelectedTags(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), {tag: factor, type: 'factor'}]
      }));
      
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

  // 키워드 생성 함수 (개별 아이템용)
  const generateReflectionKeywords = async (itemId: string) => {
    // 해당 아이템을 로딩 상태로 변경
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isLoadingKeywords: true }
        : item
    ));
    
    try {
      // 하이라이트된 텍스트와 사용자 답변 수집
      const highlightedTexts = highlightedItems.map(item => item.text);
      const userAnswers = highlightedItems.flatMap(item => 
        item.conversationHistory?.map(qa => qa.answer).filter(answer => answer.trim()) || []
      );
      const userExplanations = highlightedItems
        .map(item => item.userExplanation)
        .filter(explanation => explanation && explanation.trim());

      // 현재 아이템의 내용도 포함
      const currentItem = reflectionItems.find(item => item.id === itemId);
      const currentContent = currentItem?.content?.trim() || '';

      const response = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          highlightedTexts,
          userAnswers,
          userExplanations,
          currentReflection: currentContent, // 현재 작성 중인 고민 내용 추가
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate keywords');
      }

      const data = await response.json();
      
      // 해당 아이템의 키워드만 업데이트
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, keywords: data.keywords || [], isLoadingKeywords: false }
          : item
      ));
    } catch (error) {
      console.error('Error generating keywords:', error);
      // 에러 시 기본 키워드 제공
      const defaultKeywords = ['집중력 부족', '업무 효율성', '동료 관계', '자신감 하락', '우선순위 설정'];
      setReflectionItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, keywords: defaultKeywords, isLoadingKeywords: false }
          : item
      ));
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

      // 검사 결과에 따라 적절한 단계로 설정
      if (!emotionResult?.hasEmotion && !blameResult?.hasBlamePattern) {
        // 둘 다 warning 필요: emotion만 먼저 보여주기
        setReflectionItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, inspectionStep: 1, isProcessing: false }
            : item
        ));
      } else if (emotionResult?.hasEmotion && !blameResult?.hasBlamePattern) {
        // emotion은 true, blame은 false: blame warning 제공
        setReflectionItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, inspectionStep: 2, isProcessing: false }
            : item
        ));
      } else if (!emotionResult?.hasEmotion && blameResult?.hasBlamePattern) {
        // emotion은 false, blame은 true: emotion warning만 제공
        setReflectionItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, inspectionStep: 1, isProcessing: false }
            : item
        ));
      } else {
        // 둘 다 true: 완료
        setReflectionItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, inspectionStep: 3, isProcessing: false, completedAt: new Date().toISOString() }
            : item
        ));
      }

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
  const handleSolutionInput = (e: React.ChangeEvent<HTMLTextAreaElement>, itemId: string) => {
    const value = e.target.value;
    setReflectionItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, solutionContent: value }
        : item
    ));
  };

  // Step 3: 개인 경험 반영 핸들러
  const handlePersonalReflectionInput = (e: React.ChangeEvent<HTMLTextAreaElement>, itemId: string) => {
    const value = e.target.value;
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
              <h2 className={styles.sectionTitle}>이해하기</h2>
              <p className={styles.guideText}>편지에서 공감되는 내용을 드래그 해서 하이라이트 하고 Enter를 눌러주세요.</p>
            
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
                      <div className={styles.explanationSection}>
                        <label className={styles.explanationLabel}>
                          왜 이 부분이 공감되었나요?
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
                          placeholder="하이라이트한 부분에 대한 생각이나 중요하다고 느낀 이유를 자유롭게 적어주세요..."
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
                  <p className={styles.guideText}>편지에서 화자(양양)의 강점이 보이는 부분을 드래그 해서 하이라이트 하고 Enter를 눌러주세요.</p>
            
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
                    <div className={styles.strengthDescriptionContainer}>
                      <div className={styles.strengthDescriptionSection}>
                        <label className={styles.strengthDescriptionLabel}>
                          이 부분에서 어떤 강점이 보이나요?
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
                          placeholder="양양이가 가진 강점이나 긍정적인 면을 찾아서 적어주세요..."
                          className={styles.strengthDescriptionInput}
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
              <p className={styles.guideText}>양양이의 고민들을 {currentUser?.nickname || '사용자'}님의 언어로 다시 표현해 보세요.</p>
              
              <div className={styles.reflectionContainer}>
                {reflectionItems.map((item) => (
                  <div key={item.id} className={styles.reflectionItem}>
                    <div className={styles.reflectionItemHeader}>
                      <textarea
                        value={item.content}
                        onChange={(e) => handleTextareaInput(e, item.id)}
                        placeholder="여기에 편지 속에 담긴 고민을 다시 표현해보세요."
                        className={styles.reflectionInput}
                        rows={1}
                        spellCheck={false}
                        data-item-id={item.id}
                      />
                      <button 
                        onClick={() => removeReflectionItem(item.id)}
                        className={styles.removeButton}
                      >
                        ×
                      </button>
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
                    
                    {/* 키워드 힌트 섹션 */}
                    <div className={styles.keywordsSection}>
                      <div className={styles.keywordsHeader}>
                        <h4 className={styles.keywordsTitle}>💡 고민 정리 힌트</h4>
                        <button
                          onClick={() => generateReflectionKeywords(item.id)}
                          disabled={item.isLoadingKeywords}
                          className={styles.regenerateKeywordsButton}
                        >
                          🔄
                        </button>
                      </div>
                      
                      {item.isLoadingKeywords ? (
                        <div className={styles.loadingContainer}>
                          <p className={styles.loadingText}>키워드를 생성하고 있습니다...</p>
                        </div>
                      ) : (
                        <div className={styles.keywordsList}>
                          {(item.keywords || []).map((keyword, index) => (
                            <span 
                              key={index} 
                              className={styles.keywordTag}
                              onClick={() => addKeywordToReflection(item.id, keyword)}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 1단계: 감정 검사 결과 */}
                    {(item.inspectionStep === 1 || (item.inspectionStep === 2 && !item.emotionCheckResult?.hasEmotion)) && 
                     item.emotionCheckResult && !item.emotionCheckResult.hasEmotion && (
                      <div className={styles.emotionSuggestion}>
                        <div className={styles.suggestionHeader}>
                          <span className={styles.suggestionIcon}>💭</span>
                          <h5 className={styles.suggestionTitle}>
                            {item.emotionCheckResult.situationSummary || "이 상황"}에서 양양은 어떤 감정을 느꼈을지도 추가해볼까요?
                          </h5>
                        </div>
                      </div>
                    )}

                    {/* 2단계: 비난 패턴 검사 결과 */}
                    {(item.inspectionStep === 2 || item.inspectionStep === 3) && 
                     item.blameCheckResult && item.blameCheckResult.hasBlamePattern && (
                      <div className={styles.blameWarning}>
                        <div className={styles.warningHeader}>
                          <span className={styles.warningIcon}>⚠️</span>
                          <h5 className={styles.warningTitle}>관점 확장 제안</h5>
                        </div>
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
                  onClick={addReflectionItem}
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
                        
                        {/* 검사 결과 표시 */}
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
                        )}
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
                        <textarea
                          value={item.solutionContent || ''}
                          onChange={(e) => handleSolutionInput(e, item.id)}
                          placeholder={`위의 개인 경험과 AI 추천을 참고하여 ${characterName}에게 적절한 조언을 작성해보세요.
• 구체적이고 실행 가능한 방안을 제시해보세요
• 단계별로 나누어서 설명해보세요
• ${characterName}의 상황과 감정을 고려해보세요`}
                          className={styles.solutionTextarea}
                          rows={4}
                          spellCheck={false}
                        />
                        
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