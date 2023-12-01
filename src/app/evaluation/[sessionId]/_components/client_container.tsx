"use client";
import { useState } from "react";

import {
  type EvaluationComponent,
  type ConversationComponent,
  type Evaluation,
  type Case,
} from "~/server/db/schema";

import Chat from "./chat";
import EvaluationComponentDisplay from "./evaluation_component_display";
import { CaseInfo } from "./case_info";
import EmotionDisplay from "./emotion_display";

export default function ClientContainer(props: {
  sectionConversationDict: Record<string, ConversationComponent[]>;
  sectionEvaluationDict: Record<string, EvaluationComponent>;
  sectionNamesDict: Record<string, string>;
  caseInfo: Case;
  evaluation: Evaluation;
  sessionId: number;
}) {
  const {
    sectionConversationDict,
    sectionEvaluationDict,
    sectionNamesDict,
    caseInfo,
    evaluation,
    sessionId,
  } = props;

  // Assert that neitner sectionConversationDict or sectionEvaluationDict is undefined
  if (!sectionConversationDict || !sectionEvaluationDict) {
    throw new Error(
      "sectionConversationDict or sectionEvaluationDict is undefined",
    );
  }

  const sections = Object.keys(sectionConversationDict);
  const [selectedSection, setSelectedSection] = useState<string>("0");
  const [conversation, setConversation] = useState<ConversationComponent[]>(
    sectionConversationDict[selectedSection]!,
  );
  const [evaluationComponent, setEvaluationComponent] =
    useState<EvaluationComponent>(sectionEvaluationDict[selectedSection]!);

  const [displayVideoAnalysis, setDisplayVideoAnalysis] =
    useState<boolean>(false);

  const hasVideoAnalysis = evaluation?.videoSentimentAnalysis;
  const handleClick = (sectionId: string) => {
    if (
      !displayVideoAnalysis &&
      hasVideoAnalysis &&
      sectionId === (sections.length - 1).toString()
    ) {
      setDisplayVideoAnalysis(true);
    } else if (displayVideoAnalysis) {
      setDisplayVideoAnalysis(false);
    }
    setSelectedSection(sectionId);
    setConversation(sectionConversationDict[sectionId]!);
    setEvaluationComponent(sectionEvaluationDict[sectionId]!);
  };

  return (
    <>
      <h1 className="my-4 text-center text-4xl font-bold">Case Evaluation</h1>
      <div className="mx-5 flex max-h-[80vh] grow flex-row overflow-auto">
        <div className=" flex w-1/3 flex-col items-stretch">
          <CaseInfo case={caseInfo} />
          {sections.map((sectionId) => (
            <div
              key={sectionId}
              className={`m-2 rounded-lg p-4 transition-colors duration-300 ease-in-out
                    ${
                      selectedSection === sectionId
                        ? "bg-blue-500 text-white"
                        : "bg-white hover:bg-blue-200"
                    }
                    cursor-pointer text-xl shadow-sm hover:shadow-md `} // Added hover effects and shadows for interactivity
              onClick={() => handleClick(sectionId)}
            >
              {sectionNamesDict[sectionId]}
            </div>
          ))}
        </div>
        {!displayVideoAnalysis && <Chat conversation={conversation} />}
        {displayVideoAnalysis && (
          <EmotionDisplay
            videoSentimentAnalysis={evaluation!.videoSentimentAnalysis}
          />
        )}
        <div className="flex w-1/3 flex-col items-end ">
          <EvaluationComponentDisplay
            evaluationComponent={evaluationComponent}
          />
        </div>
      </div>
    </>
  );
}
