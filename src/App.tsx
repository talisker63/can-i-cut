import { getFirebaseApp } from "./lib/firebase";

function App() {
  const firebaseReady = Boolean(getFirebaseApp());
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Can I Cut</h1>
      <p className="text-zinc-400 text-center max-w-md">
        Firebase auth, storage, and hosting are wired. Copy{" "}
        <code className="text-emerald-400">.env.example</code> to{" "}
        <code className="text-emerald-400">.env</code> and fill values, then run{" "}
        <code className="text-emerald-400">npm run dev</code>.
      </p>
      <p className="text-sm text-zinc-500">
        Client config:{" "}
        <span className={firebaseReady ? "text-emerald-400" : "text-amber-400"}>
          {firebaseReady ? "loaded" : "missing or incomplete"}
        </span>
      </p>
    </div>
  );
}

export default App;
