import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

import {
  parseArrayFromJson,
  parseCaseStateFromJsonFlat,
} from "../utils/parseArray";

import { or } from "drizzle-orm";
import { type CaseComponent } from "../statemachine/case_component";
import { prependTag } from "../utils/formatters";
import { VertexAIWrapper } from "../llm/language_model";
import { evaluations } from "~/server/db/schema";
import { evaluationComponents } from "~/server/db/schema";
import evaluationTemplateFactory from "./evaluation_templates/evaluation_factory";

type EvaluationComponentObject = {
  sectionId: string;
  score: number;
  feedback: string;
};

async function evaluateCase(sessionId: number) {
  const session = await db.query.caseSessions.findFirst({
    where: (caseSessions, { eq }) => eq(caseSessions.id, sessionId),
  });

  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const sectionEvaluations: EvaluationComponentObject[] = [];

  // Convert session.liveStructure to JSON
  const caseParsed = parseCaseStateFromJsonFlat(
    JSON.parse(session.liveStructure as string),
  );

  const caseHistory = parseArrayFromJson<string>(session.order as string);

  // sequentially do the evaluation of all sections
  for (const sectionId of caseHistory) {
    const sectionReference = caseParsed[sectionId]; // This is the reference section with solution and stuff
    if (!sectionReference) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    sectionEvaluations.push(
      await evaluateSection(sessionId, sectionId, sectionReference),
    );
  }

  // Calculate overall score and overall feedback
  let overall_score = 0;

  for (const sectionEvaluation of sectionEvaluations) {
    overall_score += sectionEvaluation.score;
  }

  overall_score = Math.round(overall_score / sectionEvaluations.length);

  const feedback = "YET TO BE IMPLEMENTED";
  const state = "CREATING_EVALUATION";

  // Evaluate video analysis
  // const {
  //   overall_joy_score,
  //   overall_anger_score,
  //   overall_sorrow_score,
  //   overall_surprise_score,
  //   llm_sentiment_feedback,
  // };

  const videoAnalysisResult = await evaluateVideoAnalysis(sessionId);

  // Create an evaluation object
  await db.insert(evaluations).values([
    {
      caseSessionId: session.id,
      overallScore: overall_score,
      overallFeedback: feedback,
      state: state,
      videoSentimentAnalysis: videoAnalysisResult,
    },
  ]);

  const evaluation = await db.query.evaluations.findFirst({
    where: (evaluations, { eq }) => eq(evaluations.caseSessionId, session.id),
  });

  // Create evaluation components
  for await (const sectionEvaluation of sectionEvaluations) {
    await db.insert(evaluationComponents).values([
      {
        evaluationId: evaluation!.id,
        sectionId: sectionEvaluation.sectionId,
        score: sectionEvaluation.score,
        feedback: sectionEvaluation.feedback,
      },
    ]);
  }

  // return some evaluationObject
  return evaluation;
}

function getLikelihoodScore(likelihood: string) {
  switch (likelihood) {
    case "VERY_LIKELY":
      return 4;
    case "LIKELY":
      return 3;
    case "POSSIBLE":
      return 2;
    case "UNLIKELY":
      return 1;
    case "VERY_UNLIKELY":
      return 0;
    default:
      return 0;
  }
}

async function evaluateVideoAnalysis(sessionId: number) {
  // fetch video analysis components related to this session
  const sessionVideoAnalysisComponents =
    await db.query.videoAnalysisComponents.findMany({
      where: (videoAnalysisComponents, { eq }) =>
        eq(videoAnalysisComponents.caseSessionId, sessionId),
      orderBy: (component, { desc }) => [desc(component.createdAt)],
    });

  const MIN_NUMBER_EVALUATIONS = 10;
  if (sessionVideoAnalysisComponents.length < MIN_NUMBER_EVALUATIONS) {
    return null;
  }

  let joyscore = 0;
  let angerscore = 0;
  let sorrowscore = 0;
  let surprisescore = 0;

  for (const videoAnanlysisComponent of sessionVideoAnalysisComponents) {
    joyscore += getLikelihoodScore(
      videoAnanlysisComponent.joyLikelihood as string,
    );
    angerscore += getLikelihoodScore(
      videoAnanlysisComponent.angerLikelihood as string,
    );
    sorrowscore += getLikelihoodScore(
      videoAnanlysisComponent.sorrowLikelihood as string,
    );
    surprisescore += getLikelihoodScore(
      videoAnanlysisComponent.surpriseLikelihood as string,
    );
  }

  const overall_joy_score = joyscore / sessionVideoAnalysisComponents.length;
  const overall_anger_score =
    angerscore / sessionVideoAnalysisComponents.length;
  const overall_sorrow_score =
    sorrowscore / sessionVideoAnalysisComponents.length;
  const overall_surprise_score =
    surprisescore / sessionVideoAnalysisComponents.length;

  const llm_sentiment_prompt = `The candidate just completed a job interview. Video analysis was conducted during the inverview which scored the candidates likelihood of expressing the following emotions: joy, anger, sorrow and surprise on a scale from 0 - 4. The following are the results:  ${overall_joy_score} joyful, ${overall_anger_score} anger, ${overall_sorrow_score} sorrow and ${overall_surprise_score} surprise. Please give feedback on the candidates emotional performance during the interview and how that may be interpreted in an interview situation in 2~3 sentences. Guidance on enhancing emotional performance in future interview is also acceptable.  Higher scores of joy should be rewarded and lower scores of sorrow and anger should also be rewarded. The response should be addressed to the candidate directly.`;
  const llm = new VertexAIWrapper();

  const llm_sentiment_feedback = await llm.predict(llm_sentiment_prompt);

  return {
    joyScore: overall_joy_score,
    angerScore: overall_anger_score,
    sorrowScore: overall_sorrow_score,
    surpriseScore: overall_surprise_score,
    sentimentFeedback: llm_sentiment_feedback,
  };
}

async function evaluateSection(
  sessionId: number,
  sectionId: string,
  sectionReference: CaseComponent,
) {
  //retrieve only components that are of type Interviewer or Candidate
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

  const conversationString = conversationComponentsRetrieved
    .map((component) => prependTag(component.content, component.type))
    .join("\n\n");

  const llm = new VertexAIWrapper();

  // Get prompt based on sectionReference
  const evaluationTemplate = evaluationTemplateFactory(sectionReference);

  const evaluationFeedbackPrompt =
    evaluationTemplate.getEvaluationPrompt(conversationString);

  const evaluationScorePrompt =
    evaluationTemplate.getEvaluationScorePrompt(conversationString);

  const feedback = await llm.predict(evaluationFeedbackPrompt);
  const score = parseInt(await llm.predict(evaluationScorePrompt)); //TODO: Check if score is a number between 0 and 10*/

  // return some evaluationObject
  return {
    sectionId,
    score,
    feedback,
  };
}

export { evaluateCase };
