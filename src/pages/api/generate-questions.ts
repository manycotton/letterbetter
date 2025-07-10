import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { highlightedTexts, userInput } = req.body;

    if (!highlightedTexts || !Array.isArray(highlightedTexts)) {
      return res.status(400).json({ message: 'highlightedTexts is required and must be an array' });
    }

    const context = highlightedTexts.join('\n\n');
    
    let prompt;
    if (userInput) {
      // 사용자 설명이 있는 경우 - 더 깊은 질문 생성
      prompt = `다음은 누군가가 쓴 편지에서 하이라이트한 내용과 사용자의 생각입니다:

하이라이트한 내용:
${context}

사용자가 이 부분을 중요하게 생각하는 이유:
${userInput}

사용자가 이 부분을 왜 중요하게 생각했는지에 대한 통찰을 바탕으로, 편지 작성자의 심리와 상황을 더 깊이 탐구할 수 있는 질문 3개를 추천해주세요.

질문은 다음과 같은 특징을 가져야 합니다:
- 사용자의 관점과 통찰을 바탕으로 한 깊이 있는 질문
- 편지 작성자의 내면과 감정을 세밀하게 이해할 수 있는 질문
- 공감적이고 따뜻한 어조
- 구체적이고 실용적인 답변을 유도할 수 있는 질문
- 각 질문은 50자 이내

JSON 형식으로 응답해주세요:
{
  "questions": [
    "질문 1",
    "질문 2", 
    "질문 3"
  ]
}`;
    } else {
      // 사용자 설명이 없는 경우 - 기본 질문 생성
      prompt = `다음은 누군가가 쓴 편지에서 하이라이트한 내용들입니다:

${context}

이 편지를 쓴 사람이 누구인지, 어떤 어려움을 겪고 있고, 어떤 상황에 처해있는지를 깊이 이해할 수 있도록 도와주는 질문 3개를 추천해주세요. 

질문은 다음과 같은 특징을 가져야 합니다:
- 편지 작성자의 감정과 상황을 깊이 이해할 수 있는 질문
- 공감적이고 따뜻한 어조
- 구체적이고 실용적인 답변을 유도할 수 있는 질문
- 각 질문은 50자 이내

JSON 형식으로 응답해주세요:
{
  "questions": [
    "질문 1",
    "질문 2", 
    "질문 3"
  ]
}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 편지를 통해 사람들의 마음을 깊이 이해하고 공감할 수 있는 질문을 만드는 전문가입니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    
    if (!response) {
      console.error('Empty response from OpenAI');
      return res.status(500).json({ message: 'Empty response from OpenAI' });
    }
    
    try {
      // OpenAI가 코드 블록으로 JSON을 감쌀 수 있으므로 이를 제거
      let cleanedResponse = response;
      if (response.includes('```json')) {
        cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const parsedResponse = JSON.parse(cleanedResponse);
      res.status(200).json(parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response was:', response);
      res.status(500).json({ message: 'Failed to parse AI response', rawResponse: response });
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}