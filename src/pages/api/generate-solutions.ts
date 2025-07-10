import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 6가지 카테고리 정의
const CATEGORIES: { [key: string]: { label: string; labelKo: string } } = {
  'inner_peace': {
    label: 'Inner Peace & Mindfulness',
    labelKo: '내적 평화와 마음 돌보기'
  },
  'physical_environment': {
    label: 'Physical Environment & Routine',
    labelKo: '물리적 환경과 일상의 루틴 조정'
  },
  'social_support': {
    label: 'Social Support & Connection',
    labelKo: '사회적 연결 및 지지 확보하기'
  },
  'self_advocacy': {
    label: 'Self-Advocacy & Assertiveness',
    labelKo: '자기옹호와 자기주장 강화하기'
  },
  'behavioral_activation': {
    label: 'Behavioral Activation & Practical Actions',
    labelKo: '구체적 행동 활성화 전략'
  },
  'cognitive_reframing': {
    label: 'Cognitive Reframing & Perspective Shift',
    labelKo: '인지적 재구성과 관점 전환'
  }
};

// 3개의 랜덤 카테고리 선택
function selectRandomCategories() {
  const categoryKeys = Object.keys(CATEGORIES);
  const shuffled = categoryKeys.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// 카테고리별 기본 제안 (ADHD 직장인 맞춤)
function getDefaultSuggestionForCategory(category: string): string {
  const defaults: { [key: string]: string } = {
    'inner_peace': '호흡법 연습하기',
    'physical_environment': '공간 정리하기',
    'social_support': '동료에게 말하기',
    'self_advocacy': '도움 요청하기',
    'behavioral_activation': '목록 만들기',
    'cognitive_reframing': '관점 바꾸기'
  };
  
  return defaults[category] || '작게 시작하기';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { problemContent, personalReflection, characterName, letterContent } = req.body;

  if (!problemContent) {
    return res.status(400).json({ message: 'Problem content is required' });
  }

  try {
    const selectedCategories = selectRandomCategories();
    
    const prompt = `
편지 작성자: ${characterName} (ADHD를 가진 직장인)
편지 내용: ${letterContent}

사용자가 정리한 구체적 문제: ${problemContent}

사용자의 개인 경험/반영: ${personalReflection || '없음'}

위의 구체적인 상황과 맥락을 바탕으로 "${characterName}"의 ADHD 관련 직장 어려움에 직접적으로 도움이 될 수 있는 실용적인 해결책을 다음 3가지 카테고리에서 각각 1개씩 생성해주세요:

1. ${CATEGORIES[selectedCategories[0]].labelKo}
2. ${CATEGORIES[selectedCategories[1]].labelKo}
3. ${CATEGORIES[selectedCategories[2]].labelKo}

각 카테고리별로 다음 조건을 만족하는 제안을 생성해주세요:
- 3-6자 정도의 간결한 방향성 키워드 (예: "타이머 활용하기", "체크리스트 만들기")
- "~하기" 형태의 행동 지향적 표현
- 사용자가 이 키워드를 보고 자신만의 구체적인 방법으로 확장할 수 있는 방향성 제시
- ADHD 직장인이 바로 연상할 수 있는 친숙한 해결 방향

응답은 다음 JSON 형식으로 해주세요:
{
  "suggestions": [
    {
      "category": "${selectedCategories[0]}",
      "text": "첫 번째 카테고리 제안"
    },
    {
      "category": "${selectedCategories[1]}",
      "text": "두 번째 카테고리 제안"
    },
    {
      "category": "${selectedCategories[2]}",
      "text": "세 번째 카테고리 제안"
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 ADHD 전문 상담사이자 직장 적응 코치입니다. ADHD를 가진 직장인들의 구체적인 어려움(집중력, 업무효율, 동료관계, 자신감 등)을 이해하고, 실제 직장 환경에서 바로 적용할 수 있는 구체적이고 실용적인 해결책을 제시합니다. 일반적인 격려보다는 즉시 실행 가능한 행동 지침을 제공합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // JSON 파싱 시도
    let suggestions: any[] = [];
    try {
      const parsed = JSON.parse(response);
      suggestions = parsed.suggestions || [];
      
      // 카테고리 라벨 추가
      suggestions = suggestions.map(suggestion => ({
        ...suggestion,
        categoryLabel: CATEGORIES[suggestion.category]?.labelKo || '기타'
      }));
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 제안 제공
      suggestions = selectedCategories.map(category => ({
        category,
        categoryLabel: CATEGORIES[category].labelKo,
        text: getDefaultSuggestionForCategory(category)
      }));
    }

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error generating solutions:', error);
    
    // 오류 발생 시 기본 제안 제공
    const selectedCategories = selectRandomCategories();
    const defaultSuggestions = selectedCategories.map(category => ({
      category,
      categoryLabel: CATEGORIES[category].labelKo,
      text: getDefaultSuggestionForCategory(category)
    }));
    
    res.status(200).json({ suggestions: defaultSuggestions });
  }
}