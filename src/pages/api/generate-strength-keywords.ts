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
    const { strengthItems, characterName } = req.body;

    if (!strengthItems || !Array.isArray(strengthItems) || strengthItems.length === 0) {
      return res.status(400).json({ message: 'No strength items provided' });
    }

    const prompt = `다음은 사용자가 ${characterName || '편지 화자'}의 편지에서 찾아낸 강점들입니다. 각 강점에 대해 사용자가 하이라이트한 본문 내용, 강점에 대한 설명, 그리고 잘 쓰일 수 있는 상황을 제공했습니다.

이 정보들을 종합하여 각 강점을 대표할 수 있는 **핵심 키워드**를 생성해주세요.

강점 정보:
${strengthItems.map((item: StrengthItem, index: number) => `
${index + 1}. 하이라이트된 본문: "${item.text}"
   원본 문맥: "${item.originalText}"
   강점 설명: "${item.strengthDescription || '없음'}"
   활용 상황: "${item.strengthApplication || '없음'}"
`).join('\n')}

**키워드 생성 규칙:**
1. **각 강점당 최소 3개 이상의 키워드** 생성
2. **1-3단어**로 구성된 간결한 키워드
3. **구체적이고 실용적인** 키워드 (추상적 표현 지양)
4. **해당 강점의 핵심을 잘 드러내는** 키워드
5. **중학생도 이해할 수 있는 쉬운 단어** 사용

**키워드 예시:**
- 집중력, 몰입력, 지속력
- 창의성, 아이디어, 독창성  
- 공감능력, 마음읽기, 소통력
- 세심함, 꼼꼼함, 디테일
- 기억력, 암기력, 정보정리
- 리더십, 주도성, 이끌어가기
- 분석력, 논리력, 문제해결
- 인내심, 끈기, 포기안함

응답 형식:
모든 강점에서 생성된 키워드들을 **중복 제거**하고 **가장 대표적인 키워드들**만 선별하여 배열로 반환해주세요.
최종적으로 **최소 3개 이상, 최대 8개 정도**의 키워드를 JSON 배열 형태로 제공해주세요.

예: ["집중력", "창의성", "공감능력", "세심함", "리더십"]`;

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
            content: '당신은 사람의 강점을 분석하여 핵심 키워드를 추출하는 전문가입니다. 사용자가 제공한 강점 정보를 바탕으로 실용적이고 구체적인 키워드를 생성합니다. 항상 JSON 배열 형태로 응답하며, 키워드는 1-3단어로 구성합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
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
      const keywords = JSON.parse(content);
      
      if (Array.isArray(keywords) && keywords.length >= 3) {
        res.status(200).json({ keywords });
      } else {
        // 배열이 아니거나 키워드가 부족한 경우 기본값 제공
        throw new Error('Invalid keywords format');
      }
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 키워드 생성 로직
      const fallbackKeywords = generateFallbackKeywords(strengthItems);
      res.status(200).json({ keywords: fallbackKeywords });
    }

  } catch (error) {
    console.error('Error generating strength keywords:', error);
    
    // 에러 시 기본 키워드 반환
    const fallbackKeywords = generateFallbackKeywords(req.body.strengthItems || []);
    res.status(200).json({ keywords: fallbackKeywords });
  }
}

// 기본 키워드 생성 함수 (기존 로직 개선)
function generateFallbackKeywords(strengthItems: StrengthItem[]): string[] {
  const keywordMap: { [key: string]: string[] } = {
    '집중': ['집중력', '몰입력', '지속력'],
    '창의': ['창의성', '아이디어', '독창성'],
    '공감': ['공감능력', '마음읽기', '소통력'],
    '디테일': ['세심함', '꼼꼼함', '정확성'],
    '기억': ['기억력', '암기력', '정보정리'],
    '지도': ['공간인식', '방향감각', '길찾기'],
    '센서': ['직감', '감지력', '눈치'],
    '수학': ['논리력', '계산력', '분석력'],
    '원칙': ['체계성', '규칙성', '일관성'],
    '뒤집기': ['유연성', '전환력', '적응력'],
    '인싸': ['사교성', '친화력', '소통력'],
    '끈기': ['끈기', '인내심', '지속력'],
    '컴퓨터': ['IT능력', '기술력', '디지털'],
    '독서': ['학습력', '이해력', '독해력'],
    '글': ['문장력', '표현력', '작문력'],
    '엉뚱': ['독창성', '창의성', '참신함'],
    '완벽': ['완벽주의', '정확성', '꼼꼼함'],
    '주도': ['리더십', '주도성', '이끌기'],
    '설명': ['설명력', '전달력', '소통력'],
    '약속': ['신뢰성', '책임감', '약속이행'],
    '인내': ['인내심', '참을성', '끈기']
  };

  const allKeywords: string[] = [];
  
  strengthItems.forEach(item => {
    const text = item.text + ' ' + (item.strengthDescription || '') + ' ' + (item.strengthApplication || '');
    
    Object.keys(keywordMap).forEach(key => {
      if (text.includes(key)) {
        allKeywords.push(...keywordMap[key]);
      }
    });
  });

  // 중복 제거 및 최소 3개 보장
  const uniqueKeywords = [...new Set(allKeywords)];
  
  if (uniqueKeywords.length < 3) {
    // 기본 키워드 추가
    uniqueKeywords.push('강점', '능력', '특성');
  }

  return uniqueKeywords.slice(0, 8); // 최대 8개로 제한
}