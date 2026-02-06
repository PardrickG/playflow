'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';

interface QuizQuestion {
    id: string;
    question: string;
    answers: Array<{
        id: string;
        text: string;
        isCorrect?: boolean;
    }>;
    imageUrl?: string;
}

interface QuizGameProps {
    questions: QuizQuestion[];
    onComplete?: (results: { score: number; total: number; answers: Record<string, string> }) => void;
    showFeedback?: boolean;
    allowRetry?: boolean;
    theme?: {
        primaryColor?: string;
        backgroundColor?: string;
    };
}

export function QuizGame({
    questions,
    onComplete,
    showFeedback = true,
    allowRetry = false,
    theme = {},
}: QuizGameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showResult, setShowResult] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const hasAnswered = selectedAnswers[currentQuestion?.id];

    const handleAnswer = (answerId: string) => {
        if (hasAnswered && !allowRetry) return;

        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: answerId,
        }));

        if (showFeedback) {
            const answer = currentQuestion.answers.find(a => a.id === answerId);
            setFeedback(answer?.isCorrect ? 'correct' : 'incorrect');

            setTimeout(() => {
                setFeedback(null);
                if (isLastQuestion) {
                    finishQuiz();
                } else {
                    setCurrentIndex(prev => prev + 1);
                }
            }, 1500);
        }
    };

    const handleNext = () => {
        if (!hasAnswered) return;

        if (isLastQuestion) {
            finishQuiz();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const finishQuiz = () => {
        const score = questions.reduce((sum, q) => {
            const selectedId = selectedAnswers[q.id];
            const selected = q.answers.find(a => a.id === selectedId);
            return sum + (selected?.isCorrect ? 1 : 0);
        }, 0);

        setShowResult(true);
        onComplete?.({
            score,
            total: questions.length,
            answers: selectedAnswers,
        });
    };

    if (showResult) {
        const score = questions.reduce((sum, q) => {
            const selectedId = selectedAnswers[q.id];
            const selected = q.answers.find(a => a.id === selectedId);
            return sum + (selected?.isCorrect ? 1 : 0);
        }, 0);

        return (
            <div
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: theme.backgroundColor || '#1a1a2e' }}
            >
                <div className="text-6xl mb-4">
                    {score === questions.length ? '🎉' : score >= questions.length / 2 ? '👏' : '😊'}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
                <p className="text-slate-300 mb-4">
                    You scored <span className="text-pink-400 font-bold">{score}</span> out of {questions.length}
                </p>
                <div className="w-full bg-slate-700 rounded-full h-3 mb-6">
                    <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                            width: `${(score / questions.length) * 100}%`,
                            backgroundColor: theme.primaryColor || '#ec4899',
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl p-6 max-w-md mx-auto"
            style={{ backgroundColor: theme.backgroundColor || '#1a1a2e' }}
        >
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                </span>
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                            width: `${((currentIndex + 1) / questions.length) * 100}%`,
                            backgroundColor: theme.primaryColor || '#ec4899',
                        }}
                    />
                </div>
            </div>

            {/* Question */}
            {currentQuestion?.imageUrl && (
                <img
                    src={currentQuestion.imageUrl}
                    alt=""
                    className="w-full h-40 object-cover rounded-xl mb-4"
                />
            )}
            <h3 className="text-xl font-semibold text-white mb-6">
                {currentQuestion?.question}
            </h3>

            {/* Answers */}
            <div className="space-y-3 mb-6">
                {currentQuestion?.answers.map((answer) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === answer.id;
                    const showCorrect = feedback && isSelected;

                    return (
                        <button
                            key={answer.id}
                            onClick={() => handleAnswer(answer.id)}
                            disabled={!!feedback}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all
                ${isSelected
                                    ? showCorrect && feedback === 'correct'
                                        ? 'border-green-500 bg-green-500/20'
                                        : showCorrect && feedback === 'incorrect'
                                            ? 'border-red-500 bg-red-500/20'
                                            : 'border-pink-500 bg-pink-500/20'
                                    : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                                }
              `}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-white">{answer.text}</span>
                                {showCorrect && feedback === 'correct' && (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                                {showCorrect && feedback === 'incorrect' && (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Next button (when feedback is disabled) */}
            {!showFeedback && hasAnswered && (
                <button
                    onClick={handleNext}
                    className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: theme.primaryColor || '#ec4899' }}
                >
                    {isLastQuestion ? 'See Results' : 'Next Question'}
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
