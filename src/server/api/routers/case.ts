import { and, eq } from "drizzle-orm";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  caseSessions,
  cases,
  evaluationComponents,
  evaluations,
  videoAnalysisComponents,
} from "~/server/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { evaluateCase } from "~/chatbot/evaluation/evaluation";
import { TRPCError } from "@trpc/server";

export const caseRouter = createTRPCRouter({
  getAll: privateProcedure.query(async () => {
    const allCases = await db.query.cases.findMany();
    return allCases;
  }),

  getUserCases: privateProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get case sessions with userIds
    const userCaseSessions = await db.query.caseSessions.findMany({
      where: eq(caseSessions.userId, userId),
    });

    // Get the cases for each session
    const userCases = await Promise.all(
      userCaseSessions.map(async (session) => {
        return await db.query.cases.findFirst({
          where: eq(cases.id, session.caseId),
        });
      }),
    );

    // Return State, name
    const caseList = [];

    for (let i = 0; i < userCases.length; i++) {
      caseList.push({
        caseTitle: userCases[i]!.caseTitle,
        caseCompleted: userCaseSessions[i]!.state === "COMPLETED",
        sessionId: userCaseSessions[i]!.id,
        createdAt: userCaseSessions[i]!.createdAt,
      });
    }

    caseList.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return caseList;
  }),

  deleteUserCase: privateProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const { sessionId } = input;

      await db
        .delete(caseSessions)
        .where(
          and(eq(caseSessions.id, sessionId), eq(caseSessions.userId, userId)),
        );
    }),

  getEvaluation: privateProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const { sessionId } = input;

      const evaluation = await db.query.evaluations.findFirst({
        where: eq(evaluations.caseSessionId, sessionId),
      });

      return evaluation;
    }),

  createEvaluation: privateProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      // Get evluation from case responses
      const evaluationId = await evaluateCase(input.sessionId);

      //return evaluationId;
      return evaluationId;
    }),

  getEvaluationComponents: privateProcedure
    .input(z.object({ evaluationId: z.number() }))
    .query(async ({ input }) => {
      const { evaluationId } = input;

      const components = await db.query.evaluationComponents.findMany({
        where: eq(evaluationComponents.evaluationId, evaluationId),
      });

      return components;
    }),

  // hello: publicProcedure
  //   .input(z.object({ text: z.string() }))
  //   .query(({ input }) => {
  //     return {
  //       greeting: `Hello ${input.text}`,
  //     };
  //   }),

  // create: publicProcedure
  //   .input(z.object({ name: z.string().min(1) }))
  //   .mutation(async ({ ctx, input }) => {
  //     // simulate a slow db call
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     await ctx.db.insert(posts).values({
  //       name: input.name,
  //     });
  //   }),

  // getLatest: publicProcedure.query(({ ctx }) => {
  //   return ctx.db.query.posts.findFirst({
  //     orderBy: (posts, { desc }) => [desc(posts.createdAt)],
  //   });
  // }),
});
