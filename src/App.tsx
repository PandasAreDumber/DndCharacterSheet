// Placeholder screen for phase 0 (project setup). Replaced in phase 2.
function App() {
  return (
    <main className="min-h-screen p-4 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">D&amp;D Combat Tracker</h1>
      <div className="flex gap-2">
        <span className="badge badge-success">Action</span>
        <span className="badge badge-info">Bonus</span>
        <span className="badge badge-warning">Reaction</span>
      </div>
      <button className="btn btn-primary">New Turn</button>
      <p className="text-sm opacity-70">Setup works. Rules engine comes next (phase 1).</p>
    </main>
  )
}

export default App
