# ClubFit data feed request

To: JJ Russell (account manager)
Account: Fitness Nation (fitnessnation.clubfit.net.au)

---

Subject: Automating our weekly reporting - what can we pull from ClubFit?

Hey JJ,

Hope you're well mate.

We've just rebuilt our internal weekly dashboard for the club and I'm trying to get us
out of the business of manually punching numbers in every week. Most of what we track
lives in ClubFit, so before I go any further I wanted to run it past you.

I know you guys already push access reports through to Fitness Passport via API, so I'm
hoping we can tap into something similar. Here's what we'd love to pull automatically,
weekly (or daily, whatever is easiest at your end):

1. Membership counts - active DD members, active PIFs, members on suspension, and
   active Fitness Passport members

2. Movements - new joins (DD vs PIF), cancellations (DD vs PIF), and suspensions
   for the week

3. Billing - weekly DD billing total, PIF payments received, PT revenue, and Fitness
   Passport settlements if they're visible to us

4. POS - weekly retail total, plus item-level counts (mainly chasing shake sales
   per week now that we're moving POS across from Retail Express)

5. Attendance - door swipes per week, and class bookings vs capacity so we can
   track utilisation on Reformer, Group Fitness and Spin

Format-wise we're flexible. A read-only API we can poll would be ideal, but a nightly
export (JSON or CSV) pushed to a webhook URL we give you would work just as well.
If some of this doesn't exist yet, happy to jump on a call and figure out what's
possible.

No urgency on this one, but keen to get moving when you are.

Cheers,
Brent
brent@fitnessnation.au

---

## Internal reference - which EOS metric each feed drives

| ClubFit data              | EOS metrics it feeds                                        |
|---------------------------|-------------------------------------------------------------|
| Active DD/PIF counts      | DD Members, PIF Members, ARPM, Churn %, LTV, Avg Weekly Fee |
| Cancellations             | DD/PIF Cancellations, Net Growth, Churn %                   |
| Suspensions               | Member Suspensions                                          |
| FP members                | Fitness Passport Memberships                                |
| DD billing total          | Weekly Membership DD Revenue, Total Revenue                 |
| PIF payments              | PIF Revenue                                                 |
| PT revenue                | PT Revenue                                                  |
| FP settlements            | Fitness Passport Revenues                                   |
| Retail totals             | Retail Revenue                                              |
| Shake item counts         | Shake Sales                                                 |
| Visits                    | Club Visits                                                 |
| Class bookings vs capacity| Premium / Group Fitness / Spin Class Utilisation            |

Once granted, whatever format they provide plugs in through the ClubFit adapter
(src/lib/sync/clubfit.ts) or as metric_value webhooks to the existing zapier-ingest
endpoint. No schema changes needed.
