import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { saveReflectionSupportKeywords } from '../../../lib/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { characterName, highlightedData, letterContent, userId } = req.body;

    if (!characterName || !highlightedData || !Array.isArray(highlightedData)) {
      return res.status(400).json({ message: 'Required data is missing' });
    }

    // 하이라이트된 데이터 정리
    const highlightSummary = highlightedData.map((item, index) => {
      let summary = `${index + 1}. 하이라이트된 텍스트: "${item.text}"`;
      if (item.problemReason) {
        summary += `\n   고민이라고 생각한 이유: ${item.problemReason}`;
      }
      if (item.userExplanation) {
        summary += `\n   사용자 공감/경험: ${item.userExplanation}`;
      }
      if (item.emotionInference) {
        summary += `\n   유추한 감정: ${item.emotionInference}`;
      }
      return summary;
    }).join('\n\n');

    const prompt = `
다음은 사용자가 ${characterName}의 편지를 읽고 1단계에서 분석한 내용입니다:

${highlightSummary}

위 분석 내용을 바탕으로, 사용자의 모든 입력(고민 이유 + 공감/경험 + 감정 유추)을 종합하여 ${characterName}의 핵심 고민을 나타내는 짧은 키워드/구문을 5-7개 생성해주세요.

**생성 원칙:**
- 사용자가 분석한 "고민이라고 생각한 이유"를 우선적으로 반영
- 사용자가 하이라이트한 부분에서 드러나는 구체적인 문제상황
- 사용자가 작성한 공감 내용과 경험을 반영
- 사용자가 유추한 ${characterName}의 감정상태 포함
- 각 힌트는 8-12자의 짧은 구문으로 구성
- ${characterName}의 관점에서 표현

다음과 같은 형식으로 힌트만 반환해주세요:
"업무 집중 어려움"
"동료 눈치에 위축감" 
"실수로 인한 자책감"
"혼란스러운 우선순위"
"완벽해야 한다는 압박"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 사용자의 고민 정리를 돕는 전문가입니다. 하이라이트된 내용과 사용자 분석을 바탕으로 유용한 키워드를 생성합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const hintsText = completion.choices[0].message.content;
    console.log('GPT Response:', hintsText); // 디버깅용 로그
    
    // 응답에서 힌트 배열 추출 (개선된 파싱)
    let hints: string[] = [];
    if (hintsText) {
      // 먼저 따옴표로 감싸진 텍스트들을 추출
      const quotedMatches = hintsText.match(/"([^"]+)"/g);
      if (quotedMatches && quotedMatches.length > 0) {
        hints = quotedMatches.map(match => match.replace(/"/g, '').trim());
      } else {
        // 따옴표가 없으면 줄 단위로 분리하여 처리
        const lines = hintsText.split('\n').filter(line => line.trim());
        hints = lines.map(line => {
          // 번호, 불릿포인트, 특수문자 제거
          return line.replace(/^\d+\.\s*/, '')
                    .replace(/^[-•*]\s*/, '')
                    .replace(/^[가-힣]+\.\s*/, '') // 한글 번호 제거
                    .replace(/[\[\]]/g, '') // 대괄호 제거
                    .trim();
        }).filter(hint => hint.length > 2 && hint.length < 50); // 길이 조건 완화
      }
    }

    console.log('Parsed hints:', hints); // 디버깅용 로그

    // 기본 힌트가 없으면 제공
    if (hints.length === 0) {
      hints = [
        '집중력 부족으로 인한 어려움',
        '업무 효율성 문제',
        '동료와의 관계 걱정',
        '자신감 하락',
        '우선순위 설정의 어려움'
      ];
    }

    // 키워드를 데이터베이스에 저장 (userId가 있는 경우에만)
    if (userId && hints.length > 0) {
      try {
        await saveReflectionSupportKeywords(userId, hints.slice(0, 7));
        console.log('Keywords saved to database for user:', userId);
      } catch (saveError) {
        console.error('Error saving keywords to database:', saveError);
        // 키워드 저장 실패해도 응답은 성공으로 처리
      }
    }

    res.status(200).json({
      success: true,
      hints: hints.slice(0, 7) // 최대 7개까지
    });

  } catch (error) {
    console.error('Error generating reflection hints:', error);
    res.status(500).json({ 
      message: 'Failed to generate reflection hints',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}