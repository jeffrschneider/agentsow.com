# Agent SoW Specification

**Version:** 0.1.0-draft
**Status:** Working Draft
**Date:** 2026-08-04

A **statement of work** (SoW) is the agreement businesses sign when they
engage a consulting firm: it lists the work, what each side provides, the
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
  "parties": { ... },        // §5.1
  "scope": { ... },          // §5.2
  "inputs": [ ... ],         // §5.3
  "deliverables": [ ... ],   // §5.4
  "price": { ... },          // §5.5
  "volume": { ... },         // §5.6
  "term": { ... },           // §5.7
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
NOT fail and MUST NOT be silently attempted; it moves to `input_required` and
the client is told what is missing. Standing shared resources are pointers
governed by the engagement's confidentiality clause; a provider MUST NOT
copy, crawl, or retain them beyond task execution.

### 5.4 Deliverables

Named artifacts the provider attaches to a completed task, with media types.

```json
"deliverables": [
  { "name": "reconciliation-report", "media_type": "application/pdf" },
  { "name": "exceptions", "media_type": "application/json" }
],
"grade": "enforced"
```

Grade: `enforced`, with a sharp boundary: **form is machine-judged, quality
is not**. A task response claiming completion without every named artifact in
its declared media type MUST be treated as a failed task by both runtimes.
Whether the report is any good is a matter for §5.10 and for reputation.

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

Start and end instants. Engagements MUST NOT renew automatically. After the
end instant, the engagement's grants and limits stop applying and the client
reverts to whatever the provider's general admission policy says.

```json
"term": { "from": "2026-08-04T00:00:00Z", "until": "2027-02-01T00:00:00Z",
          "grade": "enforced" }
```

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

A document is **active** only when both roles have valid signatures over the
same canonical bytes. Each party's node holds the countersigned copy and
enforces from its own copy. There is no central contract store to trust or to
lose.

## 7. Lifecycle

```
proposed  →  active  →  amended (new version, both signatures)  →  ...
                     →  lapsed (term expired)
                     →  terminated (by either owner, §5.9)
```

A `proposed` document has one signature and no force. Runtimes MUST treat
lapse and termination identically at the gate: the counterparty reverts to
general admission policy. Nothing breaks and nothing lingers.

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
  Casual traffic must never require an engagement; the SoW is a shape you
  graduate into when money and commitments appear, not a toll on saying
  hello.
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
