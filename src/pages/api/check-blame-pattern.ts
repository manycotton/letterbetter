import { NextApiRequest, NextApiResponse } from 'next';
import { updateReflectionItem } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { reflectionContent, originalLetter, characterName, reflectionId, sessionId } = req.body;

    const prompt = `다음은 편지 원문과 사용자가 작성한 고민 정리 내용입니다:

편지 원문:
${originalLetter}

사용자의 고민 정리:
${reflectionContent}

사용자가 작성한 고민 정리를 분석하여 ${characterName}의 개인적인 특징이나 신경다양성 특성을 문제의 주된 원인으로 보고 있는 패턴이 있는지 확인해주세요.

**다음과 같은 표현이 있으면 개인 특성 중심 분석 패턴으로 판단:**

1. **개인 능력/특성 부족을 강조하는 표현들:**
   - "~을 못해서", "~가 부족해서", "~를 구분 못해서", "~를 파악 못해서"
   - "~가 안되어서", "~를 하지 못해서", "~가 없어서", "~가 부족해서"
   - "능력이 없다", "능력이 부족하다", "실력이 부족하다"
   - "집중력이 약해서", "판단력이 부족해서", "의지가 약해서"
   - "성격이 문제", "개성이 문제", "타고난 성향이 문제"
   - "무엇이 중요한지 구분을 못해서", "우선순위를 정하지 못해서"

2. **개인적 결함이나 부족함을 직접적으로 언급:**
   - "남 눈치를 살피는 능력이 없다"
   - "시간관리를 못한다"
   - "소통 능력이 부족하다"
   - "자기관리가 안된다"

**예시:**
- "남 눈치를 살피는 능력이 없다" → 개인 특성 중심 (hasBlamePattern: true)
- "집중력이 부족해서 실수한다" → 개인 특성 중심 (hasBlamePattern: true)
- "의지가 약해서 계속 미룬다" → 개인 특성 중심 (hasBlamePattern: true)

**개인 특성 중심이 아닌 경우:**
- 환경적 요인도 함께 언급하는 경우
- 상황적 맥락을 고려하는 경우
- 단순히 상황을 서술하되 개인의 부족함을 강조하지 않는 경우

사용자가 작성한 내용에서 위와 같은 개인 특성 부족을 강조하는 표현이 하나라도 있다면 hasBlamePattern을 true로 판단해주세요.

만약 그런 패턴이 발견된다면, **사용자가 작성한 고민 정리 내용에서 언급된 구체적인 상황**에 맞는 주변 요인들을 **중학생도 이해할 수 있는 쉬운 단어**로 키워드 제안해주세요:

**키워드 제안 가이드라인:**
1. **중학생도 알 수 있는 쉬운 말**: 어려운 단어나 전문용어 절대 사용 금지
2. **사용자가 쓴 고민과 직접 연관된 구체적 상황**: 일반적인 예시가 아닌, 사용자가 언급한 상황에 딱 맞는 요인들
3. **2-3단어로 간단하게**: 짧고 명확하게

**사용자 고민 내용 분석 후 해당 상황에 맞는 키워드 제안 예시:**
- 회사에서 집중 어려움 → "시끄러운 사무실", "전화벨 소리", "동료 대화 소리", "오픈 오피스", "방해 요소 많음"
- 회의에서 놓침 → "빠른 진행", "중요한 말 안 알려줌", "회의록 없음", "갑자기 바뀐 일정"
- 동료 관계 걱정 → "눈치 보는 분위기", "실수하면 혼냄", "도움 요청하기 어려움", "완벽해야 한다는 압박"
- 업무 우선순위 → "지시가 애매함", "갑자기 급한 일", "여러 일 동시에", "마감 시간 짧음"

**중요**: 사용자가 작성한 고민 정리에서 구체적으로 언급한 상황들을 바탕으로, 그 상황에서 실제로 영향을 줄 수 있는 주변 요인들을 **5-7개 정도** 제안해주세요.

응답 형식:
- hasBlamePattern: true/false (개인 특성 중심 분석 패턴이 있는지)
- warning: 패턴이 있을 경우 다양한 관점을 고려해볼 수 있도록 돕는 부드러운 제안 메시지 (2-3문장, "~도 함께 살펴보면 어떨까요?" 같은 제안 톤으로)
- environmentalFactors: 사용자가 작성한 고민 상황에 직접 연관된 주변 요인들 **5-7개** 배열 (각 요인은 **2-3단어의 중학생도 이해할 수 있는 쉬운 표현**)

JSON 형태로 응답해주세요.`;

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
            content: '당신은 따뜻하고 공감적인 상담 전문가입니다. 신경다양성 특성을 존중하며, 개인의 특성만으로 문제를 설명하려는 패턴을 부드럽게 식별하고 더 균형잡힌 관점을 제안합니다. 비판적이거나 단언적인 표현은 피하고, "~도 함께 살펴보면 어떨까요?", "~도 고려해볼 수 있겠네요" 같은 부드러운 제안 방식을 사용합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    try {
      const result = JSON.parse(content);
      
      // 데이터베이스에 blameCheckResult 업데이트
      if (reflectionId && sessionId) {
        try {
          await updateReflectionItem(reflectionId, sessionId, {
            blameCheckResult: result
          });
        } catch (dbError) {
          console.error('Error updating blame check result in database:', dbError);
          // DB 업데이트 실패해도 결과는 반환
        }
      }
      
      res.status(200).json(result);
    } catch (parseError) {
      // JSON 파싱 실패 시 기본값 반환
      const fallbackResult = {
        hasBlamePattern: false,
        warning: "",
        environmentalFactors: []
      };
      
      // 데이터베이스에 fallback 결과 업데이트
      if (reflectionId && sessionId) {
        try {
          await updateReflectionItem(reflectionId, sessionId, {
            blameCheckResult: fallbackResult
          });
        } catch (dbError) {
          console.error('Error updating fallback blame check result in database:', dbError);
        }
      }
      
      res.status(200).json(fallbackResult);
    }

  } catch (error) {
    console.error('Error checking blame pattern:', error);
    
    // 에러 시 기본값 반환
    const errorResult = {
      hasBlamePattern: false,
      warning: "",
      environmentalFactors: []
    };
    
    // 데이터베이스에 에러 결과 업데이트
    if (reflectionId && sessionId) {
      try {
        await updateReflectionItem(reflectionId, sessionId, {
          blameCheckResult: errorResult
        });
      } catch (dbError) {
        console.error('Error updating error blame check result in database:', dbError);
      }
    }
    
    res.status(200).json(errorResult);
  }
}