import { type Metadata } from "next";
import Header from "../../_components/header";
import { api } from "~/trpc/server";
import {
  type EvaluationComponent,
  type ConversationComponent,
} from "~/server/db/schema";

import {
  parseCaseStateFromJsonFlat,
  parseArrayFromJson,
} from "~/chatbot/utils/parseArray";

import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { or } from "drizzle-orm";

import { Suspense } from "react";
import ClientContainer from "./_components/client_container";
import Loading from "./_components/loading";
import { Case_Component_Type } from "~/chatbot/statemachine/case_component";

export const metadata: Metadata = {
  title: "Evaluation",
};

async function getConversationComponents(
  sessionId: number,
  sectionId: string,
): Promise<ConversationComponent[]> {
  const conversationComponentsRetrieved =
    await db.query.conversationComponents.findMany({
      where: (conversationComponents, { and, eq }) =>
        and(
          eq(conversationComponents.caseSessionId, sessionId),
          eq(conversationComponents.sectionId, sectionId),
          or(
            eq(conversationComponents.type, "CANDIDATE"),
            eq(conversationComponents.type, "INTERVIEWER"),
          ),
        ),
      orderBy: (conversationComponents, { asc }) => [
        asc(conversationComponents.createdAt),
      ],
    });

  return conversationComponentsRetrieved;
}

async function MainContent(props: { sessionId: number }) {
  const sessionId = props.sessionId;

  let evaluation = await api.case.getEvaluation.query({
    sessionId: sessionId,
  });

  if (!evaluation) {
    evaluation = await api.case.createEvaluation.mutate({
      sessionId: sessionId,
    });
  }

  // Get evaluation components
  const evaluationComponents = await db.query.evaluationComponents.findMany({
    where: (evaluationComponents, { and, eq }) =>
      and(eq(evaluationComponents.evaluationId, evaluation!.id)),
  });

  // Get a map from sectionId -> CaseConversationComponent[] and sectionId -> EvaluationComponentType
  const session = await api.chatbot.getSession.query({
    sessionId: sessionId,
  });

  const caseParsed = parseCaseStateFromJsonFlat(
    JSON.parse(session.liveStructure as string),
  );

  const caseHistory = parseArrayFromJson<string>(session.order as string);

  // Dictionary of sectionId -> CaseConversationComponents
  const sectionEvaluationDict: Record<string, EvaluationComponent> = {};

  // Get all evaluation components for this evaluation
  for (const evaluationComponent of evaluationComponents) {
    sectionEvaluationDict[evaluationComponent.sectionId] = evaluationComponent;
  }

  // Get the section names
  const sectionNamesDict: Record<string, string> = {};

  const sectionConversationDict: Record<string, ConversationComponent[]> = {};

  let questionIdx = 1;

  for (const sectionId of caseHistory) {
    const sectionReference = caseParsed[sectionId];
    if (!sectionReference) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const conversationComponents = await getConversationComponents(
      sessionId,
      sectionId,
    );

    let sessionName = (sectionReference.type as string).toLowerCase();

    if (sectionReference.type === Case_Component_Type.QUESTION) {
      sessionName = `Question ${questionIdx}`;
      questionIdx++;
    }

    sectionConversationDict[sectionId] = conversationComponents;
    sectionNamesDict[sectionId] =
      sessionName.charAt(0).toUpperCase() + sessionName.slice(1);
  }

  //const hasVideoAnalysis = evaluation?.angerScore !== null;

  if (evaluation?.videoSentimentAnalysis) {
    const videoSectionId = Object.keys(sectionNamesDict).length.toString();
    sectionNamesDict[videoSectionId] = "Video Analysis";
    sectionConversationDict[videoSectionId] = [];
    sectionEvaluationDict[videoSectionId] = {
      id: -1,
      evaluationId: evaluation!.id,
      createdAt: new Date(),
      sectionId: videoSectionId,
      score: -1,
      feedback: evaluation.videoSentimentAnalysis.sentimentFeedback,
    };
  }

  return (
    <ClientContainer
      sectionConversationDict={sectionConversationDict}
      sectionEvaluationDict={sectionEvaluationDict}
      sectionNamesDict={sectionNamesDict}
      caseInfo={session.case}
      evaluation={evaluation!}
      sessionId={sessionId}
    />
  );
}

export default function Page({ params }: { params: { sessionId: string } }) {
  const sessionId = parseInt(params.sessionId);

  return (
    <>
      <main className="flex h-screen flex-col">
        <Header />
        <div>
          <Suspense fallback={<Loading sessionId={sessionId} />}>
            <MainContent sessionId={sessionId} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
