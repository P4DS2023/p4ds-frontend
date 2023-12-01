import { type Evaluation } from "~/server/db/schema";

import { BsEmojiAngry } from "react-icons/bs";
import { BsEmojiFrown } from "react-icons/bs";
import { BsEmojiSurprise } from "react-icons/bs";
import { BsEmojiSmile } from "react-icons/bs";
import { ReactNode } from "react";

export default function EmotionDisplay(props: {
  videoSentimentAnalysis: Evaluation["videoSentimentAnalysis"];
}) {
  const { videoSentimentAnalysis } = props;

  if (!videoSentimentAnalysis) {
    throw new Error("videoSentimentAnalysis is undefined");
  }

  const emotionScores = [
    {
      emotion: "Anger",
      icon: <BsEmojiAngry />,
      score: videoSentimentAnalysis.angerScore,
    },
    {
      emotion: "Sorrow",
      icon: <BsEmojiFrown />,
      score: videoSentimentAnalysis.sorrowScore,
    },
    {
      emotion: "Surprise",
      icon: <BsEmojiSurprise />,
      score: videoSentimentAnalysis.surpriseScore,
    },
    {
      emotion: "Joy",
      icon: <BsEmojiSmile />,
      score: videoSentimentAnalysis.joyScore,
    },
  ];

  return (
    <div className="flex w-full flex-col items-center p-2">
      <div className="text-4xl font-thin">Emotional Analysis Scores</div>
      <p className="text-1xl font-thin">
        Scores show your average emotional state during the interview on a scale
        from 0 - 4{" "}
      </p>
      <div className="mt-20 grid grid-cols-4 grid-rows-1 gap-10">
        {emotionScores.map((emotionScore) => (
          <EmotionCard
            key={emotionScore.emotion}
            emotion={emotionScore.emotion}
            icon={emotionScore.icon}
            score={emotionScore.score}
          />
        ))}
      </div>
    </div>
  );
}

function EmotionCard(props: {
  emotion: string;
  icon: ReactNode;
  score: number;
}) {
  const { emotion, icon, score } = props;

  return (
    <div className="m-10 flex flex-col items-center justify-center">
      <div className="text-8xl">{icon}</div>
      <div className="text-2xl font-bold">{emotion}</div>
      <div className="text-2xl">{score.toFixed(2)}</div>
    </div>
  );
}
