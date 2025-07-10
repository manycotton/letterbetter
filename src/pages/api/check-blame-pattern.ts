import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { reflectionContent, originalLetter } = req.body;

    const prompt = `다음은 편지 원문과 사용자가 작성한 고민 정리 내용입니다:

편지 원문:
${originalLetter}

사용자의 고민 정리:
${reflectionContent}

사용자가 작성한 고민 정리를 분석하여 다음과 같은 자기 비난 패턴이 있는지 매우 정교하게 확인해주세요:

**비난 패턴으로 판단해야 하는 경우:**
1. 명시적 자기 비난: "내가 못해서", "나 때문에", "내 잘못으로" 등
2. 개인 결함에만 집중: 화자의 개인적 단점이나 잘못만을 강조
3. 환경 요인 무시: 주변 환경, 상황적 요인, 시스템의 문제는 전혀 언급하지 않고 오직 개인의 문제로만 귀결
4. **미묘한 자기 비난 패턴 (중요!)**: 
   - 표면적으로는 객관적인 자기 평가처럼 보이지만, 전체적인 맥락에서 자기 비난적 프레임으로 상황을 해석하는 경우
   - "시간 약속을 안지켜서 주변에 피해를 끼침", "동료들에게 피해를 줌", "실수로 인해 문제를 만듦" 등의 표현이 포함되어 있더라도, 이것이 복합적인 상황(ADHD, 신경발달적 특성, 환경적 요인 등)을 단순히 개인의 도덕적/능력적 문제로 축소해서 보는 경우
   - 죄책감, 자책감을 드러내는 표현이 있으면서 동시에 상황의 복잡성을 고려하지 않는 경우
   - 신경발달적 특성(ADHD 등)으로 인한 어려움을 개인의 의지나 도덕적 문제로 해석하는 경우
5. **개인 특성/능력을 원인으로 지목하는 패턴**:
   - "집중력이 약해서", "능력이 부족해서", "성격이 문제라서", "의지가 약해서" 등 개인의 특성이나 능력을 문제의 직접적 원인으로 지목하는 경우
   - "~가 안되어서", "~를 못해서", "~가 부족해서" 같은 표현으로 개인의 결함을 강조하는 경우
   - 특히 ADHD, 우울, 불안 등 신경발달적/정신건강 특성을 "약점", "결함", "부족함"으로 프레이밍하는 경우

**비난 패턴이 아닌 경우:**
- 단순한 사실 서술: "집중을 못한다", "실수를 한다" (단, 이것이 자기 비난적 맥락 없이 중립적으로 서술된 경우)
- 문제 인식: "어려움이 있다", "개선이 필요하다"
- 균형잡힌 시각: 개인적 문제와 함께 환경적 요인도 언급하는 경우
- 건설적 자기 성찰: 자신의 행동을 객관적으로 분석하면서도 상황적 맥락을 고려하는 경우

**중요한 판단 기준:**
편지 전체의 맥락을 고려하여, 화자가 자신의 상황을 어떤 프레임으로 바라보고 있는지 파악해야 합니다. 특히 ADHD와 같은 신경발달적 특성을 가진 사람이 자신의 어려움을 단순히 개인의 잘못이나 부족함으로 해석하고 있다면, 이는 비난 패턴으로 봐야 합니다.

만약 그런 패턴이 발견된다면, 편지 내용과 맥락에 맞는 구체적인 주변 요인들을 키워드로 제안해주세요:

예시:
- 직장 환경: "상사의 지시 스타일", "회의실 소음", "업무 할당 방식", "동료와의 소통 방식"
- 사회적 환경: "ADHD에 대한 인식 부족", "집중력 장애에 대한 편견", "성과 위주 평가 시스템"
- 개인적 상황: "수면 부족", "약물 부작용", "가정 내 스트레스", "경제적 압박감"

편지 맥락에 맞게 구체적이고 실제적인 요인들을 제안해주세요.

응답 형식:
- hasBlamePattern: true/false (비난 패턴이 있는지)
- warning: 비난 패턴이 있을 경우 부드러운 관점 확장 제안 메시지 (2-3문장, "~해보면 어떨까요?" 같은 제안 톤으로)
- environmentalFactors: 편지 맥락에 맞는 구체적인 주변 요인들 배열 (각 요인은 3-5단어)

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
            content: '당신은 따뜻하고 공감적인 심리 상담 전문가입니다. 자기 비난 패턴을 부드럽게 식별하고 균형잡힌 관점을 제안 톤으로 제공합니다. 비판적이거나 단언적인 표현은 피하고, "~해보면 어떨까요?", "~도 고려해볼 수 있겠네요" 같은 부드러운 제안 방식을 사용합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
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
      res.status(200).json(result);
    } catch (parseError) {
      // JSON 파싱 실패 시 기본값 반환
      res.status(200).json({
        hasBlamePattern: false,
        warning: "",
        environmentalFactors: []
      });
    }

  } catch (error) {
    console.error('Error checking blame pattern:', error);
    
    // 에러 시 기본값 반환
    res.status(200).json({
      hasBlamePattern: false,
      warning: "",
      environmentalFactors: []
    });
  }
}