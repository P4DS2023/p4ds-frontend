"use client";

import { Case, CaseSession, ConversationComponent } from "~/server/db/schema";
import { Toggle } from "./_components/toggle";
import RealtimeChat from "./_components/realtime_chat";
import { EvaluationComponent } from "./_components/evaluation_menu";
import { CaseInfo } from "./_components/case_info";
import { createContext, useContext, useRef, useState } from "react";
import { WordSpeedEvaluator } from "./_logic/evaluator";
import { LiveVideo } from "./_components/live_video";

import { createStore } from "zustand";

export enum INPUT_MODALITY {
  TEXT,
  VOICE,
}

interface EvaluationState {
  clarity: number | null;
  engagement: number | null;
  speechSpeed: number | null;

  addClarity: (clarity: number) => void;
  addEngagement: (engagement: number) => void;
  addSpeechSpeed: (speechSpeed: number) => void;
}
// const useCreateEvaluationStore = () => {
//   const wordSpeedevaluator = new WordSpeedEvaluator();

//   const store = createStore<EvaluationState>()((set) => ({
//     clarity: null,
//     engagement: null,
//     speechSpeed: null,

//     addClarity: (clarity: number) => set({ clarity }),
//     addEngagement: (engagement: number) => set({ engagement }),
//     addSpeechSpeed: (speechSpeed: number) => set({ speechSpeed }),
//   }));

//   wordSpeedevaluator.addListener((score) =>
//     store.setState({ speechSpeed: score }),
//   );

//   return store;
// };

// export const EvaluationStoreContext = createContext<
//   typeof useCreateEvaluationStore | null
// >(null);

export const MainContent = (props: {
  session: CaseSession;
  case: Case;
  conversationHistory: ConversationComponent[];
}) => {
  const { session, case: currentCase, conversationHistory } = props;
  const [inputModality, setInputModality] = useState(INPUT_MODALITY.VOICE);

  // const store = useRef(useCreateEvaluationStore);

  return (
    // <EvaluationStoreContext.Provider value={store.current}>
    <div className="flex grow flex-row  overflow-auto">
      <div className=" flex w-1/3 flex-col items-start">
        <CaseInfo case={currentCase} />
        <div className="grow" />
        <Toggle
          label="Use Text Input"
          isActive={inputModality === INPUT_MODALITY.TEXT}
          onChange={(isActive) => {
            if (isActive) {
              setInputModality(INPUT_MODALITY.TEXT);
            } else {
              setInputModality(INPUT_MODALITY.VOICE);
            }
          }}
        />
      </div>
      {session.state === "RUNNING" && (
        <RealtimeChat
          sessionId={session.id}
          initialConversation={conversationHistory}
          inputModality={inputModality}
        />
      )}
      <div className="flex w-1/3 flex-col items-end ">
        <EvaluationComponent clarity={3} engagement={8} speed={5} />
        <LiveVideo />
      </div>
    </div>
    // </EvaluationStoreContext.Provider>
  );
};
