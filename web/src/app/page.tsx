import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Welcome to Study Ops
        </p>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-full sm:before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full sm:after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-blue-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
        <h1 className="text-6xl font-bold tracking-tighter sm:text-7xl md:text-8xl lg:text-9xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
          STUDY OPS
        </h1>
      </div>

      <div className="mt-12 flex flex-col gap-4 items-center">
        <p className="text-xl text-muted-foreground text-center max-w-2xl">
          The AI-powered personal study assistant designed for shift workers, 
          Loksewa candidates, and aviation professionals.
        </p>
        <Link 
          href="/login" 
          className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all neon-border"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}
