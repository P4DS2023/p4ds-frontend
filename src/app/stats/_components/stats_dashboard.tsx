export default function StatsDashboard(props: {
  userCases: { caseTitle: string; caseCompleted: boolean; sessionId: number }[];
}) {
  const { userCases } = props;
  const numCompletedCases = userCases.filter(
    (info) => info.caseCompleted,
  ).length;

  return (
    // Place statstiles in a 4x4 grid
    <div>
      <div className="grid grid-cols-3 gap-4">
        <StatsTile title="Total Cases" value={userCases.length} />
        <StatsTile title="Completed Cases" value={numCompletedCases} />
        <StatsTile
          title="Cases in Progress"
          value={userCases.length - numCompletedCases}
        />
      </div>
      <h1 className="my-4 mt-4 text-center text-4xl font-bold">
        You are making great progress this month! 🚀
      </h1>
    </div>
  );
}

function StatsTile(props: { title: string; value: number }) {
  const { title, value } = props;
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <span className="text-9xl font-bold"> {value}</span>
      <span className="text-2xl text-gray-600">{title}</span>
    </div>
  );
}
