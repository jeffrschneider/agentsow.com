# Agent SoW Specification

**Version:** 0.4.0-draft
**Status:** Working Draft
**Date:** 2026-08-07

A **statement of work** (SoW) is the legal agreement businesses sign when
they hire a service firm: it lists the work, what each side provides, the
deliverables, the price, and the end date. An **Agent SoW** is that same
agreement, adapted for two parties whose software agents do recurring work
together. It states who the parties are, what work is in scope, what each
side furnishes and delivers, at what price and volume, for how long, and what
happens when things change, end, or go wrong.

The defining feature of this specification is not the clause list, which any
consulting contract has. It is the **enforcement gradient**: every clause in an
Agent SoW is labeled with what a machine can actually do about it. A clause is
*enforced* (violations are refused mechanically), *evidence* (a signed,
tamper-evident record exists), or *recorded* (a promise whose breach is
punished by reputation, not code). A document that claims more enforcement
than its runtime delivers is not conformant.

This specification is transport-neutral. It was developed alongside the
AgentMesh protocol and borrows its task lifecycle from the A2A Task model, but
nothing here requires a particular network, message bus, or vendor.

---

## 1. Motivation

Agent-to-agent work that matters is recurring: the same two parties,
repeatedly, over months, exchanging work under standing expectations.
Businesses govern that shape with a statement of work. Software agents can go
one step further: a large subset of SoW clauses can be enforced by the
runtime itself, refused at the door rather than litigated after the fact.

The controls that exist for agent traffic today are per-message: identity
checks, rate limits, size caps, applied to every message as if it came from a
stranger. Those protect a machine; they say nothing about a relationship. The
Agent SoW exists to make the enforceable part of a working relationship
explicit, and to be honest about the rest.

## 2. Conformance language and terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

- **Engagement**: one instance of an Agent SoW between two parties.
- **Template SoW**: a complete document with no signatures. It carries no
  force. When it is sent to a specific counterparty for consideration it is
  also called a **SoW proposal**.
- **Standing proposal SoW**: a template signed by the selling party only,
  with the counterparty left blank, published so that a qualified
  counterparty can countersign it. The normal source of catalog listings
  (§12).
- **Agreed**: countersigned by both owners but before the start instant.
- **Active**: countersigned and at or past the start instant; the only state
  in which runtimes apply the engagement.
- **Provider**: the party whose agent performs the work (the seller).
- **Client**: the party whose agent requests the work (the buyer).
- **Owner**: the accountable principal behind an agent, typically a person or
  organization. Owners sign; agents work.
- **Agent**: a software actor identified by a public key, acting for an owner.
- **Node**: the runtime that hosts an agent and enforces the engagement's
  enforceable clauses on that agent's behalf.
- **Task**: one unit of work under an engagement, with a lifecycle of at least
  `submitted`, `working`, `input_required`, `completed`, `failed`, `canceled`.
  Under a time and materials arrangement a task may also end `exhausted`
  (§5.5.5).
- **Pricing arrangement**: the basis on which an engagement prices work,
  either `fixed_fee` or `time_and_materials` (§5.5). Every engagement
  declares one.
- **Meter**: a named quantity a runtime counts and bills, with a stated unit.
  Tokens consumed, tool calls made, items processed, and elapsed time are
  meters.
- **Artifact**: a named deliverable attached to a completed task, distinct
  from conversational messages.
- **Clearing**: a settlement function trusted by both parties to move value
  and, where supported, to reverse it.

## 3. The enforcement gradient

Every clause in an engagement carries exactly one grade:

| Grade | Meaning | Test |
|---|---|---|
| `enforced` | A conforming runtime refuses violations mechanically, before or during the work. | Violation produces a typed refusal, not a grievance. |
| `evidence` | A signed, tamper-evident record of the relevant facts exists and is exportable. | A dispute is read from records, not reconstructed from memory. |
| `recorded` | A promise stated in the signed document that no runtime can verify. | Breach is establishable only outside the system, and punishable by reputation. |

Rules:

1. A clause MUST NOT be graded `enforced` unless both runtimes involved
   actually implement the refusal behavior. Grading is a claim about the
   deployment, not an aspiration.
2. Publishers of engagement documents MUST render the grade wherever the
   clause is rendered. Hiding the gradient defeats the specification's
   purpose.
3. A runtime that cannot enforce a clause it receives as `enforced` MUST
   refuse the engagement proposal rather than silently downgrade it.

The gradient exists because the alternative, uniform pretend-enforcement, is
how every "smart contract for AI agents" pitch fails. Buyers deserve to know
which protections are code, which are receipts, and which are promises.

## 4. Document model

### 4.1 Encoding and identity

An engagement is a JSON document. The canonical form is JCS (RFC 8785)
canonical JSON. The document identifier is:

```
sow_<base32(sha256(canonical bytes of version 1, minus signatures))[0..16]>
```

The identifier is stable across amendments; each amendment increments an
integer `version` starting at 1.

### 4.2 Top-level shape

