import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import QuestionBlock from '../components/QuestionBlock';
import styles from '../styles/Questions.module.css';

const Questions: React.FC = () => {
  const router = useRouter();
  const { nickname, answers: queryAnswers, currentQuestion: queryCurrentQuestion } = router.query;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [answersId, setAnswersId] = useState<string | null>(null);

  // 사용자 정보 로드
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // 쿼리에서 전달받은 데이터로 상태 초기화
  useEffect(() => {
    if (queryAnswers && typeof queryAnswers === 'string') {
      try {
        const parsedAnswers = JSON.parse(queryAnswers);
        setAnswers(parsedAnswers);
      } catch (error) {
        console.error('Failed to parse answers:', error);
      }
    }
    
    if (queryCurrentQuestion && typeof queryCurrentQuestion === 'string') {
      const questionIndex = parseInt(queryCurrentQuestion, 10);
      if (!isNaN(questionIndex)) {
        setCurrentQuestion(questionIndex);
      }
    }
  }, [queryAnswers, queryCurrentQuestion]);

  const questions = [
    {
      question: `안녕하세요, ${nickname || ''}님 만나서 반가워요. 시작하기에 앞서 당신에 대해 알고 싶어요. 당신은 누구신가요?`,
      guideText: "어떤 일을 하고 계신지, 요즘 관심사나 취미는 무엇인지, 본인의 성격, 신경다양성, 가족이나 친구들과의 관계, 평소 생활 모습 등... 자신에 대해 자유롭게 써주세요!",
      placeholder: "당신에 대해 소개해주세요.",
      type: 'text' as const
    },
    {
      question: `와 정말 멋진 분 이네요! ${nickname || '당신'}님을 좀 더 알아가고 싶어요 😆 스스로 생각하기에 자신만의 특별한 매력이나 장점이 있다면 무엇인가요? 혹은 평소에 주변 사람들이 ${nickname || '당신'}님의 어떤 점을 좋아하거나 칭찬하나요?`,
      placeholder: "자신의 매력이나 장점에 대해 써주세요.",
      type: 'strengthTags' as const,
      strengthTags: [
        { name: "💪 운동 능력자", description: "너는 몸을 아주 잘 써. 남들보다 운동을 더 특별하게 잘하는 힘이 있어." },
        { name: "💡 창의력 폭발", description: "너는 새로운 생각을 아주 잘 해. 남들이 생각 못 하는 멋진 아이디어를 낼 수 있어." },
        { name: "❤️ 공감 천재", description: "너는 다른 사람의 마음을 아주 깊이 이해해. 친구가 어떤 기분인지 잘 알아줘." },
        { name: "🔍 매의 눈 디테일", description: "너는 작은 부분까지 놓치지 않고 잘 찾아내. 숨어있는 규칙이나 특이한 점도 잘 발견해." },
        { name: "🧠 정보 기억 능력자", description: "너는 특정한 정보를 아주 잘 기억해. 한 번 본 것은 잘 안 잊어버려." },
        { name: "🗺️ 머릿속 지도 앱", description: "너는 지도를 아주 잘 보고, 물건이 어디에 있는지 머릿속으로 잘 그려낼 수 있어." },
        { name: "📡 마음 읽는 센서", description: "너는 친구들이 어떤 기분인지 아주 잘 알아. 그래서 친구들과 사이좋게 잘 지낼 수 있어." },
        { name: "🎯 초집중 모드 ON", description: "너는 한 가지 일에 아주 오래 집중할 수 있어. 다른 것 신경 안 쓰고 일에만 몰두해서 아주 잘 해내." },
        { name: "📸 눈으로 찍는 사진 기억", description: "너는 눈으로 본 것을 아주 잘 기억해. 그림이나 글을 한 번 보면 오래 기억할 수 있어." },
        { name: "🔢 수학 천재", description: "너는 수학 문제를 머릿속으로 아주 빨리 풀 수 있어. 숫자 계산도 척척 잘 해." },
        { name: "📋 원칙대로 FM", description: "너는 일을 차례대로 아주 꼼꼼하게 잘 해. 시키는 일을 꾸준히 잘 해낼 수 있어." },
        { name: "🔄 생각 뒤집기 천재", description: "너는 어려운 문제가 생기면 남들이 생각 못 하는 특별한 방법으로 잘 해결해." },
        { name: "🌟 인싸력 폭발! 인기쟁이", description: "너는 사람들과 아주 친하게 잘 지내. 친구들과 이야기하는 것도 아주 잘해." },
        { name: "🔥 포기란 없다! 끈기 대장!", description: "너는 어려운 일도 포기하지 않고 끝까지 해내는 힘이 있어. 아주 끈기 있고 단단한 마음을 가지고 있어." },
        { name: "💻 컴퓨터/IT 마스터!", description: "너는 새로운 컴퓨터나 기계를 아주 빨리 배우고 잘 다룰 수 있어." },
        { name: "📚 책벌레 독서왕", description: "너는 책을 아주 빠르고 많이 읽을 수 있어. 글을 읽으면 내용을 금방 이해해." },
        { name: "✍️ 술술 말솜씨", description: "너는 글을 아주 예쁘고 재미있게 잘 써. 네 글을 읽으면 사람들이 귀 기울여 들어." },
        { name: "💭 엉뚱 발상 해결사", description: "너는 문제가 생기면 남들과 다른 신기한 방법으로 생각해. 그래서 새로운 해결책을 잘 찾아내." },
        { name: "📊 단계별 완벽 실행", description: "너는 일을 할 때 정해진 순서대로 아주 잘 해. 규칙을 잘 지키며 일을 효율적으로 해낼 수 있어." },
        { name: "🚀 알아서 척척! 주도왕", description: "너는 시키지 않아도 스스로 일을 찾아서 해. 먼저 시작하고 끝까지 해내는 힘이 있어." },
        { name: "🎙️ 명쾌한 설명가", description: "너는 어려운 이야기를 아주 쉽고 재미있게 설명해 줄 수 있어. 그래서 친구들이 네 설명을 들으면 바로 이해해." },
        { name: "🤝 약속은 철저히! 믿음직맨", description: "너는 약속을 꼭 지켜. 믿을 수 있고 맡은 일을 책임감 있게 잘 해." },
        { name: "⏰ 기다림의 미학! 인내심 킹", description: "너는 힘들거나 오래 걸리는 일도 참고 기다릴 줄 알아. 침착하게 끈기 있게 견딜 수 있어." }
      ]
    },
    {
      question: "요즘 마음처럼 풀리지 않는 일 때문에 고민이 많다고 들었어요. 주로 어떤 상황에 대한 고민인가요?",
      placeholder: "작성해주세요.",
      type: 'tag' as const,
      tags: ["💼 직장", "🏫 학교", "🏠 가정", "💕 연인", "👫 친구"]
    },
    {
      question: `${answers[2] ? answers[2].split(' - ')[0] || answers[2].split(',')[0] : '학교'}에서 고민이 많으시군요. 혹시 ${answers[2] ? answers[2].split(' - ')[0] || answers[2].split(',')[0] : '학교'}에서 어떤 점이 마음에 걸리는지 자세히 말씀해주실 수 있을까요?`,
      guideText: "마음속에 담아두었던 고민을 편하게 털어놔보세요. 어떤 상황이나 사건이 있었나요? 누구와 있었던 일인가요? 그때 어떤 마음이었나요? 혹시 해결하기 위해 시도한 것들이 있었나요?",
      placeholder: "고민을 구체적으로 작성해주세요.",
      type: 'text' as const
    }
  ];

  const handleAnswerSubmit = async (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer; // 현재 질문 위치에 답변 설정
    setAnswers(newAnswers);
    
    // 답변을 데이터베이스에 저장
    if (currentUser) {
      try {
        const response = await fetch('/api/answers/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            answers: newAnswers,
            answersId
          }),
        });

        if (response.ok) {
          const { questionAnswers } = await response.json();
          if (!answersId) {
            setAnswersId(questionAnswers.id);
          }
        }
      } catch (error) {
        console.error('Error saving answers:', error);
      }
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 모든 질문 완료
      console.log('모든 답변:', newAnswers);
      router.push({
        pathname: '/result',
        query: { 
          nickname,
          userId: currentUser?.id,
          answers: JSON.stringify(newAnswers),
          answersId
        }
      });
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      // answers 배열은 그대로 유지하여 기존 답변이 보이도록 함
    } else {
      // 첫 번째 질문에서 이전 버튼을 누르면 홈으로 이동
      router.push('/');
    }
  };

  // 질문 번호에 따른 CSS 클래스 결정 (0번=1번질문, 1번=2번질문, 3번=4번질문)
  const contentClass = (currentQuestion === 0 || currentQuestion === 1 || currentQuestion === 3) 
    ? styles.contentWide 
    : styles.content;

  return (
    <div className={styles.container}>
      <div className={contentClass}>
        <QuestionBlock
          question={questions[currentQuestion].question}
          placeholder={questions[currentQuestion].placeholder}
          type={questions[currentQuestion].type}
          tags={questions[currentQuestion].tags}
          strengthTags={questions[currentQuestion].strengthTags}
          guideText={questions[currentQuestion].guideText}
          onSubmit={handleAnswerSubmit}
          onBack={handleBack}
          isLast={currentQuestion === questions.length - 1}
          initialAnswer={answers[currentQuestion] || ''}
          skipTyping={!!queryAnswers} // result에서 돌아온 경우 타이핑 건너뛰기
          questionNumber={currentQuestion}
        />
      </div>
    </div>
  );
};

export default Questions;