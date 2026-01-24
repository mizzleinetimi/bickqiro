export default function HomePage() {
  const serverTime = new Date().toISOString()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to Bickqr</h1>
      <p className="text-gray-600 mb-4">
        Discover and share short audio clips.
      </p>
      <p className="text-sm text-gray-400">
        Server rendered at: {serverTime}
      </p>
    </div>
  )
}
