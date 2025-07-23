import { NextApiRequest, NextApiResponse } from 'next';

interface StrengthItem {
  id: string;
  text: string;
  color: string;
  paragraphIndex: number;
  strengthDescription?: string;
  strengthApplication?: string;
}

// 부정적인 키워드 필터링 함수
function filterNegativeKeywords(keywords: string[]): string[] {
  const negativePatterns = [
    // 핵심 부정적 표현들
    /어려움|부족|없음|못함|안됨|실패|문제|약점|단점|한계|제한|결함|불가능|힘듦|서투름|미숙|부진|저조|악화|나쁨|좋지않음|부정적|소극적|수동적|불안정|혼란|걱정|두려움|포기|중단|실수|잘못|틀림|오류|에러|늦음|지연|미루기|게으름|나태|무기력|의욕없음|흥미없음|지루함|따분함|싫음|혐오|거부|반대|저항|갈등|대립|마찰|충돌|우울|슬픔|절망|실망|후회|허무|공허|외로움|고립|소외|무시|배제|차별|편견|오해|착각|막막|막힘|정체|답답|갑갑|억압|압제|통제|제약|금지|규제|처벌|징계|문책|부담|압력|스트레스|불안|초조|조급|성급|바쁨|분주|엉망|난잡|지저분|더러움|추함|못생김|흉함|불규칙|불일치|불균형|부조화|불화|모순|역설|딜레마|난관|장애|방해|걸림|논란|의견|거절|부인|부정|아니|불가|결핍|결여|빠짐|누락|소홀|방치|무관심|간과|놓침|버그|오작동|분쟁|트러블|사고|위험|위기|곤란|곤경|고민|과부하|피로|지침|탈진|번아웃|아쉬움|질식|짐|무게|신경|변함|변화|무질서|딜레마|이슈|쟁점/,
    // 구체적인 부정적 표현들
    /집중력\s*부족|소통\s*어려움|의욕\s*없음|능력\s*부족|실력\s*부족|기술\s*부족|경험\s*부족|지식\s*부족|정보\s*부족|시간\s*부족|자원\s*부족|예산\s*부족|인력\s*부족|공간\s*부족|장비\s*부족|도구\s*부족|환경\s*부족|조건\s*부족|기회\s*부족|운\s*부족|체력\s*부족|힘\s*부족|에너지\s*부족|동기\s*부족|동력\s*부족|추진력\s*부족|실행력\s*부족|행동력\s*부족|결단력\s*부족|판단력\s*부족|분석력\s*부족|사고력\s*부족|창의력\s*부족|상상력\s*부족|아이디어\s*부족|영감\s*부족|감성\s*부족|감정\s*부족|공감\s*부족|이해\s*부족|소통\s*부족|대화\s*부족|교류\s*부족|관계\s*부족|네트워킹\s*부족|인맥\s*부족|코넥션\s*부족|연결\s*부족|유대\s*부족|신뢰\s*부족|믿음\s*부족|확신\s*부족|자신감\s*부족|자존감\s*부족|자아\s*부족|정체성\s*부족|개성\s*부족|특성\s*부족|개별성\s*부족|독창성\s*부족|참신함\s*부족|새로움\s*부족|혁신\s*부족|변화\s*부족|발전\s*부족|성장\s*부족|진보\s*부족|향상\s*부족|개선\s*부족|발달\s*부족|완성\s*부족|완료\s*부족|마무리\s*부족|결과\s*부족|성과\s*부족|성취\s*부족|달성\s*부족|완수\s*부족|수행\s*부족|실행\s*부족|실현\s*부족|구현\s*부족|적용\s*부족|활용\s*부족|이용\s*부족|사용\s*부족|운용\s*부족|조작\s*부족|다루기\s*부족|처리\s*부족|관리\s*부족|운영\s*부족|경영\s*부족|리더십\s*부족|지도력\s*부족|통솔력\s*부족|조직력\s*부족|기획력\s*부족|계획\s*부족|전략\s*부족|방향\s*부족|목표\s*부족|비전\s*부족|꿈\s*부족|희망\s*부족|의지\s*부족|각오\s*부족|결심\s*부족|다짐\s*부족|약속\s*부족/
  ];
  
  return keywords.filter(keyword => {
    const normalizedKeyword = keyword.toLowerCase().trim();
    return !negativePatterns.some(pattern => pattern.test(normalizedKeyword));
  });
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

이 정보들을 종합하여 각 강점을 대표할 수 있는 **이해하기 쉬운 강점 키워드**를 생성해주세요.

강점 정보:
${strengthItems.map((item: StrengthItem, index: number) => `
${index + 1}. 하이라이트된 본문: "${item.text}"
   강점 설명: "${item.strengthDescription || '없음'}"
   활용 상황: "${item.strengthApplication || '없음'}"
`).join('\n')}

**키워드 생성 규칙:**
1. **각 강점당 1-2개의 명확한 키워드** 생성
2. **2-4단어**로 구성된 이해하기 쉬운 키워드
3. **구체적이고 직관적인** 키워드 (누구나 바로 이해할 수 있는 표현)
4. **해당 강점이 무엇인지 명확하게 알 수 있는** 키워드
5. **일상적이고 친근한 표현** 사용
6. **⚠️ 중요: 부정적인 특성이나 약점은 절대 포함하지 마세요** (예: "소통 어려움", "집중력 부족", "의욕 없음" 등)

**좋은 키워드 예시:**
- "깊게 집중하는 능력", "끝까지 몰입하기"
- "새로운 아이디어 내기", "창의적으로 생각하기"  
- "다른 사람 마음 읽기", "공감하고 소통하기"
- "세세한 부분 챙기기", "꼼꼼히 확인하기"
- "중요한 것 기억하기", "정보를 잘 정리하기"
- "팀을 이끌어가기", "앞장서서 해결하기"
- "문제를 분석하기", "논리적으로 판단하기"
- "끝까지 포기 안하기", "꾸준히 노력하기"

**피해야 할 키워드:**
- 너무 추상적인 단어 (예: "능력", "역량", "특성")
- 전문용어나 어려운 단어
- 의미가 불분명한 단어
- **부정적인 특성이나 약점** (예: "소통 어려움", "집중력 부족", "의욕 없음", "실수하기", "게으름" 등)

응답 형식:
모든 강점에서 생성된 키워드들을 **중복 제거**하고 **가장 이해하기 쉽고 구체적인 키워드들**만 선별하여 배열로 반환해주세요.
최종적으로 **최소 3개 이상, 최대 8개 정도**의 키워드를 JSON 배열 형태로 제공해주세요.

예: ["깊게 집중하는 능력", "새로운 아이디어 내기", "다른 사람 마음 읽기", "세세한 부분 챙기기", "팀을 이끌어가기"]`;

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
            content: '당신은 사람의 강점을 분석하여 핵심 키워드를 추출하는 전문가입니다. 사용자가 제공한 강점 정보를 바탕으로 실용적이고 구체적인 키워드를 생성합니다. 항상 JSON 배열 형태로 응답하며, 키워드는 1-3단어로 구성합니다. ⚠️ 중요: 부정적인 특성이나 약점(소통 어려움, 집중력 부족 등)은 절대 포함하지 마세요.'
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
        // 부정적인 키워드 필터링
        const filteredKeywords = filterNegativeKeywords(keywords);
        res.status(200).json({ keywords: filteredKeywords });
      } else {
        // 배열이 아니거나 키워드가 부족한 경우 기본값 제공
        throw new Error('Invalid keywords format');
      }
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 키워드 생성 로직
      const fallbackKeywords = generateFallbackKeywords(strengthItems);
      const filteredFallbackKeywords = filterNegativeKeywords(fallbackKeywords);
      res.status(200).json({ keywords: filteredFallbackKeywords });
    }

  } catch (error) {
    console.error('Error generating strength keywords:', error);
    
    // 에러 시 기본 키워드 반환
    const fallbackKeywords = generateFallbackKeywords(req.body.strengthItems || []);
    const filteredFallbackKeywords = filterNegativeKeywords(fallbackKeywords);
    res.status(200).json({ keywords: filteredFallbackKeywords });
  }
}

// 기본 키워드 생성 함수 (이해하기 쉬운 키워드로 개선)
function generateFallbackKeywords(strengthItems: StrengthItem[]): string[] {
  const keywordMap: { [key: string]: string[] } = {
    '집중': ['깊게 집중하는 능력', '끝까지 몰입하기', '한 가지에 집중하기'],
    '창의': ['새로운 아이디어 내기', '창의적으로 생각하기', '참신한 방법 찾기'],
    '공감': ['다른 사람 마음 읽기', '공감하고 소통하기', '감정을 잘 이해하기'],
    '디테일': ['세세한 부분 챙기기', '꼼꼼히 확인하기', '실수 없이 정확하게'],
    '기억': ['중요한 것 기억하기', '정보를 잘 정리하기', '필요할 때 떠올리기'],
    '지도': ['길을 잘 찾기', '공간감각 뛰어나기', '방향감각 좋기'],
    '센서': ['직감이 뛰어나기', '눈치가 빠르기', '상황을 빨리 파악하기'],
    '수학': ['논리적으로 판단하기', '계산을 잘 하기', '문제를 체계적으로 분석하기'],
    '원칙': ['규칙을 잘 지키기', '일관성 있게 행동하기', '체계적으로 일하기'],
    '뒤집기': ['유연하게 생각하기', '상황에 잘 적응하기', '관점을 바꿔 보기'],
    '인싸': ['사람들과 잘 어울리기', '친근하게 다가가기', '관계 맺기를 잘하기'],
    '끈기': ['끝까지 포기 안하기', '꾸준히 노력하기', '어려움을 견디기'],
    '컴퓨터': ['디지털 기기 잘 다루기', '기술을 빠르게 배우기', 'IT 감각 뛰어나기'],
    '독서': ['글을 잘 이해하기', '빠르게 학습하기', '독해력 뛰어나기'],
    '글': ['글로 표현하기', '문장을 잘 쓰기', '생각을 글로 정리하기'],
    '엉뚱': ['독특하게 생각하기', '남다른 아이디어 내기', '참신한 관점 갖기'],
    '완벽': ['완벽하게 마무리하기', '정확하게 처리하기', '실수 없이 완성하기'],
    '주도': ['팀을 이끌어가기', '앞장서서 해결하기', '주도적으로 행동하기'],
    '설명': ['쉽게 설명하기', '명확하게 전달하기', '이해하기 쉽게 말하기'],
    '약속': ['약속을 꼭 지키기', '신뢰할 수 있기', '책임감 있게 행동하기'],
    '인내': ['참을성 있게 기다리기', '조급해하지 않기', '차근차근 진행하기']
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
    uniqueKeywords.push('문제를 해결하는 능력', '끝까지 해내는 힘', '새로운 시도를 하는 용기');
  }

  return uniqueKeywords.slice(0, 8); // 최대 8개로 제한
}