import { Fragment } from 'react'

/* ==========================================================================
   MARQUEE

   The track is translated -50% on a loop, so the run has to be duplicated an
   even number of times for the seam to land off-screen. Four copies keeps it
   wide enough that the seam never enters the frame on a large monitor.
   ========================================================================== */

const CONTINENTS = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania']
const RUNS = [0, 1, 2, 3]

export default function Marquee() {
  return (
    <div className="marq" aria-hidden="true">
      <div className="track">
        {RUNS.map((run) => (
          <div className="it" key={run}>
            {CONTINENTS.map((c) => (
              <Fragment key={c}>
                <b>{c}</b>
                <i className="sep" />
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
