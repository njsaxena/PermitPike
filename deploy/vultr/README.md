# Deploy PermitPike on Vultr

Vercel serves the web app and calls the two Vultr services over HTTPS. Caddy
publishes `POST /review`, `POST /score`, and `GET /health`. The agent and risk
containers use Docker's private network. The risk image includes the trained
model, and the web app looks up contractor history in Tiger Data before scoring.

## Prepare the VM

1. Open the existing Vultr instance in the console and verify its public IP.
   If SSH times out, use **View Console** to check that SSH is listening and
   that both the Vultr firewall and the VM firewall allow port 22 from your
   address. Allow public TCP 80 and 443 for Caddy. [Vultr SSH troubleshooting](https://docs.vultr.com/support/products/compute/how-to-troubleshoot-ssh-connectivity-issues)
2. Point a backend DNS name such as `backend.permitpike.us` at the VM. Use an
   `A` record for IPv4 and add `AAAA` only if IPv6 is configured and reachable.
   Caddy uses that name to obtain and renew TLS certificates. [Caddy HTTPS requirements](https://caddyserver.com/docs/automatic-https#overview)
3. Install Docker Engine and the Compose plugin on the VM, then check out the
   release you want to run. [Docker Engine for Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

## Start the services

Create `/etc/permitpike/vultr.env` on the VM with permissions `0600`, using
[the environment template](.env.example). Set `DEPLOY_HOST` to the DNS name
without a scheme or path. Generate a strong random `AGENT_SHARED_SECRET` and
set `GOOGLE_GENERATIVE_AI_API_KEY` to a key with access to `GEMINI_MODEL`.
The Compose configuration passes the Gemini key only to the agent.

From the repository root on the VM, run:

```sh
sudo docker compose --env-file /etc/permitpike/vultr.env -f deploy/vultr/compose.yaml config --quiet
sudo docker compose --env-file /etc/permitpike/vultr.env -f deploy/vultr/compose.yaml up -d --build --wait
sudo docker compose --env-file /etc/permitpike/vultr.env -f deploy/vultr/compose.yaml ps
```

To inspect startup failures, run `logs --tail=100 agent risk caddy` with the same
Compose options. To update the deployment, check out the new release on the VM
and rerun `up -d --build --wait`.

## Connect Vercel

Add these variables to the PermitPike project in a branch-scoped Preview
environment first. Use the same settings for Production after the preview
passes its end-to-end check. [Vercel environment variables](https://vercel.com/docs/environment-variables)

| Variable | Value |
| --- | --- |
| `AGENT_URL` | Backend origin, for example `https://backend.permitpike.us` |
| `RISK_API_URL` | Same backend origin |
| `AGENT_SHARED_SECRET` | The exact value configured on Vultr, stored as a Vercel Secret |

Redeploy after saving the variables. The web app uses `AGENT_URL` when set and
falls back to the Vercel service binding when it is empty. The web app needs its
existing `DATABASE_URL` and Blob configuration. For scoring, confirm Tiger Data
has migration `0003_closure_risk.sql` and the `contractor_stats` citywide row
with `normalized_applicant = ''`. The reviewer workflow stores a null closure
risk if the score is unavailable.

## Verify and cut over

Check that `GET https://<backend-host>/health` returns `status: "ok"` and
`modelVersion: "closure_v1"`. Send a `POST` with an empty JSON object to both
`/review` and `/score` without a secret and confirm each returns HTTP 401.

File a new fictional permit with sample uploads in Preview. Confirm the
reviewer sees extracted fields, a recommendation with cited checks, and the
closure-risk badge. Check that the application is awaiting an official
decision. Once this passes, apply the Production variables and redeploy.

To roll back, remove the external `AGENT_URL` and `RISK_API_URL` from the
affected Vercel environment and redeploy. This returns review traffic to the
bundled agent and disables closure-risk scoring in that environment.
