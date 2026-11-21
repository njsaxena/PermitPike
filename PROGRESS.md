13:18 | Nikhil | Trained closure_v1, added scoring API and Vultr Dockerfile, loaded 477,767 Boston permits | Next: announce contract update before pushing branch
13:57 | Nikhil | Integrated closure-risk scoring in web review flow, rebuilt contractor history in Tiger Data, added reviewer badge/details | Next: deploy to Vultr after target access is configured
14:37 | Nikhil | Pushed closure-risk integration branch; Vultr IP times out on TCP 22, 80, 443, and 8000 | Next: restore SSH/firewall access, deploy image, verify public health
# PROGRESS

12:39 | Allegra | Tiger DB live: app tables, boston_permits hypertable + permits_weekly cagg, 3 demo apps seeded, pnpm db:check | load Boston permits CSV, add DATABASE_URL in Vercel
13:35 | Allegra | Property map: /api/parcel on compliance lookup + city parcel GeoJSON, parcel jsonb on applications (migration 0002), "Is this the property?" confirm with candidates, reviewer Property card + queue map toggle, 3 demo parcels cached | announce contract change (Parcel, Application.parcel, parcelId), run db:migrate + seed on Tiger
15:34 | Allegra | EV charger (5 rules) + home battery (4 rules) packs registered; RulePack.addedLoads, loadcalc 120.87 + backup heat; 25 pack tests, 7/7 evals | clear NEC/NFPA 855 VERIFY items, move examples/build.ts onto the new packs
15:57 | Allegra | Permit tracking live: PP-XXXX-XXXX codes (migration 0004 on Tiger), public /track + /api/track/[code] (public view only, leak test, 20/min/IP, 10s poll), programs card by job type, project cost + description into closure risk; filed on live, VM lookup shows In the review queue | Blob store is private: recreate as public so live uploads work
