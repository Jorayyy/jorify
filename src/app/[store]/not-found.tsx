import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Page not found</h1>
      <p className="max-w-md text-sm text-zinc-500">
        This store or page does not exist, or it is no longer available.
      </p>
      <Link
        href="/"
        className="mt-3 inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Go to home
      </Link>
    </div>
  );
}
