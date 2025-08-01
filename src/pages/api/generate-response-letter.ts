import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userNickname,
      characterName,
      originalLetter,
      userIntroduction,
      reflectionItems,
      strengthItems
    } = req.body;

    // 고민과 해결책을 정리
    const problemSolutions = reflectionItems.map((item: any) => {
      const solutions = item.solutionInputs?.map((solution: any) => solution.content).filter(Boolean) || [];
      return {
        problem: item.content,
        solutions: solutions
      };
    }).filter((item: any) => item.problem && item.solutions.length > 0);

    // 강점 정보 정리
    const userStrengths = strengthItems?.map((item: any) => item.text).filter(Boolean) || [];

    const prompt = `
당신은 따뜻하고 공감적인 사람으로서 어려움을 겪고 있는 편지 화자에게 진정성 있는 답장을 작성해주세요.

**편지 화자**: ${characterName}
**답장 작성자 정보**: ${userIntroduction || '평범한 사람'}
**답장 작성자의 강점들**: ${userStrengths.length > 0 ? userStrengths.join(', ') : '없음'}

**원본 편지 내용**:
${originalLetter}

**작성자가 정리한 고민과 해결책들**:
${problemSolutions.map((item: any, index: number) => `
${index + 1}. 고민: ${item.problem}
   해결책: ${item.solutions.join(', ')}
`).join('\n')}

다음 구조로 답장을 작성해주세요:

1. **친근한 자기소개**: 
   - 답장 작성자의 정보를 바탕으로 자연스럽고 친근한 자기소개
   - "상담사"라는 용어는 사용하지 말고, 일반인으로서 따뜻하게 소개
   - "여러분"이 아닌 "${characterName}"님께 직접 말하는 형태로 작성

2. **편지를 받은 소감**: 편지를 받고 느낀 점, 답장하게 된 마음

3. **고민별 공감과 조언**: 각 고민에 대해 한 문단씩
   - 그 상황에서 느꼈을 감정에 대한 깊은 공감
   - 작성자가 제시한 해결책을 바탕으로 한 구체적이고 실행 가능한 조언

4. **격려와 마무리**: 용기내어 편지 보내준 것에 대한 감사, 도움이 되길 바라는 마음

**작성 가이드라인**:
- 따뜻하고 진정성 있는 어조로 작성
- "상담사", "전문가" 등의 용어 사용 금지
- 일반인이 친구나 지인에게 진심어린 조언을 하는 형태
- "${characterName}"님께 직접 말하는 형태 (2인칭 단수)
- "여러분", "당신들" 등 복수형 표현 금지
- 한국어 존댓말 사용
- 편지 형식으로 자연스럽게 작성
- 각 문단은 적절한 길이로 구성
- 날짜나 서명("○○ 드림" 등)은 포함하지 말 것
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 따뜻하고 공감적인 상담사로서 진정성 있는 답장을 작성합니다."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('AI 응답을 생성할 수 없습니다.');
    }

    res.status(200).json({
      success: true,
      letter: responseContent,
      metadata: {
        userNickname,
        characterName,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating response letter:', error);
    res.status(500).json({
      error: '답장 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
}