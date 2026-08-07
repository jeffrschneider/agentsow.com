# agentsow.com

The **Agent SoW** specification and site: a signed, machine-graded statement of
work between two parties whose software agents do recurring work together.

- `SPEC.md` is the authority (v0.9.0-draft).
- `index.html`, `spec.html`, `example.html`, `site.css` are the site, plain
  HTML in the agentmesh.ai family style.
- Hosted at https://agentsow.com from the GCS bucket `gs://agentsow-site`,
  behind the shared load balancer. Deploy with `gcloud storage cp`, then
  always invalidate: `gcloud compute url-maps invalidate-cdn-cache
  agentcatalog-lb --path "/*" --host agentsow.com`. Static sites never run
  on a VM.

The defining idea is the **enforcement gradient**: every clause is graded
`enforced` (violations refused mechanically), `evidence` (signed records
exist), or `recorded` (a promise reputation punishes). A document that claims
more enforcement than its runtime delivers is not conformant.

Developed alongside the AgentMesh protocol; transport-neutral by design.

Site copy style rule: no em dashes.
