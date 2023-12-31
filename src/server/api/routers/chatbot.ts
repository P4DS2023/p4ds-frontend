import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  caseSessions,
  cases,
  conversationComponents,
} from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { Parser } from "~/chatbot/statemachine/parser";
import { Statemachine } from "~/chatbot/statemachine/statemachine";
import LanguageModel from "~/chatbot/llm/language_model";
import { getLlm } from "~/chatbot/llm/get_llm";
import { supportedLanguageModelType } from "~/store/settings_store";

export const chatbotRouter = createTRPCRouter({
  createNewSession: privateProcedure
    .input(
      z.object({
        caseId: z.number(),
        languageModelType: z.custom<supportedLanguageModelType>(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const { caseId } = input;
      const llmWrapper = getLlm(input.languageModelType);

      // load raw case information
      const theCase = await db.query.cases.findFirst({
        where: eq(cases.id, caseId),
      });

      if (!theCase) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      //! This is an ugly hack. I dont know why it is necessary
      let caseContentJson;
      try {
        caseContentJson = JSON.parse(theCase.caseContent as string);
      } catch {
        caseContentJson = theCase.caseContent;
      }

      const parsedStructure =
        Parser.parseCaseTemplateToProperStateStructure(caseContentJson);

      const res = await db.insert(caseSessions).values({
        caseId,
        userId,
        liveStructure: parsedStructure,
      });

      const caseSession = await db.query.caseSessions.findFirst({
        where: eq(caseSessions.id, parseInt(res.insertId)),
      });

      if (!caseSession) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const llm = new LanguageModel(llmWrapper);
      const stateMachine = new Statemachine(theCase, caseSession, llm);
      await stateMachine.startCase();

      return caseSession.id;
    }),

  getSession: privateProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;
      const userId = ctx.userId;

      // get session
      const currentSession = await db.query.caseSessions.findFirst({
        where: (caseSessions, { eq }) =>
          eq(caseSessions.userId, userId) && eq(caseSessions.id, sessionId),
        with: {
          conversationComponents: {
            orderBy: (component, { asc }) => [asc(component.createdAt)],
            where: (component, { inArray }) =>
              inArray(component.type, ["CANDIDATE", "INTERVIEWER"]),
          },
          case: true,
        },
      });

      if (!currentSession) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return currentSession;
    }),

  addResponse: privateProcedure
    .input(
      z.object({
        sessionId: z.number(),
        content: z.string(),
        languageModelType: z.custom<supportedLanguageModelType>(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, content } = input;
      const userId = ctx.userId;
      const llmWrapper = getLlm(input.languageModelType);

      // get session
      const currentSession = await db.query.caseSessions.findFirst({
        where: (caseSessions, { eq }) =>
          eq(caseSessions.userId, userId) && eq(caseSessions.id, sessionId),
        with: {
          case: true,
        },
      });

      if (!currentSession) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const llm = new LanguageModel(llmWrapper);
      const chatbot = new Statemachine(
        currentSession.case,
        currentSession,
        llm,
      );

      await chatbot.continueConversationAfterCandidateResponse(content);

      // get full conversation histroy back
      const conversationHistory =
        await db.query.conversationComponents.findMany({
          where: and(
            eq(conversationComponents.caseSessionId, sessionId),
            inArray(conversationComponents.type, ["CANDIDATE", "INTERVIEWER"]),
          ),
          orderBy: (component, { asc }) => [asc(component.createdAt)],
        });

      const isCaseCompleted =
        (await db.query.caseSessions.findFirst({
          where: (caseSessions, { eq }) =>
            eq(caseSessions.userId, userId) && eq(caseSessions.id, sessionId),
          with: {
            case: true,
          },
        }))!.state === "COMPLETED";

      return {
        conversationHistory,
        isCaseCompleted,
      };
    }),
});
