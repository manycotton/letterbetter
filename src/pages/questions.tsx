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
      question: `안녕하세요, ${nickname || ''}님 만나서 반가워요. 시작하기에 앞서, 당신에 대해 알고 싶습니다. 당신은 누구신가요?`,
      placeholder: "당신에 대해 소개해주세요.",
      type: 'text' as const
    },
    {
      question: "요즘 마음처럼 풀리지 않는 일 때문에 고민이 많다고 들었어요. 주로 어떤 상황에 대한 고민인가요?",
      placeholder: "작성해주세요.",
      type: 'tag' as const,
      tags: ["직장", "학교", "가정", "연인", "친구"]
    },
    {
      question: `${answers[1] ? answers[1].split(' - ')[0] || answers[1].split(',')[0] : '학교'}에서 고민이 많으시군요. 혹시 ${answers[1] ? answers[1].split(' - ')[0] || answers[1].split(',')[0] : '학교'}에서 어떤 점이 마음에 걸리는지 자세히 말씀해주실 수 있을까요?`,
      placeholder: "어려운 점 작성하기",
      type: 'text' as const
    }
  ];

  const handleAnswerSubmit = async (answer: string) => {
    const newAnswers = [...answers, answer];
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
      setAnswers(answers.slice(0, -1));
    } else {
      // 첫 번째 질문에서 이전 버튼을 누르면 홈으로 이동
      router.push('/');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <QuestionBlock
          question={questions[currentQuestion].question}
          placeholder={questions[currentQuestion].placeholder}
          type={questions[currentQuestion].type}
          tags={questions[currentQuestion].tags}
          onSubmit={handleAnswerSubmit}
          onBack={handleBack}
          isLast={currentQuestion === questions.length - 1}
          initialAnswer={answers[currentQuestion] || ''}
          skipTyping={!!queryAnswers} // result에서 돌아온 경우 타이핑 건너뛰기
        />
      </div>
    </div>
  );
};

export default Questions;