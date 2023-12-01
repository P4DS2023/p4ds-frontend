// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  text,
  int,
  json,
  mysqlEnum,
  mysqlTableCreator,
  timestamp,
  boolean,
  varchar,
  float,
} from "drizzle-orm/mysql-core";
import { string } from "zod";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const mysqlTable = mysqlTableCreator((name) => `frontend_${name}`);

export const caseSessions = mysqlTable("case_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  caseId: int("case_id").notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  liveStructure: json("live_structure").notNull(),
  state: mysqlEnum("state", [
    "NOT_STARTED",
    "RUNNING",
    "TRANSITION_PHASE_1",
    "TRANSITION_PHASE_2",
    "TRANSITION_PHASE_3",
    "COMPLETED",
  ])
    .default("NOT_STARTED")
    .notNull(),
  order: json("order"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const caseSessionsRelationship = relations(
  caseSessions,
  ({ many, one }) => ({
    case: one(cases, {
      fields: [caseSessions.caseId],
      references: [cases.id],
    }),
    conversationComponents: many(conversationComponents),
  }),
);

export type CaseSession = typeof caseSessions.$inferSelect;

export const conversationComponents = mysqlTable(
  "conversation_components",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    caseSessionId: int("case_session_id").notNull(),
    type: mysqlEnum("type", [
      "CANDIDATE",
      "INTERVIEWER",
      "COMMAND",
      "SYSTEM",
      "UNDEFINED",
    ]).notNull(),
    sectionId: varchar("section_id", { length: 128 }).notNull(),
    content: text("content").notNull(),
    isVolatile: boolean("is_volatile").default(false).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  // (table) => {
  //   return {
  //     createdAtIdx: index("created_at_idx").on(table.createdAt),
  //   };
  // },
);

export const conversationComponentsRelationship = relations(
  conversationComponents,
  ({ one }) => ({
    case: one(caseSessions, {
      fields: [conversationComponents.caseSessionId],
      references: [caseSessions.id],
    }),
  }),
);

export type ConversationComponent = typeof conversationComponents.$inferSelect;
export type ConversationComponentType = ConversationComponent["type"];
export function isConversationComponentType(
  text: string,
): text is ConversationComponentType {
  return [
    "CANDIDATE",
    "INTERVIEWER",
    "COMMAND",
    "SYSTEM",
    "UNDEFINED",
  ].includes(text);
}

export const conversationEvaluationComponents = mysqlTable(
  "conversation_evaluation_components",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    caseSessionId: int("case_session_id").notNull(),
    content: text("content").notNull(),
    speechClarity: float("speech_clarity").notNull(),
    speechSpeed: float("speech_speed").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
);

export type ConversationEvaluationComponent =
  typeof conversationEvaluationComponents.$inferSelect;

export const conversationEvaluationComponentsRelationship = relations(
  conversationEvaluationComponents,
  ({ one }) => ({
    case: one(caseSessions, {
      fields: [conversationEvaluationComponents.caseSessionId],
      references: [caseSessions.id],
    }),
  }),
);

export const videoAnalysisEvaluationLevels = [
  "UNKNOWN",
  "VERY_UNLIKELY",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "VERY_LIKELY",
] as const;

export const videoAnalysisComponents = mysqlTable("video_analysis_components", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  caseSessionId: int("case_session_id").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  angerLikelihood: mysqlEnum("anger_likelihood", videoAnalysisEvaluationLevels),
  joyLikelihood: mysqlEnum("joy_likelihood", videoAnalysisEvaluationLevels),
  surpriseLikelihood: mysqlEnum(
    "surprise_likelihood",
    videoAnalysisEvaluationLevels,
  ),
  sorrowLikelihood: mysqlEnum(
    "sorrow_likelihood",
    videoAnalysisEvaluationLevels,
  ),
});

export type VideoAnalysisComponent =
  typeof videoAnalysisComponents.$inferSelect;

export const videoAnalysisComponentsRelationship = relations(
  videoAnalysisComponents,
  ({ one }) => ({
    case: one(caseSessions, {
      fields: [videoAnalysisComponents.caseSessionId],
      references: [caseSessions.id],
    }),
  }),
);

export const CaseDifficultyLevels = ["EASY", "MEDIUM", "HARD"] as const;
export const CaseSectorTypes = ["TECH", "FINANCE", "CONSULTING"] as const;
export const CaseFunctionTypes = [
  "DIGITAL",
  "MARKETING",
  "GROWTH",
  "INVESTMENT",
  "M&A",
] as const;

export const cases = mysqlTable("cases", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  caseContent: json("case_content").notNull(),
  caseTitle: varchar("case_title", { length: 255 }).notNull(),
  caseDescription: varchar("case_description", { length: 1024 }).notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  difficulty: mysqlEnum("difficulty", CaseDifficultyLevels).notNull(),
  sector: mysqlEnum("sector", CaseSectorTypes),
  function: mysqlEnum("function", CaseFunctionTypes),
});

export type Case = typeof cases.$inferSelect;

export const evaluations = mysqlTable("evaluations", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  caseSessionId: int("case_session_id").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  state: mysqlEnum("state", ["CREATING_EVALUATION", "EVALUATED"])
    .default("CREATING_EVALUATION")
    .notNull(),
  overallScore: float("overall_score").notNull(),
  overallFeedback: text("overall_feedback").notNull(),
  videoSentimentAnalysis: json("video_sentiment_analysis").$type<{
    joyScore: number;
    angerScore: number;
    sorrowScore: number;
    surpriseScore: number;
    sentimentFeedback: string;
  }>(),
});

export type Evaluation = typeof evaluations.$inferSelect;

export const evaluationsRelationship = relations(evaluations, ({ one }) => ({
  case: one(caseSessions, {
    fields: [evaluations.caseSessionId],
    references: [caseSessions.id],
  }),
}));

export const evaluationComponents = mysqlTable("evaluation_components", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  evaluationId: int("evaluation_id").notNull(),
  sectionId: varchar("section_id", { length: 128 }).notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  score: float("score").notNull(),
  feedback: text("feedback").notNull(),
});

export type EvaluationComponent = typeof evaluationComponents.$inferSelect;

export const evaluationComponentsRelationship = relations(
  evaluationComponents,
  ({ one }) => ({
    evaluation: one(evaluations, {
      fields: [evaluationComponents.evaluationId],
      references: [evaluations.id],
    }),
  }),
);

// export const finalVideoSentimentAnalysisComponents = mysqlTable(
//   "final_video_sentiment_analysis_components",
//   {
//     id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
//     evaluationId: int("evaluation_id").notNull(),
//     score: float("score").notNull(),
//     recommendation: varchar("recommendation").notNull(),
//     createdAt: timestamp("created_at")
//       .default(sql`CURRENT_TIMESTAMP`)
//       .notNull(),
//   },
// );

// finalVideoSentimentAnalysisComponentsRelationship = relations(
//   finalVideoSentimentAnalysisComponents,
//   ({ one }) => ({
//     evaluation: one(evaluations, {
//       fields: [finalVideoSentimentAnalysisComponents.evaluationId],
//       references: [evaluations.id],
//     }),
//   }),
// );
