import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { saveGeneratedLetter, saveStrengthAnalysisLog, getQuestionAnswers } from '../../../lib/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ND_STRENGTHS = [
  { id: 1, name: "💪 운동 능력자", description: "You are uniquely physically active or fit in ways that you attribute to your neurodivergence" },
  { id: 2, name: "💡 창의력 폭발", description: "Your innovative approach to fostering ideas is a result of your neuroexceptional cognitive style" },
  { id: 3, name: "❤️ 공감 천재", description: "You have a uniquely deep emotional understanding of others that you attribute to your neurodivergence" },
  { id: 4, name: "🔍 매의 눈 디테일", description: "You recognize patterns or small details as a result of your neuroexceptional cognitive style" },
  { id: 5, name: "🧠 정보 기억 능력자", description: "You are great at remembering particular types of information as a result of your neuroexceptional cognitive style" },
  { id: 6, name: "🗺️ 머릿속 지도 앱", description: "You can quickly understand maps or visualize how things are arranged in physical space as a result of your neuroexceptional cognitive style" },
  { id: 7, name: "📡 마음 읽는 센서", description: "Your neurodivergence gives you a uniquely strong awareness of how others might be feeling that you demonstrate in interpersonal interactions" },
  { id: 8, name: "🎯 초집중 모드 ON", description: "Your neurodivergence allows you to devote your undivided attention on particular types of tasks for long periods of time at high efficiency" },
  { id: 9, name: "📸 눈으로 찍는 사진 기억", description: "You can reliably recall information and detail after seeing it visually in a way that you attribute to your neurodivergence" },
  { id: 10, name: "🔢 수학 천재", description: "You can quickly solve math problems and work with numbers in your head as a result of your neuroexceptional cognitive style" },
  { id: 11, name: "📋 원칙대로 FM", description: "Your neurodivergence allows you to consistently and reliably perform repetitive series of tasks" },
  { id: 12, name: "🔄 생각 뒤집기 천재", description: "Your neurodivergence allows you to quickly find innovative or unorthodox solutions that others may not think of to solve problems at hand" },
  { id: 13, name: "🌟 인싸력 폭발! 인기쟁이", description: "You identify as a people person with very strong interpersonal skills that you attribute to your neurodivergence" },
  { id: 14, name: "🔥 포기란 없다! 끈기 대장!", description: "Your neurodivergence gives you a high level of determination, resilience, or perseverance that allows you to follow through on completing challenging tasks" },
  { id: 15, name: "💻 컴퓨터/IT 마스터!", description: "Due to your neurodivergence, you are able to pick up and learn new technologies very quickly" },
  { id: 16, name: "📚 책벌레 독서왕", description: "You are uniquely able to quickly read and understand written material as a result of your neurodivergence" },
  { id: 17, name: "✍️ 술술 말솜씨", description: "Due to your neurodivergence, you are uniquely able to convey ideas using written language in an eloquent and engaging way" },
  { id: 18, name: "💭 엉뚱 발상 해결사", description: "Your neurodivergence enables you to approach problems from unusual angles, generating creative and indirect solutions that others might overlook" },
  { id: 19, name: "📊 단계별 완벽 실행", description: "Your neurodivergence provides you with a natural inclination to follow structured procedures and systems, ensuring tasks are completed efficiently and accurately" },
  { id: 20, name: "🚀 알아서 척척! 주도왕", description: "Your neurodivergence fosters an intrinsic motivation and initiative, allowing you to independently begin and complete tasks without external prompting" },
  { id: 21, name: "🎙️ 명쾌한 설명가", description: "Your neurodivergence equips you with a unique ability to articulate complex ideas clearly and understandably, making it easy for others to grasp new concepts" },
  { id: 22, name: "🤝 약속은 철저히! 믿음직맨", description: "Your neurodivergence contributes to your consistent dependability and trustworthiness, ensuring you meet commitments and follow through on responsibilities" },
  { id: 23, name: "⏰ 기다림의 미학! 인내심 킹", description: "Your neurodivergence grants you an exceptional capacity for tolerance and understanding, enabling you to remain calm and persistent in challenging or slow-paced situations" }
];

interface UserAnswers {
  answers: string[]; // 모든 답변 배열
}

interface GeneratedLetter {
  characterName: string;
  age: number;
  occupation: string;
  letterContent: string[];
  usedStrengths: string[];
}

