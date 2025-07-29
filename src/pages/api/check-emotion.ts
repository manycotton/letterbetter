import { NextApiRequest, NextApiResponse } from 'next';
import { updateReflectionItem } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { reflectionContent, originalLetter, reflectionId, sessionId } = req.body;

    const prompt = `Text to analyze: "${reflectionContent}"

Does this text contain explicit emotion words? Check if ANY of these emotion words are present:

Emotion words: 속상, 좌절, 불안, 화, 걱정, 실망, 부끄러, 당황, 우울, 스트레스, 분노, 슬픔, 죄책감

NOT emotion words: 집중, 피해, 실수, 어려움, 힘들, 효율, 문제, 막막

Example:
- "회사에서 집중을 못해서 남한테 피해를 줌" → hasEmotion: false
- "회사에서 집중을 못해서 스트레스를 받음" → hasEmotion: true

Response format (JSON):
{"hasEmotion": true/false, "suggestion": "suggestion text"}`;

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
            content: 'You are an emotion detection expert. Only return hasEmotion: true if the text contains explicit Korean emotion words. Be very strict.'
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
      const result = JSON.parse(content);
      
      // 데이터베이스에 emotionCheckResult 업데이트
      if (reflectionId && sessionId) {
        try {
          await updateReflectionItem(reflectionId, sessionId, {
            emotionCheckResult: result
          });
        } catch (dbError) {
          console.error('Error updating emotion check result in database:', dbError);
          // DB 업데이트 실패해도 결과는 반환
        }
      }
      
      res.status(200).json(result);
    } catch (parseError) {
      // JSON 파싱 실패 시 기본값 반환
      const fallbackResult = {
        hasEmotion: false,
        suggestion: "이 상황에서 양양이 어떤 감정을 느꼈을지 생각해보고 추가해보세요. 예: '이런 상황에서 나는 좌절감을 느꼈다' 또는 '이로 인해 불안하고 걱정스러웠다'"
      };
      
      // 데이터베이스에 fallback 결과 업데이트
      if (reflectionId && sessionId) {
        try {
          await updateReflectionItem(reflectionId, sessionId, {
            emotionCheckResult: fallbackResult
          });
        } catch (dbError) {
          console.error('Error updating fallback emotion check result in database:', dbError);
        }
      }
      
      res.status(200).json(fallbackResult);
    }

  } catch (error) {
    console.error('Error checking emotion:', error);
    
    // 에러 시 기본값 반환
    const errorResult = {
      hasEmotion: false,
      suggestion: "이 상황에서 양양이 어떤 감정을 느꼈을지 생각해보고 추가해보세요."
    };
    
    // 데이터베이스에 에러 결과 업데이트
    if (reflectionId && sessionId) {
      try {
        await updateReflectionItem(reflectionId, sessionId, {
          emotionCheckResult: errorResult
        });
      } catch (dbError) {
        console.error('Error updating error emotion check result in database:', dbError);
      }
    }
    
    res.status(200).json(errorResult);
  }
}