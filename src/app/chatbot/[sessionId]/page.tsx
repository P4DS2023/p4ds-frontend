import Head from "next/head";
import Header from "~/app/_components/header";
import { api } from "~/trpc/server";
import RealtimeChat from "./_components/realtime_chat";

export default async function Page({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = parseInt(params.sessionId);
  const currentSession = await api.chatbot.getSession.query({
    sessionId: sessionId,
  });

  if (currentSession.state === "NOT_STARTED") {
    throw new Error("Session not started");
  }

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-col">
          {currentSession.state === "RUNNING" && (
            <RealtimeChat
              sessionId={sessionId}
              initialConversation={currentSession.conversationComponents}
            />
          )}
        </div>
      </main>
    </>
  );
}