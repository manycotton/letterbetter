import { NextApiRequest, NextApiResponse } from 'next';

interface StrengthItem {
  id: string;
  text: string;
  color: string;
  originalText: string;
  paragraphIndex: number;
  strengthDescription?: string;
  strengthApplication?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      problemContent, 
      letterContent, 
      characterName, 
      selectedStrengthTags, 
      selectedSolutionCategories, 
      strengthItems 
    } = req.body;

    if (!problemContent || !characterName) {
      return res.status(400).json({ message: 'Problem content and character name are required' });
    }

    if ((!selectedStrengthTags || selectedStrengthTags.length === 0) && 
        (!selectedSolutionCategories || selectedSolutionCategories.length === 0)) {
      return res.status(400).json({ message: 'At least one strength tag or solution category must be selected' });
    }

    // 선택된 강점 정보 구성
    const strengthContext = selectedStrengthTags.length > 0 ? `
**선택된 강점들:**
${selectedStrengthTags.map((tag: string) => `- ${tag}`).join('\n')}

**강점 관련 세부 정보:**
${strengthItems && strengthItems.length > 0 ? strengthItems
  .filter((item: StrengthItem) => selectedStrengthTags.some((tag: string) => 
    item.text.includes(tag) || item.strengthDescription?.includes(tag) || item.strengthApplication?.includes(tag)
  ))
  .map((item: StrengthItem, index: number) => `
${index + 1}. 강점 내용: "${item.text}"
   설명: "${item.strengthDescription || '없음'}"
   활용법: "${item.strengthApplication || '없음'}"