```json
{
  "sow": "v1",
  "id": "sow_k7m2q4x9w3e6r8t1",
  "version": 1,
  "starts_at": "2026-08-04T00:00:00Z",  // §5.7: first-order, not a clause field
  "ends_at": "2027-02-01T00:00:00Z",    // §5.7
  "parties": { ... },        // §5.1
  "scope": { ... },          // §5.2
  "inputs": [ ... ],         // §5.3
  "deliverables": [ ... ],   // §5.4
  "price": { ... },          // §5.5
  "volume": { ... },         // §5.6
  "change_control": { ... }, // §5.8
  "termination": { ... },    // §5.9
  "disputes": { ... },       // §5.10
  "confidentiality": { ... },// §5.11
  "signatures": [ ... ]      // §6
}
```

All clause objects carry a `grade` field. Where a clause naturally splits
across grades (confidentiality is the canonical case), it is expressed as
multiple sub-clauses, each singly graded.

### 4.3 Contract language

The signed document is structured data; the sentences a person reads are the
contract language, and they MUST be covered by the signature or what a
reader sees could change after signing. Every document therefore embeds,
inside the signed bytes, a descriptor of the language it was written under:

```json
"language": { "id": "agent-sow-standard-language", "version": 1,
              "sha256": "<hash of that version's template text>" }
```

Renderers MUST render a document using the language version it names. A
renderer that does not know that version MUST say so and show the signed
fields verbatim rather than newer words. Changing any sentence of a language
version is a new version; the hash makes a silent same-version edit
detectable. Documents MAY inherit clause VALUES from a provider's standard
terms (recorded in a `derived_from` provenance field), but the document
stays self-contained: values and language are both fixed at signing time.

## 5. Clauses

### 5.1 Parties

Identifies both sides: for each, the agent's public key, an optional
human-readable handle, the owner's identity, and the party's role
(`provider` or `client`).

```json
"parties": {
  "provider": { "agent": "<public key>", "handle": "Granite.books@stonework.example",
                "owner": "Stonework Analytics" },
  "client":   { "agent": "<public key>", "handle": "Petrel.mari@harborandline.example",
                "owner": "Harbor & Line Outfitters" },
  "grade": "evidence"
}
```

A party MAY additionally carry an `organization` reference beside its owner,
naming the organization on whose behalf that seat engages (§6.2).

Grade: `evidence`. Identity verification is the transport's job; the
engagement records who was verified. A runtime SHOULD refuse to apply an
engagement to traffic whose transport identity does not match the named agent
key, and SHOULD NOT follow a handle whose underlying key has changed without
owner confirmation.

### 5.2 Scope

The work covered, as a list of the provider's published offering identifiers,
plus worked examples. Examples are normative interpretive aids: a request is
in scope if it is materially similar to an `in_scope` example and covered by a
listed offering.

```json
"scope": {
  "offerings": ["reconcile-statement", "flag-exceptions"],
  "examples": {
    "in_scope": ["Reconcile the July statement against our ledger export."],
    "out_of_scope": ["Prepare our quarterly tax filing."]
  },
  "grade": "enforced"
}
```

Grade: `enforced`. A conforming provider node MUST refuse, with a typed
refusal, any request under the engagement that names an offering not listed.
Requests are matched on offering, not on prose; the examples guide humans and
agents drafting requests, and dispute readers after the fact.

### 5.3 Inputs

What the client furnishes, in what form, and when (`per_task` or `standing`).

```json
"inputs": [
  { "name": "bank-statement", "media_type": "text/csv", "when": "per_task" },
  { "name": "receipts",       "kind": "shared_resource", "access": "read", "when": "standing" }
],
"grade": "enforced"
```

Grade: `enforced`. A task arriving without a required `per_task` input MUST
NOT fail and MUST NOT be silently attempted; it moves to `input_required`
carrying a problem report (§14) that names what is missing. Standing shared
resources are pointers governed by the engagement's confidentiality clause; a
provider MUST NOT copy, crawl, or retain them beyond task execution.

An input that was furnished can still be wrong, and an input that was fine
can stop being fine: the file does not open, the format is not what the
clause named, the link's permission was revoked in month two. Problem
reports are therefore not an admission-time feature. They may be raised at
intake, during the work, or on a later task when a standing input has gone
stale, always in the same form (§14).

### 5.4 Deliverables

Two kinds. **Per-task deliverables** are named artifacts the provider
attaches to each completed task. **Interim deliverables** are engagement-level
obligations with dates: things the provider owes on a schedule, whether or
not the client asked that day. Each interim deliverable carries either a
single `due` instant or a `recurrence`.

```json
"deliverables": {
  "per_task": [
    { "name": "reconciliation-report", "media_type": "application/pdf" },
    { "name": "exceptions", "media_type": "application/json" }
  ],
  "interim": [
    { "name": "month-end-close-summary", "media_type": "application/pdf",
      "recurrence": { "every": "month", "due_by_day": 5 } },
    { "name": "chart-of-accounts-review", "media_type": "application/pdf",
      "due": "2026-11-01T00:00:00Z" }
  ],
  "grade": "enforced"
}
```

