# Agent SoW Specification

**Version:** 0.2.0-draft
**Status:** Working Draft
**Date:** 2026-08-06

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

Rates per offering, the settlement currency, and an optional spend ceiling
per period. Every completed task MUST be rated at the engagement's price and
produce a settlement record both parties hold.

```json
"price": {
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

Grade: `enforced`. Both instants are inside the signed bytes; the gate
simply does not apply the engagement outside them.

### 5.8 Change control

Either owner MAY propose an amendment: a full replacement document with
`version` incremented. The amendment takes effect only when the counterparty
owner countersigns. Unsigned proposals lapse after the stated review window.
All prior versions remain on record.

```json
"change_control": { "review_window_days": 7, "grade": "enforced" }
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
  → amended           replaced by a higher version with both signatures
  → lapsed            ends_at passed
  → terminated        ended by either owner (§5.9)
```

A document with one signature, whoever signed it, has no force. Runtimes
MUST treat lapse and termination identically at the gate: the counterparty
reverts to general admission policy. Nothing breaks and nothing lingers.

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
signature (§6), and only the fully signed instance is `agreed`.

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
