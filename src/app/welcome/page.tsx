import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export const Metadata = {
  title: "Welcome to Cacey",
};

export default function Welcome() {
  return (
    <>
      <main className="flex min-h-screen flex-col ">
        <div className="flex flex-row pt-2">
          <div className="grow" />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded border p-2">Sign in</button>
            </SignInButton>
            <div className="w-2" />
            <SignUpButton mode="modal">
              <button className="rounded border bg-slate-300 p-2">
                Sign up
              </button>
            </SignUpButton>
            <div className="w-2" />
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/welcome" />
          </SignedIn>
        </div>

        <div className="flex flex-grow flex-col items-center justify-center">
          <h1 className="text-6xl font-bold">Welcome to Cacey</h1>
          <p className="text-2xl">The best way practice cases online.</p>
          <p className="text-2xl font-bold">Advanced by AI</p>
        </div>
      </main>
    </>
  );
}
