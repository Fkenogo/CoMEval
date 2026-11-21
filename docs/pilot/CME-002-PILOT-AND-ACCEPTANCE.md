# CME-002 — Pilot and acceptance

Both project owners are design partners. Source packs reviewed include evaluation terms of reference, baseline and coverage material, household and youth instruments, survey tools for distinct respondent groups, results frameworks, periodic reporting and revised endline outputs. Confirm authoritative source versions and scope privately with each owner. Historical source material supports a replay where no current collection cycle is available.

| Use case | First workflow to validate | Start with |
| --- | --- | --- |
| A — livelihoods evaluation | Compare a baseline and endline result with source and population context | One cohort, one brief instrument and one result with an explicit denominator |
| B — multisector survey | Capture one instrument for a defined respondent group and trace the approved measure into periodic reporting | One sector, one respondent group, one indicator and one report period |

Use a shared configuration, capture, review and reporting model. Add the second project through its own configuration. Confirm participant-level needs before permitting collection, especially where instruments involve minors or vulnerable groups.

## First engineering slice

After prototype reconciliation, build a thin field-to-report flow with two fictional projects and two distinct owner accounts. Use a versioned plan, one configured form per project, explicit project membership, submission and approval, evidence citations, period reporting and report reissue. Specify evidence retention and offline conflict handling before building partner-facing storage or sync. Confirm real partner scopes independently before admitting their data.

| Acceptance | Expected result |
| --- | --- |
| Shared workflow | Switching project changes fields, required evidence and targets via configuration. Both projects use the same flow. |
| Owner isolation | Each owner sees only their project. Direct access to the other project's report, record, attachment or export fails. Assignment removal revokes future access. |
| Offline rehearsal | An assigned form saves with approved evidence while offline, survives restart and makes pending or failed status visible. Retry produces one submission. Pending uploads and outdated plan versions have an explicit review path. |
| Review | A returned record carries a reason and can be resubmitted. A pending correction does not change the approved result. |
| Period target | 30 against a period target of 40 gives 75% attainment. The programme target of 100 is displayed separately. |
| Exact evidence and reissue | Approved correction to 35 changes live attainment to 87.5%. The original issue still shows 75% and opens its original evidence version for an authorised viewer. A corrected issue explicitly references the original. |

## Per-project decisions

Confirm report audience and format, owner and delegated roles, source-of-truth instrument and report versions, target and calculation definitions, what must work offline, acceptable evidence, access and retention, and success measures. Compare the pilot report and turnaround with the existing workflow. Record partner sign-off separately for each project.
