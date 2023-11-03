import Head from "next/head";
import { api } from "~/trpc/server";
import Header from "../_components/header";
import CaseTile from "./_components/case_tile";
import CompletedCasesList from "./_components/completed_cases";

export default async function Welcome() {
  const allCases = await api.case.getAll.query();

  const CaseTileList = () => {
    return (
      <ul>
        {allCases.map((caseData) => {
          return <CaseTile key={caseData.id} caseData={caseData} />;
        })}
      </ul>
    );
  };

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col">
        <Header />
        <div className="flex grow flex-row divide-x p-2">
          <div className="w-2/3">
            <h1 className="text-xl font-bold">Discover New Cases</h1>
            <CaseTileList />
          </div>

          <div>
            <h1 className="text-xl font-bold">Your Stats</h1>
            <CompletedCasesList />
          </div>
        </div>
      </main>
    </>
  );
}
