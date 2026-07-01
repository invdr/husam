export default function Results() {
  return (
    <section
      id="results"
      className="relative flex min-h-[100svh] items-center overflow-hidden py-12 md:min-h-screen md:py-20 will-reveal"
      data-reveal="fade-up"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-brand/5 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-10 text-center md:mb-14">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs text-brand">
            Наши результаты
          </div>
          <h2 className="font-play text-4xl font-bold tracking-tight md:text-6xl">
            Наши достижения
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-brand/30" />
          <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-400 md:text-base">
            Цифры, которыми мы гордимся
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          <div className="group rounded-2xl border border-brand/20 bg-[#2A2A28]/90 p-6 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand/35 hover:bg-[#2A2A28] parallax-slight">
            <div className="font-play text-4xl font-bold text-brand md:text-5xl">
              <span className="count-up" data-target="12">
                0
              </span>
              +
            </div>
            <div className="mx-auto mt-4 h-px w-12 bg-brand/25 transition group-hover:w-16 group-hover:bg-brand/35" />
            <div className="mt-3 text-sm text-gray-400">лет на рынке</div>
          </div>
          <div className="group rounded-2xl border border-brand/20 bg-[#2A2A28]/90 p-6 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand/35 hover:bg-[#2A2A28] parallax-slight">
            <div className="font-play text-4xl font-bold text-brand md:text-5xl">
              <span className="count-up" data-target="140">
                0
              </span>
              +
            </div>
            <div className="mx-auto mt-4 h-px w-12 bg-brand/25 transition group-hover:w-16 group-hover:bg-brand/35" />
            <div className="mt-3 text-sm text-gray-400">сданных объектов</div>
          </div>
          <div className="group rounded-2xl border border-brand/20 bg-[#2A2A28]/90 p-6 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand/35 hover:bg-[#2A2A28] parallax-slight">
            <div className="font-play text-4xl font-bold text-brand md:text-5xl">
              <span className="count-up" data-target="25000">
                0
              </span>
              +
            </div>
            <div className="mx-auto mt-4 h-px w-12 bg-brand/25 transition group-hover:w-16 group-hover:bg-brand/35" />
            <div className="mt-3 text-sm text-gray-400">м² отремонтировано</div>
          </div>
          <div className="group rounded-2xl border border-brand/20 bg-[#2A2A28]/90 p-6 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand/35 hover:bg-[#2A2A28] parallax-slight">
            <div className="font-play text-4xl font-bold text-brand md:text-5xl">
              <span className="count-up" data-target="30">
                0
              </span>
              +
            </div>
            <div className="mx-auto mt-4 h-px w-12 bg-brand/25 transition group-hover:w-16 group-hover:bg-brand/35" />
            <div className="mt-3 text-sm text-gray-400">
              постоянных партнеров
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
