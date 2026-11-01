import type { DigestNight, DigestRow } from '../digest/types.js';

export function DigestView({ digest }: { digest: DigestNight }) {
  const sortedRows = [...digest.rows].sort((a, b) => a.job.localeCompare(b.job));

  return (
    <>
      <h1>digest {digest.night}</h1>
      {sortedRows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>status</th>
              <th>last error</th>
              <th>first at</th>
              <th>last at</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <DigestRowView key={row.job} row={row} />
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && (
        <p class="mute">
          {digest.badLines} {digest.badLines === 1 ? 'line could not be read' : 'lines could not be read'}
        </p>
      )}
    </>
  );
}

function DigestRowView({ row }: { row: DigestRow }) {
  const isWarnRetries = row.retries >= 3;
  const isWarnStatus = row.lastStatus === 'fail';

  return (
    <tr>
      <td>{row.job}</td>
      <td>{row.owner || '—'}</td>
      <td>{row.runs}</td>
      <td class={isWarnRetries ? 'warn' : undefined}>{row.retries}</td>
      <td class={isWarnStatus ? 'warn' : undefined}>{row.lastStatus}</td>
      <td>{row.lastError ?? '—'}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}