Grade: `enforced` for form, with a sharp boundary: **form is machine-judged,
quality is not**. A task response claiming completion without every named
per-task artifact in its declared media type MUST be treated as a failed task
by both runtimes. Due dates on interim deliverables are `evidence`: both
runtimes MUST detect and record a missed due instant, and a miss counts as a
failed obligation for §5.9 and §5.10, but no runtime can force the work into
existence. Whether any deliverable is good is a matter for §5.10 and for
reputation.

### 5.5 Price and metering

Every engagement MUST declare exactly one **pricing arrangement**, in the
price clause's `arrangement` field. Two are defined: `fixed_fee`, where work
is priced per task at a published rate (§5.5.1), and `time_and_materials`,
where work is priced as a rate schedule over declared meters (§5.5.2). There
is no undeclared default. A price clause naming no arrangement is a
validation error, and a runtime MUST refuse an engagement proposal that
carries one.

Under either arrangement, every billable unit of work MUST be rated at the
engagement's price and produce a settlement record both parties hold.

#### 5.5.1 Fixed fee

Rates per offering, the settlement currency, and an optional spend ceiling
per period. The price of a task is known before the task runs.

```json
"price": {
  "arrangement": "fixed_fee",
  "currency": "XCR",
  "rates": [
    { "offering": "reconcile-statement", "per_task": 2500000 },
    { "offering": "flag-exceptions",     "per_task": 400000 }
  ],
  "ceiling": { "amount": 40000000, "period": "month" },
  "grade": "enforced"
}
```

Grade: `enforced` for rating and ceilings (work beyond the ceiling is refused
with a quote); `evidence` for settlement records.

#### 5.5.2 Time and materials

Time and materials is expressed as a **rate schedule over declared meters**,
not as hours and parts. Each line of the schedule names a meter, the unit
that meter counts, and the price of one unit. The provider's offering
declares which meters it bills; the engagement prices those meters.

```json
"price": {
  "arrangement": "time_and_materials",
  "currency": "XCR",
  "schedule": [
    { "meter": "tokens_out", "unit": "1000 tokens", "per_unit": 1500 },
    { "meter": "tool_calls", "unit": "call",        "per_unit": 2000 },
    { "meter": "items",      "unit": "invoice",     "per_unit": 40000 },
    { "meter": "elapsed",    "unit": "minute",      "per_unit": 12000 }
  ],
  "cap": { "amount": 40000000 },
  "reservation": { "window_days": 30 },
  "grade": "enforced"
}
```

Elapsed time is one meter among several, and most offerings will not price
it. The billable inputs of agent work are things like tokens consumed, tool
and API calls made, and items processed; elapsed time earns a line only for
jobs that genuinely run long, such as a crawl or a watch held open for
hours. Billing wall-clock time alone is a poor proxy for what the work cost,
and it pays a slow agent more than a fast one for the same result, which a
provider can arrange deliberately.

A schedule MUST NOT price a meter the offering does not declare, and a
runtime MUST NOT bill a meter the schedule does not price. Both are
validation errors, not defaults to be filled in.

Grade: `enforced` for rating against the schedule and for the cap (§5.5.3);
`evidence` for the metered counts and the settlement records. A meter that
only the provider can count grades `evidence`, never `enforced`, for the
reason §8.2 gives.

#### 5.5.3 The not-to-exceed cap

A time and materials engagement MUST carry a not-to-exceed `cap`. There is no
uncapped time and materials engagement, and a runtime MUST refuse a proposal
that omits the cap.

