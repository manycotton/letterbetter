import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { reflectionContent } = req.body;

    const prompt = `다음은 사용자가 작성한 고민 내용입니다:

${reflectionContent}

이 고민 내용을 2-3단어로 간단히 요약해주세요. 핵심 상황이나 문제를 나타내는 명사구 형태로 작성해주세요.

예시:
- "업무 집중 어려움"
- "동료와의 갈등"
- "자신감 부족"
- "시간 관리 실패"

JSON 형태로 다음과 같이 응답해주세요:
{"summary": "요약 내용"}`;

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
            content: '당신은 텍스트 요약 전문가입니다. 주어진 텍스트의 핵심을 2-3단어로 간결하게 요약합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.3,
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
        summary: "이 상황"
      });
    }

  } catch (error) {
    console.error('Error summarizing situation:', error);
    
    // 에러 시 기본값 반환
    res.status(200).json({
      summary: "이 상황"
    });
  }
}