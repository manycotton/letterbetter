import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { highlightedTexts, userAnswers, userExplanations, currentReflection } = req.body;

    // 모든 텍스트를 하나로 합치기
    const allTexts = [
      ...(highlightedTexts || []),
      ...(userAnswers || []),
      ...(userExplanations || []),
      ...(currentReflection ? [currentReflection] : [])
    ].filter(text => text && text.trim()).join(' ');

    const prompt = `다음은 사용자가 편지에서 하이라이트한 내용과 질문에 대한 답변${currentReflection ? ', 그리고 현재 작성 중인 고민' : ''}입니다:

${allTexts}

이 내용을 바탕으로 사용자가 고민을 정리할 때 도움이 될 수 있는 2-3단어 키워드를 8-10개 정도 추출해주세요. 
${currentReflection ? '특히 현재 작성 중인 고민과 연관성이 높고 이어나갈 수 있는 키워드를 포함해주세요.' : ''}
키워드는 구체적이고 실용적이어야 하며, 사용자가 자신의 상황을 표현하는 데 도움이 되어야 합니다. 
키워드는 중학생이 이해할 수 있도록 단순하고 쉬운 단어를 사용해야 합니다.

응답은 다음 형식으로 해주세요:
집중력 부족, 업무 효율성, 동료 관계, 자신감 하락, 우선순위 설정, 시간 관리, 스트레스 관리, 의사소통`;

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
            content: '당신은 심리 상담 도우미입니다. 사용자의 텍스트를 분석하여 고민 정리에 도움이 되는 키워드를 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const keywordsText = data.choices[0]?.message?.content?.trim();
    
    // 키워드를 배열로 변환
    const keywords = keywordsText
      ? keywordsText.split(',').map((keyword: string) => keyword.trim()).filter((keyword: string) => keyword)
      : ['집중력 부족', '업무 효율성', '동료 관계', '자신감 하락', '우선순위 설정'];

    res.status(200).json({ keywords });

  } catch (error) {
    console.error('Error generating keywords:', error);
    
    // 에러 시 기본 키워드 반환
    const defaultKeywords = [
      '집중력 부족', '업무 효율성', '동료 관계', 
      '자신감 하락', '우선순위 설정', '시간 관리',
      '스트레스 관리', '의사소통', '자기 성찰', '목표 설정'
    ];
    
    res.status(200).json({ keywords: defaultKeywords });
  }
}