export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="unlock-wrap">
      <div className="unlock-card">
        <h1>Development access</h1>
        <p>
          This stands in for real purchase + login until Phase C. Entering the
          access code unlocks every profile in this browser, same as being an
          entitled buyer will once the real paywall is wired in.
        </p>
        {error ? <div className="err">That code didn&apos;t match. Try again.</div> : null}
        <form action="/api/unlock" method="post">
          <input type="password" name="code" placeholder="Access code" autoFocus required />
          <button type="submit">Unlock</button>
        </form>
      </div>
    </div>
  );
}