// 동물 캐릭터 이름 목록 (특이하고 귀여운 이름들)
const ANIMAL_CHARACTERS = [
  "푸딩이", "마카롱", "츄츄", "뽀글이", "몰랑이", "꼬물이", "와플", "젤리",
  "쫀득이", "포롱이", "찹쌀이", "띠용이", "곰탱이", "솜뭉치", "까꿍이", "뽁뽁이",
  "말랑이", "폭신이", "토실이", "망고", "꿀떡이", "뚜뚜", "동글이", "통통이"
];

// 동물 직업 목록
const ANIMAL_OCCUPATIONS = [
  "숲속 도서관 사서", "구름 연구원", "꽃밭 디자이너", "별빛 상담사", 
  "바람 배달부", "나무 의사", "꿀벌 통역사", "새소리 음악가",
  "모래성 건축가", "물방울 과학자", "무지개 화가", "씨앗 재배사",
  "계절 안내원", "숲속 요리사", "돌멩이 수집가", "구름 조각가"
];

// 사용자 일반 강점을 AI가 분석하여 카테고리화하는 함수
async function categorizeUserStrengths(generalContent: string): Promise<{existingCategories: string[], newCategories: string[]}> {
  if (!generalContent.trim()) return {existingCategories: [], newCategories: []};
  
  const categorizationPrompt = `
다음 사용자가 작성한 강점 텍스트를 분석해주세요:

**사용자 강점 텍스트:**
${generalContent}

**기존 23개 강점 카테고리:**
1. 💪 운동 능력자 - 신체적 활동이나 운동 능력
2. 💡 창의력 폭발 - 창의적 사고와 아이디어 생성
3. ❤️ 공감 천재 - 타인의 감정 이해와 공감 능력
4. 🔍 매의 눈 디테일 - 세부사항 관찰과 패턴 인식
5. 🧠 정보 기억 능력자 - 기억력과 정보 보존
6. 🗺️ 머릿속 지도 앱 - 공간 지각과 방향 감각
7. 📡 마음 읽는 센서 - 사회적 인식과 타인 감정 파악
8. 🎯 초집중 모드 ON - 집중력과 몰입 능력
9. 📸 눈으로 찍는 사진 기억 - 시각적 기억력
10. 🔢 수학 천재 - 수학적 계산과 논리 능력
11. 📋 원칙대로 FM - 체계적이고 규칙적인 실행
12. 🔄 생각 뒤집기 천재 - 문제해결과 창의적 접근
13. 🌟 인싸력 폭발! 인기쟁이 - 사회적 기술과 대인관계
14. 🔥 포기란 없다! 끈기 대장! - 끈기와 인내력
15. 💻 컴퓨터/IT 마스터! - 기술과 컴퓨터 활용
16. 📚 책벌레 독서왕 - 독서와 텍스트 이해
17. ✍️ 술술 말솜씨 - 글쓰기와 언어 능력
18. 💭 엉뚱 발상 해결사 - 창의적 문제해결
19. 📊 단계별 완벽 실행 - 체계적 업무 수행
20. 🚀 알아서 척척! 주도왕 - 주도성과 자발성
21. 🎙️ 명쾌한 설명가 - 설명과 의사소통 능력
22. 🤝 약속은 철저히! 믿음직맨 - 신뢰성과 책임감
23. ⏰ 기다림의 미학! 인내심 킹 - 인내심과 참을성

**분석 요청:**
1. 위 23개 카테고리 중 사용자 강점과 일치하는 것이 있다면 선택
2. 기존 카테고리로 분류할 수 없는 독특한 강점이 있다면 새로운 카테고리명 생성 (이모지 없이)

**출력 형식 (JSON):**
{
  "existing": ["기존 카테고리1", "기존 카테고리2"],
  "new": ["새로운 카테고리1", "새로운 카테고리2"]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 사용자의 강점을 분석하여 기존 카테고리에 매칭하거나 새로운 카테고리를 생성하는 전문가입니다. 반드시 JSON 형식으로 응답해주세요."
        },
        {
          role: "user",
          content: categorizationPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const result = completion.choices[0].message.content || '';
    try {
      const parsed = JSON.parse(result);
      return {
        existingCategories: parsed.existing || [],
        newCategories: parsed.new || []
      };
    } catch (parseError) {
      console.error('Error parsing categorization result:', parseError);
      return {existingCategories: ['💡 창의력 폭발'], newCategories: []};
    }
  } catch (error) {
    console.error('Error categorizing user strengths:', error);
    return {existingCategories: ['💡 창의력 폭발'], newCategories: []};
  }
}

// 사용자 강점 분석 함수
async function analyzeUserStrengths(strengthAnswer: string) {
  const userStrengths: { 
    tag?: string, 
    content: string, 
    isTagBased: boolean, 
    existingCategories?: string[], 
    newCategories?: string[] 
  }[] = [];
  
  // [태그명] 패턴으로 태그와 내용을 분리
  const parts = strengthAnswer.split(/\[([^\]]+)\]/);
  let generalContent = '';
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // 일반 텍스트 부분
      if (parts[i].trim() && i === 0) {
        generalContent = parts[i].trim();
      }
    } else {
      // 태그 부분
      const tag = parts[i];
      const content = (parts[i + 1] || '').trim();
      if (tag && content) {
        userStrengths.push({ tag, content, isTagBased: true });
      }
    }
  }
  
  // 일반 강점 텍스트가 있는 경우 AI로 카테고리화
  if (generalContent) {
    const categorization = await categorizeUserStrengths(generalContent);
    userStrengths.push({ 
      content: generalContent, 
      isTagBased: false, 
      existingCategories: categorization.existingCategories,
      newCategories: categorization.newCategories
    });
  }
  
  return userStrengths;
}

// 선택할 강점들을 결정하는 함수
function selectStrengthsForLetter(userStrengths: { 
  tag?: string, 
  content: string, 
  isTagBased: boolean, 
  existingCategories?: string[], 
  newCategories?: string[] 
}[]) {
  const selectedStrengths: any[] = [];
  
  // 태그 기반 강점들 추가
  const tagBasedStrengths = userStrengths.filter(s => s.isTagBased);
  tagBasedStrengths.forEach(userStrength => {
    const matchingStrength = ND_STRENGTHS.find(s => s.name === userStrength.tag);
    if (matchingStrength) {
      selectedStrengths.push({
        ...matchingStrength,
        userContent: userStrength.content,
        source: 'tag_based'
      });
    }
  });
  
  // 일반 강점들을 카테고리별로 추가
  const generalStrengths = userStrengths.filter(s => !s.isTagBased);
  generalStrengths.forEach(userStrength => {
    // 기존 카테고리들 추가
    if (userStrength.existingCategories && userStrength.existingCategories.length > 0) {
      userStrength.existingCategories.forEach(category => {
        const matchingStrength = ND_STRENGTHS.find(s => s.name === category);
        if (matchingStrength) {
          selectedStrengths.push({
            ...matchingStrength,
            userContent: userStrength.content,
            source: 'existing_category'
          });
        }
      });
    }
    
    // 새로운 카테고리들 추가
    if (userStrength.newCategories && userStrength.newCategories.length > 0) {
      userStrength.newCategories.forEach(newCategory => {
        selectedStrengths.push({
          name: newCategory,
          description: userStrength.content,
          userContent: userStrength.content,
          source: 'new_category'
        });
      });
    }
  });
  
  // 부족한 경우 랜덤으로 추가
  if (selectedStrengths.length < 3) {
    const usedTags = selectedStrengths.map(s => s.name);
    const availableStrengths = ND_STRENGTHS.filter(s => !usedTags.includes(s.name));
    const shuffled = [...availableStrengths].sort(() => 0.5 - Math.random());
    const needed = Math.min(5 - selectedStrengths.length, shuffled.length);
    shuffled.slice(0, needed).forEach(strength => {
      selectedStrengths.push({
        ...strength,
        source: 'random'
      });
    });
  }
  
  return selectedStrengths.slice(0, 5); // 최대 5개
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { answersId, userAnswers }: { answersId: string, userAnswers: UserAnswers } = req.body;

    if (!answersId || !userAnswers || !userAnswers.answers) {
      return res.status(400).json({ message: 'AnswersId and userAnswers are required' });
    }

    // 사용자 정보 가져오기
    const answersData = await getQuestionAnswers(answersId);
    if (!answersData) {
      return res.status(404).json({ message: 'Answers not found' });
    }

    // 사용자 강점 분석 (2번째 답변)
    const userStrengths = userAnswers.answers[1] ? await analyzeUserStrengths(userAnswers.answers[1]) : [];
    
    // 편지에 사용할 강점들 선택
    const selectedStrengths = selectStrengthsForLetter(userStrengths);

    // 강점 분석 로그 데이터 준비
    const userStrengthsAnalysis = {
      tagBasedStrengths: userStrengths
        .filter(s => s.isTagBased)
        .map(s => ({
          tag: s.tag!,
          content: s.content,
          source: 'tag_based' as const
        })),
      generalStrengthsCategorized: userStrengths
        .filter(s => !s.isTagBased)
        .map(s => ({
          originalContent: s.content,
          existingCategories: s.existingCategories || [],
          newCategories: s.newCategories || [],
          source: 'user_general' as const
        }))
    };

    // 강점 분석 로그 저장
    const strengthAnalysisLog = await saveStrengthAnalysisLog(
      answersId,
      answersData.userId,
      userStrengthsAnalysis,
      selectedStrengths
    );

    // 동물 캐릭터 정보 생성
    const characterName = ANIMAL_CHARACTERS[Math.floor(Math.random() * ANIMAL_CHARACTERS.length)];
    const age = Math.floor(Math.random() * 15) + 20; // 20-34세
    const occupation = ANIMAL_OCCUPATIONS[Math.floor(Math.random() * ANIMAL_OCCUPATIONS.length)];

    // 오늘 날짜 생성
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 강점 정보 포맷팅
    const strengthsInfo = selectedStrengths.map(s => {
      switch (s.source) {
        case 'tag_based':
          return `- ${s.name}: ${s.userContent} (사용자가 태그로 선택하고 구체적으로 설명한 경험)`;
        case 'existing_category':
          return `- ${s.name}: ${s.userContent} (사용자 일반 강점에서 기존 카테고리로 분류됨)`;
        case 'new_category':
          return `- ${s.name}: ${s.userContent} (사용자 일반 강점에서 새로운 카테고리로 생성됨)`;
        case 'random':
          return `- ${s.name}: ${s.description} (시스템에서 랜덤으로 추가된 강점)`;
        default:
          return `- ${s.name}: ${s.description || s.userContent}`;
      }
    }).join('\n');

    // GPT-4를 사용한 편지 생성
    const prompt = `
당신은 신경다양성을 가진 동물 캐릭터입니다. 사용자의 고민을 바탕으로 비슷한 경험을 하는 동물 세계의 이야기로 각색하여, 사용자에게 조언과 도움을 요청하는 편지를 작성해주세요.

**캐릭터 정보:**
- 이름: ${characterName}
- 나이: ${age}세
- 직업: ${occupation}
- 배경: ${userAnswers.answers[0] || '평범한 동물 친구'}를 동물 세계와 캐릭터 직업에 맞게 각색

**주요 고민 상황:**
사용자 고민: "${userAnswers.answers[2] || '일반적인 고민'}"에서 "${userAnswers.answers[3] || '구체적인 어려움'}"
→ 이를 ${occupation}인 ${characterName}의 동물 세계 상황으로 완전히 변환하여 각색

**편지에 포함할 강점들 (동물 세계 맥락으로 비유하여 표현):**
${strengthsInfo}

**비유적 각색 요구사항:**
- 사용자의 실제 상황을 동물 세계의 ${occupation} 직업 맥락으로 완전히 변환
- 인간 세계의 용어나 상황을 직접 언급하지 말고 동물 세계 용어로 대체
- 예: "회사" → "숲속 작업장", "상사" → "족장", "동료" → "무리 친구들"

**강점 표현의 핵심 원칙:**
- **절대로 강점 이름이나 강점 관련 단어를 직접 언급하지 말 것**
- 강점을 구체적인 행동, 습관, 특성으로만 자연스럽게 표현
- 예시:
  * "🤝 약속은 철저히! 믿음직맨" → "평소 다른 동물들과 약속한 일은 꼭 지키려고 노력하는 편이고"
  * "🎯 초집중 모드 ON" → "한 가지 일에 빠지면 주변 소리도 들리지 않을 정도로 몰두하곤 하는데"
  * "💡 창의력 폭발" → "새로운 방법을 생각해내는 걸 좋아해서"
- 강점을 캐릭터의 자연스러운 성격이나 버릇처럼 묘사

**편지 구성 (7문단):**
1. 인사말과 자기소개 - 강점 1개를 동물 특성으로 자연스럽게 표현 (3-4문장)
2. 동물 세계로 각색된 고민 상황 소개 - 강점 1개를 직업 관련 특성으로 표현 (4-5문장)
3. 고민으로 인한 구체적 일상 어려움 - 동물 사회의 구체적 사건들로 묘사, 강점 1개 표현 (4-6문장)
4. 동물 무리나 가족 관계에 미치는 영향을 구체적으로 묘사 - 강점 1개 표현 (4-5문장)
5. 추가적인 어려움이나 감정적 상태 묘사 - 강점 1개 표현 (3-4문장)
6. 절실한 도움 요청 - "어떻게 해야 할지 모르겠다" 등의 표현 (3-4문장)
7. 감사 인사와 기대감, 정중한 마무리 인사 (2-3문장)

**세부 작성 지침:**
- 각 문단을 충분히 길고 상세하게 작성 (총 편지 길이가 기존보다 1.5-2배 길어지도록)
- 구체적인 사건, 대화, 상황을 디테일하게 묘사
- 동물 세계의 생생한 장면과 에피소드를 포함
- 감정적인 표현과 내적 갈등을 풍부하게 서술
- ${occupation} 직업과 관련된 구체적인 업무 상황들을 상세히 묘사

**일관성 유지 필수 지침:**
- **전체 편지를 통해 하나의 일관된 캐릭터와 상황을 유지할 것**
- **${characterName}의 정체성과 ${occupation} 직업을 처음부터 끝까지 일관되게 유지**
- **동물 세계 설정을 편지 전체에서 흔들리지 않게 유지**
- **편지 중간에 다른 캐릭터나 다른 상황으로 바뀌지 않도록 주의**

**중요한 각색 지침:**
- 절대로 인간 세계의 직접적인 상황을 그대로 사용하지 말 것
- 동물의 본능과 특성을 활용한 자연스러운 비유로 변환
- ${occupation} 직업의 특성을 활용한 동물 세계 상황으로 구성
- 강점들을 문제 해결 도구가 아닌 캐릭터의 자연스러운 특성으로 표현
- 사용자가 자신의 이야기라고 절대 알 수 없을 정도로 완전히 각색
- 따뜻하고 진솔하며 절실한 톤으로 작성하되, 충분히 길고 구체적으로

**최종 확인사항:**
- 강점 이름이나 강점 관련 단어가 직접 언급되지 않았는지 재확인
- 전체 편지가 ${characterName}이라는 하나의 캐릭터 관점에서 일관되게 작성되었는지 확인
- 모든 문단이 동물 세계의 ${occupation} 상황으로 자연스럽게 연결되는지 확인

편지 내용만 반환해주세요. 문단은 ||로 구분해주세요.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 신경다양성을 가진 동물 캐릭터로서 비슷한 고민을 가진 사용자에게 도움을 요청하는 편지를 작성하는 전문가입니다. 편지는 충분히 길고 상세하며 감정적으로 깊이 있게 작성해야 합니다. 중요한 규칙: 1) 절대로 강점 이름을 직접 언급하지 말고 행동으로만 표현할 것 2) 편지 전체에서 하나의 일관된 캐릭터와 상황을 유지할 것 3) 동물 세계 설정을 끝까지 일관되게 유지할 것"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3500
    });

    const letterText = completion.choices[0].message.content;
    const aiGeneratedParagraphs = letterText ? letterText.split('||').map(p => p.trim()) : [];

    // 편지 형식에 맞게 인사말과 날짜 추가
    const letterParagraphs = [
      `${req.body.userNickname || '친애하는 친구'}님께,`,
      ...aiGeneratedParagraphs,
      '읽어주셔서 감사합니다.',
      `${today}  ${characterName} 드림`
    ];

    const generatedLetter: GeneratedLetter = {
      characterName,
      age,
      occupation,
      letterContent: letterParagraphs,
      usedStrengths: selectedStrengths.map(s => s.name)
    };

    // 데이터베이스에 저장 (강점 분석 로그 ID 포함)
    await saveGeneratedLetter(answersId, generatedLetter, strengthAnalysisLog.id);

    res.status(200).json({
      success: true,
      letter: generatedLetter
    });

  } catch (error) {
    console.error('Error generating letter:', error);
    res.status(500).json({ 
      message: 'Failed to generate letter',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}