`).join('\n') : '강점 세부 정보 없음'}
    ` : '';

    // 선택된 해결방안 카테고리 정보
    const solutionCategoryContext = selectedSolutionCategories.length > 0 ? `
**선택된 해결방안 카테고리들:**
${selectedSolutionCategories.map((category: string) => `- ${category}`).join('\n')}
    ` : '';

    const prompt = `당신은 심리 상담과 문제 해결 전문가입니다. 편지 속 인물 "${characterName}"의 고민을 해결하기 위한 구체적이고 실용적인 행동 계획을 제안해주세요.

**편지 전체 내용:**
${letterContent}

**핵심 고민 (반드시 이 고민을 해결하는 솔루션이어야 함):**
"${problemContent}"

${strengthContext}

${solutionCategoryContext}

**중요: 모든 솔루션은 반드시 위의 핵심 고민을 직접적으로 해결하는 내용이어야 합니다.**

**해결방안 카테고리별 구체적 가이드 (핵심 고민 해결 중심):**
- **마음 챙기기**: 핵심 고민 상황에서 마음을 다스리고 감정을 조절하는 구체적 방법
- **주변 환경 바꾸기**: 핵심 고민이 발생하는 환경이나 상황을 개선하는 구체적 방법
- **도움 요청하기**: 핵심 고민과 관련해 구체적으로 누구에게, 어떤 도움을 요청할지 명시
- **좋은 관계 만들기**: 핵심 고민 해결을 위한 관계 개선이나 소통 방법
- **나답게 행동/말하기**: 핵심 고민 상황에서 자신다운 방식으로 대처하는 방법
- **작지만 확실한 실천**: 핵심 고민 해결을 위한 매일 실행 가능한 작은 습관
- **생각 뒤집기**: 핵심 고민에 대한 관점이나 생각을 전환하는 구체적 방법

**솔루션 생성 규칙:**
1. **정확히 3개의 솔루션**을 제안
2. 각 솔루션은 **"~하기" 형태의 명사형**으로 구성
3. **핵심 고민을 직접적으로 해결하는** 구체적 행동 계획 제시
4. **선택된 강점을 핵심 고민 해결에 활용**하는 방법 포함
5. **선택된 해결방안 카테고리를 핵심 고민에 적용**한 구체적 실행법
6. **${characterName}의 상황, 성격, 환경에 맞는** 개인화된 조언
7. **언제, 어디서, 어떻게** 할지 구체적으로 명시

**절대적 조건:**
- 모든 솔루션은 반드시 "${problemContent}"라는 핵심 고민을 해결하는 데 직접적으로 도움이 되어야 함
- 일반적인 조언이 아닌, 이 특정 고민 상황에 맞는 맞춤형 솔루션이어야 함
- 핵심 고민의 키워드나 상황이 솔루션에 명확히 반영되어야 함

**특별 주의사항:**
- "도움 요청하기"가 선택된 경우: 핵심 고민과 관련해 구체적으로 누구에게(직장 동료, 가족, 친구, 전문가), 어떤 방식으로(대화, 이메일, 전화), 무엇을 도와달라고 할지 명시
- 강점 활용: 선택된 강점이 이 핵심 고민 해결에 어떻게 도움이 될지 구체적으로 연결
- 실행 가능성: ${characterName}이 내일부터 바로 시작할 수 있는 현실적인 방법

**솔루션 접근법:**
${selectedStrengthTags.length > 0 && selectedSolutionCategories.length > 0 
  ? `"${problemContent}"라는 핵심 고민을 해결하기 위해 강점 "${selectedStrengthTags.join(', ')}"을 활용하여 "${selectedSolutionCategories.join(', ')}" 방식으로 접근하는 구체적이고 실행 가능한 행동 계획`
  : selectedStrengthTags.length > 0 
    ? `"${problemContent}"라는 핵심 고민을 해결하기 위해 강점 "${selectedStrengthTags.join(', ')}"을 최대한 활용하는 구체적 실행 방법`
    : `"${problemContent}"라는 핵심 고민을 해결하기 위한 "${selectedSolutionCategories.join(', ')}" 접근법의 구체적이고 실용적인 실행 방법`
}

**응답 형식:**
반드시 JSON 배열 형태로 3개의 솔루션을 제공해주세요.
예시 (고민이 "대화를 통해 자신의 생각을 전하는 것에 어려움"인 경우):
["대화 전 핵심 메시지 3가지 미리 정리해서 메모하기", "상대방과 대화할 때 한 번에 하나씩 차근차근 전달하기", "신뢰하는 친구에게 중요한 대화 연습 도움 요청하기"]

각 솔루션은 ${characterName}이 바로 실행할 수 있는 구체적인 행동 계획이어야 하며, 핵심 고민을 직접적으로 해결하는 내용이어야 하고, 반드시 '~하기' 형태로 끝나야 합니다.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 개인화된 문제 해결 솔루션을 제공하는 전문가입니다. 사용자의 강점과 선호하는 해결방식을 고려하여 구체적이고 실행 가능한 조언을 제공합니다. 항상 JSON 배열 형태로 정확히 3개의 솔루션을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    try {
      // JSON 배열 파싱 시도
      const solutions = JSON.parse(content);
      
      if (Array.isArray(solutions) && solutions.length === 3) {
        res.status(200).json({ solutions });
      } else {
        // 배열이 아니거나 솔루션 개수가 맞지 않는 경우 기본값 제공
        throw new Error('Invalid solutions format');
      }
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 솔루션 생성
      const fallbackSolutions = generateFallbackSolutions(
        problemContent, 
        selectedStrengthTags, 
        selectedSolutionCategories,
        characterName
      );
      res.status(200).json({ solutions: fallbackSolutions });
    }

  } catch (error) {
    console.error('Error generating AI solutions:', error);
    
    // 에러 시 기본 솔루션 반환
    const fallbackSolutions = generateFallbackSolutions(
      req.body.problemContent || '고민', 
      req.body.selectedStrengthTags || [], 
      req.body.selectedSolutionCategories || [],
      req.body.characterName || '님'
    );
    res.status(200).json({ solutions: fallbackSolutions });
  }
}

// 기본 솔루션 생성 함수
function generateFallbackSolutions(
  problemContent: string, 
  strengthTags: string[], 
  solutionCategories: string[],
  characterName: string
): string[] {
  // 문제 유형별 맞춤형 솔루션 생성
  const generateContextualSolutions = (strengthTags: string[], categories: string[]) => {
    const solutions: string[] = [];
    
    // 대화/소통 관련 문제인 경우
    if (problemContent.includes('대화') || problemContent.includes('소통') || problemContent.includes('표현') || problemContent.includes('전달')) {
      if (strengthTags.includes('다른 사람 마음 읽기')) {
        solutions.push('상대방의 반응을 살피며 천천히 대화하는 연습하기');
      }
      if (strengthTags.includes('공감하고 소통하기')) {
        solutions.push('신뢰하는 사람과 중요한 대화 미리 연습해보기');
      }
      if (categories.includes('도움 요청하기')) {
        solutions.push('가족이나 친구에게 대화 연습 도와달라고 요청하기');
      }
    }
    
    // 자신감/확신 관련 문제인 경우
    if (problemContent.includes('자신감') || problemContent.includes('확신') || problemContent.includes('불안')) {
      if (strengthTags.includes('끝까지 포기 안하기')) {
        solutions.push('작은 성공 경험을 쌓아가며 자신감 키우기');
      }
      if (categories.includes('마음 챙기기')) {
        solutions.push('매일 긍정적인 자기 대화 연습하기');
      }
    }
    
    // 관계 관련 문제인 경우
    if (problemContent.includes('관계') || problemContent.includes('사람') || problemContent.includes('친구')) {
      if (categories.includes('좋은 관계 만들기')) {
        solutions.push('작은 관심 표현부터 시작해서 관계 개선하기');
      }
      if (strengthTags.includes('공감하고 소통하기')) {
        solutions.push('상대방 입장에서 생각해보며 대화하기');
      }
    }
    
    return solutions;
  };

  const contextualSolutions = generateContextualSolutions(strengthTags, solutionCategories);
  const solutions: string[] = [...contextualSolutions];

  // 일반적인 강점 기반 솔루션 (문제 상황에 관계없이 적용 가능한 것들)
  const strengthBasedSolutions: { [key: string]: string } = {
    '깊게 집중하는 능력': '매일 오전 30분 조용한 공간에서 집중해서 해결책 생각하기',
    '새로운 아이디어 내기': '주 3회 산책하며 창의적 해결책 떠올리기',
    '다른 사람 마음 읽기': '비슷한 경험 가진 지인과 주 1회 깊은 대화 나누기',
    '문제를 분석하기': '고민을 3단계로 나누어 매일 하나씩 체계적으로 해결하기',
    '공감하고 소통하기': '신뢰하는 가족이나 친구에게 구체적인 조언 구하기',
    '끝까지 포기 안하기': '작은 목표 세우고 매일 달성 여부 점검하기',
    '팀을 이끌어가기': '주변 사람들과 함께 브레인스토밍 세션 갖기'
  };

  const categoryBasedSolutions: { [key: string]: string } = {
    '마음 챙기기': '어려운 상황에서 느끼는 감정을 매일 3분씩 글로 써보며 마음 정리하기',
    '주변 환경 바꾸기': '고민이 생기는 환경을 파악하고 더 편안한 공간에서 해결책 생각하기',
    '도움 요청하기': '관련 경험이 있는 사람에게 구체적인 조언 구하기',
    '좋은 관계 만들기': '도움이 될 수 있는 사람과의 관계 개선하기',
    '나답게 행동/말하기': `${characterName}의 성향과 가치관에 맞는 방식으로 대처하기`,
    '작지만 확실한 실천': '해결을 위한 작은 행동을 매일 하나씩 꾸준히 실천하기',
    '생각 뒤집기': '고민을 다른 각도에서 바라보며 새로운 해결책 찾기'
  };

  // 강점 기반 솔루션 추가
  if (strengthTags.length > 0) {
    for (const tag of strengthTags) {
      if (strengthBasedSolutions[tag] && solutions.length < 3) {
        solutions.push(strengthBasedSolutions[tag]);
      }
    }
  }

  // 카테고리 기반 솔루션 추가
  if (solutionCategories.length > 0 && solutions.length < 3) {
    for (const category of solutionCategories) {
      if (categoryBasedSolutions[category] && solutions.length < 3) {
        solutions.push(categoryBasedSolutions[category]);
      }
    }
  }

  // 기본 솔루션으로 부족한 부분 채우기
  const defaultSolutions = [
    '현재 고민을 3개 단계로 나누어 매일 하나씩 차근차근 해결하기',
    `${characterName}만의 루틴 만들어 어려운 상황에 대처하기`,
    '어려운 상황에서도 자신감을 유지하는 긍정적 자기대화 연습하기',
    '작은 진전이라도 매일 기록하고 스스로를 격려하기',
    '현재 상황을 제3자 관점에서 바라보며 객관적 조언 찾기'
  ];

  while (solutions.length < 3) {
    const randomIndex = Math.floor(Math.random() * defaultSolutions.length);
    const defaultSolution = defaultSolutions[randomIndex];
    if (!solutions.includes(defaultSolution)) {
      solutions.push(defaultSolution);
    }
  }

  return solutions.slice(0, 3);
}