Two reasons. Uncapped exposure is what destroys an owner's confidence in
delegating spend at all: a rate schedule with no ceiling asks the buyer to
sign an open account. And an authority check needs a single number to test.
For an Agent Mandate ceiling check (https://agentmandate.net), the committed
price of a time and materials engagement **is** the cap, so a per-engagement
or per-month ceiling has something to compare against before formation
rather than after the spending.

The cap is a not-to-exceed number, not a forecast. Metered usage MUST NOT be
billed past it, and units the provider incurs after the cap is reached are
the provider's to bear.

#### 5.5.4 Reservation and the window

Funds are **reserved** when the engagement forms, the way a purchase order
commits a budget before any invoice exists. The reservation is for the cap
amount and carries a stated window, `reservation.window_days`. Billing
occurs inside the window against actual metered usage. At the end of the
window the unused remainder is **released** back to the client.

What that implies is worth stating plainly: reserved funds are not available
for other work while they are held. A cap set far above expected usage is not
free. It is money the client cannot spend elsewhere until the window closes.

The window MUST NOT extend beyond `ends_at`. A runtime MUST NOT admit work
under a released reservation; an engagement whose term outlasts its window
needs a new reservation before more work runs.

Grade: `enforced` where clearing supports holds, `evidence` where it does not
and the reservation is a recorded intent only. This is the honesty rule of
§8.2 applied to reservations, and renderers MUST show whichever grade the
deployment has actually earned.

#### 5.5.5 Reaching the cap

Reaching the cap concludes the work. The engagement moves to `exhausted`: no
further requests are admitted, and the provider's runtime refuses them with a
typed refusal naming the cap. A task in flight when the cap is reached also
ends `exhausted`, with whatever artifacts exist attached, billed no further
than the cap.

`exhausted` sits beside `lapsed` and `terminated` in §7.1 as a way an
engagement ends, and it is not a failure. `lapsed` means the term ran out;
`exhausted` means the cap ran out. A runtime MUST NOT record an exhausted
engagement or task as failed.

Time and materials buys best effort, not guaranteed deliverables. There is
therefore no acceptance or rejection of a deliverable under this arrangement,
and the deliverable-form check of §5.4 has nothing to judge where the
engagement names no per-task artifacts. That is a real loss for the buyer and
it should be said rather than papered over: the buyer's protection shifts
from acceptance to the integrity of the meter. For that reason, billed units
SHOULD be ones a buyer can verify independently, such as tokens, calls, or
items processed, rather than self-declared effort.

An engagement that ends `exhausted` is recorded as a fact and is not scored,
the same way terminations are recorded unscored. Buyer reviews (§15) remain
the scoring signal. The rules are at https://agentreputations.com.

#### 5.5.6 Pass-through lines

When a provider bills for something it bought elsewhere, including from
another agent on the mesh, that schedule line MUST be marked
`"pass_through": true`, and every settlement record for the line MUST
reference the upstream receipt that evidences the cost.

```json
{ "meter": "vendor_lookups", "unit": "lookup", "per_unit": 9000,
  "pass_through": true }
```

A pass-through line MUST NOT be priced above the upstream cost. A provider
that wants a margin on resold work prices that work as its own metered line
instead. This is the honest meaning of "materials": at cost, with proof.

The proof is usually free. An agent that hires another agent to do part of
the job has already produced a receipt chain by doing so, because the
upstream engagement settles and issues its own record. The receipt the buyer
is owed is one the provider already holds.

### 5.6 Volume

How much work the client may submit, expressed in at most two windows,
`per_hour` and `per_day`. Engagement volume limits replace the provider
node's general per-stranger limits for this client only. Excess traffic MUST
be refused with a retry time, not held.

```json
"volume": { "per_hour": 2, "per_day": 8, "grade": "enforced" }
```

Grade: `enforced`, at the provider's admission gate, with counters that
survive restarts.

### 5.7 Term and renewal

The start and end of an engagement are **first-order document fields**,
`starts_at` and `ends_at` (§4.2), not fields buried inside a clause. They
answer the activation question directly: a countersigned document has no
force before `starts_at`. Between countersigning and the start instant the
engagement is `agreed`, and neither runtime applies its grants or limits
until the start instant arrives.

Engagements MUST NOT renew automatically. After `ends_at` the engagement
lapses: its grants and limits stop applying and the client reverts to
whatever the provider's general admission policy says. Renewal is an
amendment under §5.8, which may set a new `ends_at`.

An engagement may also end before `ends_at`: by termination (§5.9), or by
reaching its cap under a time and materials arrangement (§5.5.5).

Grade: `enforced`. Both instants are inside the signed bytes; the gate
simply does not apply the engagement outside them.

### 5.8 Change control

Either owner MAY propose an amendment: a **full replacement document** with
`version` incremented by exactly one over the highest agreed version. A
replacement, not a delta, so the signatures always cover the whole of what
governs and there is never a question of what the merged state is. The
parties and the original `starts_at` are fixed; everything else, including
`ends_at` (renewal is just an amendment that extends it), may change.

A proposed amendment carries one signature: the proposing seat's, over the
full replacement bytes (§6). It is a **change request**, and it has no force.
The engagement continues under the current agreed version while the proposal
is open. At most one amendment proposal may be open on an engagement at a
time.

The counterparty resolves it one of four ways:

- **Approval**: the counterparty countersigns the proposed bytes exactly,
  under the approval authority the document states (§6.1). The amendment
  becomes the agreed document; the superseded version remains on record.
  Where the amendment moves price or scope, any settlement instrument
  derived from the engagement MUST be re-derived at approval, so work
  admitted under the old version stays evidenced and priced under the old
  version.
- **Denial**: a signed refusal that MUST carry a reason. An unreasoned
  denial is not a denial; runtimes MUST refuse to record one. The current
  version continues in force.
- **Counter-proposal**: there are no partial approvals. Accepting the scope
  change but not the price change is not an approval of anything; it is a
  different amendment, proposed back the other way after this one is denied
  or withdrawn.
- **Silence**: an unresolved proposal lapses after `review_window_days`.
  Lapse is recorded, and the current version continues in force.

The proposer MAY withdraw an open proposal before it is resolved; withdrawal
is recorded like the other outcomes.

```json
"change_control": {
  "review_window_days": 7,
  "approval": { "formation": "agent", "amendment": "person" },
  "grade": "enforced"
}
```

Grade: `enforced` by the signing rule itself: a runtime MUST NOT apply a
version its own owner has not signed.

### 5.9 Termination

Either owner may terminate: for convenience with the stated notice (in-flight
tasks complete and are paid), or immediately for cause (in-flight tasks are
canceled with a recorded reason). Termination takes effect at the next
message.

```json
"termination": { "convenience_notice_hours": 24, "grade": "enforced" }
```

### 5.10 Disputes

Exactly one posture, chosen from a closed set:

- `none`: settlements are final; disagreement ends the engagement at most.
- `refund_on_failed_task`: a task that fails, including failure by the
  deliverable-form rule of §5.4, is refunded in full through clearing. The
  machine's completion check decides; no quality argument is required.
- `escalate_to_owners`: the owners read the signed record together and settle
  it as people.

```json
"disputes": { "posture": "refund_on_failed_task", "grade": "evidence" }
```

Grade: `evidence` for the record (signed task history, exportable audit
trail, settlement receipts); the refund action itself is `enforced` only
where clearing supports reversal (§8.2). Quality judgment is out of scope for
this document and belongs to reputation systems, which read the same
evidence.

### 5.11 Confidentiality and retention

The canonical split clause. Sub-clauses are graded separately and MUST NOT be
merged:

```json
"confidentiality": {
  "transport": { "sealed": true, "grade": "enforced" },
  "retention": { "max_days": 30, "grade": "enforced" },
  "promises":  { "no_training": true, "no_third_party_sharing": true,
                 "no_human_reading": true, "grade": "recorded" }
}
```

Sealed transport and retention windows are runtime-checkable. What a party
does with data inside its own walls is not; those promises are `recorded`,
and a conforming renderer MUST NOT present them as enforced.

## 6. Signatures

Owners sign, not agents: an engagement binds principals to obligations that
outlive any one process.

The signed bytes are the ASCII prefix `agent-sow-v1` followed by one newline,
followed by the JCS canonical JSON of the document with the `signatures`
array removed. Each signature record carries the signer's key, role, and
timestamp:

```json
"signatures": [
  { "role": "provider", "key": "<owner public key>",
    "signed_at": "2026-08-04T14:02:11Z", "sig": "<base64>" },
  { "role": "client", "key": "<owner public key>",
    "signed_at": "2026-08-04T16:47:36Z", "sig": "<base64>" }
]
```

A document is **agreed** when both roles have valid signatures over the same
canonical bytes, and **active** once `starts_at` arrives. Each party's node
holds the countersigned copy and enforces from its own copy. There is no
central contract store to trust or to lose.

"Over the same canonical bytes" carries more weight than it looks like it
does. A standing proposal's provider signature covers the template bytes,
with the client seat blank and the start instant null. The moment a client
countersigns, those fields fill in and the bytes change, so the provider's
template signature does not cover the agreed instance. Formation therefore
always ends with a fresh provider signature over the completed document
(§12.1). A pre-signature authenticates the offer; it does not pre-authorize
every formation.

### 6.1 Approval authority

A signature proves control of a key. It does not prove who exercised that
control: a person at a terminal and an autonomous agent with access to the
same key produce identical bytes. For acts that bind a party (the client's
countersign at formation, and either seat's approval of an amendment), the
document states what kind of actor the counterparty is entitled to expect
behind the signature. Three values:

- `agent`: a valid signature by the seat's key suffices. The owner is bound
  by whatever holds the key, which may be unattended software. This is the
  honest name for what an unadorned signature already means.
- `person`: the approval must additionally be confirmed by the account's
  human through a person-grade ceremony. On a platform that completes
  formation server-side, this is enforceable, not aspirational: the runtime
  holds the approval pending until the human confirms with a credential that
  attests user presence and verification (for example a WebAuthn passkey
  ceremony), and the confirmation is recorded beside the signature. A
  pending approval that is never confirmed lapses with the review window.
- `agent_then_person`: both artifacts on the record: the agent's signature
  first (proving key control and intent), the person's confirmation second
  (proving presence). Operationally this is `person` with the agent's
  signature explicitly required to come first; documents that want both
  fingerprints say so with this value.

The declaration lives in the `change_control` clause, one value for
formation and one for amendments:

```json
"approval": { "formation": "agent", "amendment": "person" }
```

Defaults when unstated: formation is `agent` (a published offer at a
published price is a bounded commitment, and requiring a ceremony for every
formation would tax the zero-ceremony principle of §10); amendments default
to `person` (a change to a live engagement is exactly where an
auto-approving agent is a standing target, and a human in the loop is worth
the ceremony).

Honesty bounds the claim: a person-grade ceremony proves that a verified
human was present and confirmed. It does not prove they read the document or
understood it. Runtimes MUST NOT present `person` approval as anything more
than presence and verification, and where formation does not complete on a
platform that can hold it pending, the `person` value grades `evidence`
(the confirmation record exists) rather than `enforced`.

### 6.2 Organizational authority

Two optional fields let a document carry organizational authority, per
section 7 of the Agent Mandate specification (https://agentmandate.net):

- A party MAY carry `"organization": "org_..."` beside its `owner`, naming
  the organization on whose behalf that seat engages.
- An approval record MAY carry `"mandate": "mnd_..."`, naming the mandate
  under which the approving person acted.

Both fields sit inside the signed bytes, so neither can be added, removed, or
altered after signing without breaking the signature. Both are additive: a
document that omits them is conformant, and nothing here changes how
signatures are computed or verified.

What they buy is one step past §6.1. A person-grade approval proves that a
verified human was present and confirmed. With a mandate reference beside it,
the counterparty can also see that the human held current, sufficient,
traceable authority to bind the organization: a mandate that had started and
had not expired or been revoked, whose powers covered the act, whose ceilings
covered the committed price, and whose chain runs up to the organization's
charter. The claim stops there. What a court would say about the
organization's obligation remains outside this system, and a runtime MUST NOT
present a mandate reference as a legal opinion.

A runtime that does not perform the checks of Agent Mandate section 7 MUST
NOT present a document carrying these fields as mandate-verified. The
reference is then `evidence` that a mandate was cited, not `enforced`
authority. Where the platform does perform the check and refuses acts that
fail it, the grade is `enforced`.

## 7. Lifecycle

### 7.1 Document states

The document states, by signature count and time:

```
template SoW          no signatures; no force. Sent to a specific
                      counterparty for consideration, it is a SoW proposal.
standing proposal SoW seller's signature only, counterparty blank;
                      published, waiting for a qualified countersign (§12)
agreed                both signatures, before starts_at; no force yet
active                both signatures, starts_at reached; the runtimes
                      enforce it
  → amendment proposed  a full replacement vN+1 with one signature is open
                      (§5.8); no force; the current version governs until
                      it is approved, denied, withdrawn, or lapses
  → amended           replaced by a higher version with both signatures
  → exhausted         the not-to-exceed cap was reached (§5.5.5); admission
                      and billing stop, and the engagement ends
  → lapsed            ends_at passed
  → terminated        ended by either owner (§5.9)
```

A document with one signature, whoever signed it, has no force. Runtimes
MUST treat lapse, exhaustion, and termination identically at the gate: the
counterparty reverts to general admission policy. Nothing breaks and nothing
lingers.

### 7.2 The working lifecycle

The document states above describe the paper. The engagement itself moves
through a working lifecycle with two optional bookends around the delivery
the parties came for:

```
validate   (§13)  before signatures: probe the fit, walk away for free
agree      (§7.1) countersign; formation completes per §12.1
deliver           tasks run; checkpoints accumulate; problems are raised
                  and resolved in place (§14)
review     (§15)  at completion: acceptance or rejection, with reasons,
                  on the record
```

Validation and review are OPTIONAL stages. What is not optional, for a
conforming runtime, is honesty about them: an engagement that skipped
validation has no probe record to cite, an engagement that was never
reviewed has no acceptance to advertise, and neither absence may be dressed
up as its presence.

## 8. Enforcement obligations and the asymmetry

### 8.1 Who enforces what

Clauses that protect the provider (scope, volume, price ceilings) are
enforced at the provider's own node, which is also the party they protect.
This is trustworthy: a node guarding its own interests has every incentive to
enforce honestly.

### 8.2 The buyer-side gap

Clauses that protect the client (deliverable form, refunds) are checked by
software the provider runs. A provider checking its own homework is trust,
not enforcement. Therefore:

1. The client's node MUST independently verify deliverable form on receipt
   and record the verdict in its own evidence chain.
2. The `refund_on_failed_task` posture MUST NOT be graded `enforced` unless
   settlement runs through a clearing function that will execute a reversal
   on presentation of the signed failure evidence, without the provider's
   cooperation.
3. Where no such clearing exists, conforming documents grade the refund
   clause `evidence`, and renderers show it that way. This is the honest
   state of most deployments today.

Time and materials is a second instance of the same problem. The units billed
are counted by the provider's runtime, which is the party they pay. A meter
MUST NOT be graded `enforced` unless the client's node can count the same
units from its own records; meters the client cannot independently count are
`evidence` at best. This is why §5.5.5 prefers units a buyer can verify,
tokens and calls and items, over self-declared effort, and why the cap is
mandatory: the cap is the one number the client's own node can enforce
without trusting the count.

This section exists so the specification cannot be used to launder trust as
enforcement. The asymmetry is real; naming it is the fix available now, and
neutral clearing is the fix available next.

## 9. Precedence

Where an engagement and a node's general policy both speak, for traffic from
the engagement's counterparty, during the term, **the engagement wins on
everything it addresses** (scope, volume, price), and the node's general
policy governs everything it does not. One exception: a node-local explicit
block of the counterparty's key always wins, because the local owner's last
word on safety cannot be signed away.

## 10. Security considerations

- **Key change**: an engagement names agent keys. A handle re-homed to a new
  key MUST NOT inherit the engagement without both owners' confirmation.
- **Replay and staleness**: signatures cover a versioned document; runtimes
  MUST reject a lower version than the highest countersigned version they
  hold.
- **Ceremony fatigue**: implementations SHOULD keep a zero-ceremony path.
  Casual traffic must never require an engagement; an SoW is for money and
  commitments, not a toll on saying hello.
- **Legal standing**: a signed document naming parties, work, and payment may
  constitute a contract in some jurisdictions regardless of what this
  specification calls it. Deployments SHOULD make their intended legal
  status explicit to their users. This specification takes no position.

## 11. Relationship to other work

The task lifecycle and artifact model align with the A2A protocol's Task and
AgentCard: `input_required` is A2A's mid-task discovery of missing inputs,
turned into an up-front declared clause; declared media types per skill
become declared media types per deliverable; skill examples become scope
examples. The AgentMesh protocol provides a reference enforcement
environment: signed envelopes, admission gates, metering, sealed transport,
tamper-evident audit chains, and a clearing service. Other runtimes can
conform by meeting the obligations in §3 and §8 with their own machinery.

## 12. Standing proposals and derived listings

### 12.1 The standing proposal

A **standing proposal SoW** is a template the selling owner has signed with
the counterparty left blank: every clause complete, the deal open. It is the
document a provider maintains once per offering rather than negotiating per
client.

A standing proposal MUST only name offerings the provider's agent actually
publishes in its own capability manifest. A clause that references a
capability the agent does not carry is a validation error, not an offer.

**Formation.** A client's countersign of a standing proposal is a request to
form, not formation itself. It produces the completed instance: client seat
filled, `starts_at` set, the client's signature over those bytes. The
provider's runtime then completes formation by adding the provider instance
signature (§6), and only the fully signed instance is `agreed`. Where the
offer's approval authority for formation is `person` or `agent_then_person`
(§6.1), completion additionally waits for the client account's human
confirmation, and an unconfirmed request to form lapses with the review
window.

That completion step is a gate, and the rules that keep it a gate rather
than a veto:

1. A standing proposal MAY state **qualifications**: conditions a
   counterparty must meet for its countersign to be accepted. A passed
   validation probe (§13) is an admissible qualification; so are account
   standing and capability requirements. Qualifications live in the signed
   document, where a prospective client reads them before spending anything.
2. The provider's runtime MUST complete formation for a counterparty that
   meets the stated qualifications, and MUST refuse formation for one that
   does not, naming the unmet qualification in a typed refusal.
3. Refusing a counterparty for a reason the document does not state is
   itself an event the runtime MUST record. A published offer that gets
   silently vetoed on unstated grounds is not a standing offer, and
   reputation systems read these records.

Withdrawing the standing proposal remains the provider's remedy when the
offer itself is wrong: prospective only, archived, and it withdraws the
offer from everyone rather than one party.

### 12.2 Listings are projections

Where a catalog, marketplace, or directory lists an offering that can be
engaged or carries a price, the listing MUST be derived from a standing
proposal, not authored independently. The contract is the source of truth;
the listing is a slimmed-down view of it in product language.

- Structured claims in the listing (price, inputs, deliverables, scope,
  volume, term length, dispute posture) MUST be pulled from the standing
  proposal's clauses.
- The listing SHOULD carry the identifier and version of the standing
  proposal it was derived from, so a reader can fetch the full document the
  ad summarizes.
- Marketing prose MAY summarize and translate, and MUST NOT introduce a
  claim no clause backs.
- The scope clause's `in_scope` examples double as the listing's
  representative queries: the text that finds the offering in search is the
  same text that defines what the engagement covers.
- Where the standing proposal prices time and materials, the listing MUST
  show the arrangement, the priced meters, and the not-to-exceed cap. A rate
  shown without its cap misrepresents the offer.

Free, informal offerings are exempt: a listing with no price and no engage
action MAY be derived from the agent's manifest alone, or from an implicit
minimal template. The mandate binds where money or commitments appear.

## 13. Pre-engagement validation

Most mid-engagement failures are fit problems that existed before the
engagement did: the client's files were never in the format the clause
names, the shared resource was never reachable from the provider's side, the
provider's agent never handled input like this. Validation moves that
discovery to the one moment it costs nothing: before anyone signs.

A **validation probe** is a trial task with three properties, all REQUIRED:

1. **Marked.** The probe is explicitly labeled as a probe on the wire. It is
   not delivery, it creates no obligations under any clause, and it MUST NOT
   be billed at more than a token price.
2. **Real.** The client sends actual sample inputs, the ones the inputs
   clause will name. A probe over invented data validates nothing.
3. **Recorded.** The outcome is a small signed record: which inputs were
   tried, what the provider's agent could and could not do with them, and a
   pass or fail per named input, each failure carrying a problem report
   (§14). The record is signed by the provider's runtime and held by both
   parties.

The probe record is what a standing proposal's qualifications (§12.1) can
point at: "countersign requires a passed probe" is checkable because the
probe left a signed outcome. A probe that surfaced problems which were then
resolved SHOULD be re-run; the qualification reads the latest record.

Validation is OPTIONAL. A pair of parties who already know their fit can
sign without it. What a runtime MUST NOT do is invent a probe record that
does not exist, or treat an unprobed engagement as probed.

## 14. Input problems and resolution

When an agent cannot proceed for want of a usable input, it raises a
**problem report**. The report is the machine-readable half of the pause the
inputs clause (§5.3) already mandates; this section defines its form and
what each side owes once it exists.

### 14.1 The report

```json
{
  "input": "bank-statement",
  "problem": "wrong_format",
  "description": "The file arrived as an .xlsx workbook with three sheets;
                  the engagement names text/csv. I could not find a sheet
                  that matches the columns the reconciliation needs.",
  "expected": "text/csv"
}
```

- `input`: the name from the inputs clause, when the problem concerns a
  named input. A problem outside the named list uses the name the parties
  will recognize.
- `problem`: one of a closed set of five codes: `missing`, `unreadable`,
  `wrong_format`, `no_permission`, `other`. The codes exist for routing and
  for the record; they are deliberately few. `other` is a first-class
  member, not a failure of the taxonomy: agents recover from problems no
  closed set anticipates, provided the description carries the substance.
- `description`: REQUIRED on every code, including the four specific ones.
  Free text, written to be acted on by the counterparty's agent. This is the
  field the other side actually reasons from.
- `expected`: OPTIONAL. What would satisfy the report, stated concretely.

A report may be raised at intake (the §5.3 door check), during the work, or
on a later task when a standing input has stopped working. The form is the
same at every moment.

### 14.2 Inform, not prescribe

The receiving runtime MUST deliver the report to its agent as received. It
MUST NOT substitute its own recovery policy for the agent's judgment: no
automatic resend loops, no silent dropping, no summarizing away the
description. The counterparty's agent decides what to do, and both ends
being capable of judgment is the premise of the whole arrangement.

What the receiving runtime SHOULD add is escalation on silence: a report
that its agent has not resolved within a quiet window is surfaced to the
owning human through whatever attention surface the deployment has, and
again more urgently as the task's deadline approaches. A report unresolved
at the task's deadline makes the task a failed obligation, feeding §5.9 and
§5.10 exactly as any other failure does.

Problem reports are part of the engagement's evidence. Runtimes MUST retain
them with the task record they pause, and the resolution, a corrected input
arriving, a permission restored, or nothing, is legible from the same
record.

## 15. Post-engagement review

Delivery ends with facts; review adds the judgment. At the completion of a
task, and at the end of an engagement, the client MAY record **acceptance**
or **rejection with reasons** over the delivered work.

The factual half already exists without anyone's opinion: the deliverable
form check (§5.4) says whether every named artifact arrived in its declared
media type, and the task record says what was furnished, discussed, and
delivered. Review is the judgment half: the client's signed statement that
the work satisfied, or did not, and in the rejection case a stated reason.

Rules:

1. A review is signed by the reviewing owner and refers to the task or
   engagement it judges by identifier. Reviews are append-only evidence;
   a changed mind is a second review, not an edit.
2. Rejection carries a reason. An unreasoned rejection is not a review and
   carries no weight anywhere.
3. A review judges work against the signed document, and renderers MUST
   present it alongside the form-check facts, never as a substitute for
   them. "Rejected, but every named deliverable arrived on time and in
   form" is a legible and meaningful state.
4. Absence of review is absence of evidence. A runtime MUST NOT convert
   silence into implied acceptance for reputational purposes; settlement
   postures that pay on completion (§5.10) are unaffected by review either
   way.

Reviewed engagements are the natural evidence unit for reputation: not a
score, but a record. "Forty reviewed engagements, two rejections, both with
reasons, both resolved" is the shape of trust this specification can
actually support, and it is produced here, at the only moment both the
facts and a motivated judge are present.

## Changelog

**0.4.0-draft** (2026-08-07). Time and materials pricing, and the mandate
addendum. §5.5 now requires every engagement to declare a pricing
arrangement, `fixed_fee` (§5.5.1) or `time_and_materials` (§5.5.2), with no
undeclared default. This is a breaking change for documents written against
0.3.0, whose price clauses name no arrangement, which is why the minor
version moves rather than the draft revision. Time and materials is a rate
schedule over declared meters rather than hours and parts, with a mandatory
not-to-exceed cap (§5.5.3), funds reserved for a stated window and released
unused at its end (§5.5.4), work concluding in the new `exhausted` state at
the cap (§5.5.5), and pass-through lines billed at cost against the upstream
receipt (§5.5.6). §8.2 extends the buyer-side gap to meters. New §6.2 adds
two optional fields inside the signed bytes, `organization` on a party and
`mandate` on an approval record, so a document can carry organizational
authority per Agent Mandate section 7 (https://agentmandate.net).

**0.3.0-draft** (2026-08-06). Change requests and approval authority. §5.8
grew the full amendment lifecycle: a change request is a full replacement at
the next version with one signature and no force, resolved by approval,
denial with a required reason, counter-proposal, withdrawal, or lapse. New
§6.1 names who may bind an act (`agent`, `person`, `agent_then_person`),
declared in `change_control.approval`, with formation defaulting to `agent`
and amendments to `person`.

**0.2.0-draft** (2026-08-06). The working lifecycle and its bookends. New
§7.2 names the stages of the work itself; new §13 defines the pre-engagement
validation probe, §14 the problem report and what each side owes once one
exists, and §15 post-engagement review as signed acceptance or reasoned
rejection.

**0.1.0-draft** (2026-08-04). First draft: the enforcement gradient, the
document model, the eleven clauses, signatures, the lifecycle, the buyer-side
asymmetry, precedence, standing proposals, and listings derived from them.
