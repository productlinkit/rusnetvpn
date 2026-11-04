import { Fragment } from 'react'
import { CONTINENTS } from '../hooks'

/* ==========================================================================
   MARQUEE

   The track is translated -50% on a loop, so the run has to be duplicated an
   even number of times for the seam to land off-screen. Four copies keeps it
   wide enough that the seam never enters the frame on a large monitor.

   The continents are the list the facts count from, so the strip and the
   "six continents" in the copy cannot disagree.
   ========================================================================== */

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
