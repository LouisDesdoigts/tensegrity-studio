# Tensegrity Studio

Local interactive Three.js geometry editor. Includes preliminary rigid-body static equilibrium and local stability analysis; no member-strength assessment.

## Run

Use Node.js 16.17 or newer (a current Node LTS is recommended).

```sh
npm install
npm run dev
```

Open the Local address printed by Vite, normally http://127.0.0.1:5173.
The server binds only to your computer. Stop with Ctrl+C. No runtime CDN or account required.

## Edit

- `src/geometry.js`: geometry formulas and attachment coordinates, in millimetres.
- `src/main.js`: defaults, controls, materials, 3D objects and camera.
- `src/style.css`: layout and visual styling.

Save a file while the development server runs to see changes immediately. Browser controls save locally; Reset restores source defaults. Export downloads parameters and coordinates as JSON.

## Geometry conventions

Y is vertical. Strut angle is measured from horizontal. With length L, angle a and plate separation H:

- Strut rise = L sin(a).
- Equilateral triangle side = 2 L cos(a).
- Lower struts run from each bottom triangle vertex to the next side midpoint, at height L sin(a).
- Upper struts run from the next top triangle vertex to the same midpoint, at height H − L sin(a).
- Three vertical cables connect the corresponding midpoint tips; each length is |H − 2 L sin(a)|.
- Default 45°, 190 mm, 180 mm gives triangle side 268.7 mm and cables 88.7 mm. Lower tips are above upper tips.
- Table width is independently adjustable up to 800 mm. Its minimum is 2 × triangle circumradius + 40 mm for clearance; widening the triangle automatically increases width when necessary. Frames, plate surfaces, brace extensions and corner wires follow this width.
- Eight square perimeter members and six triangular brace members lie at the two plate planes. Six coplanar brace extensions (three per plate) continue outward from the gusset roots to the square perimeter centreline, directly joining the triangular braces to the frames.
- Plate surfaces are opaque and initially hidden to expose the structure. Top view uses an orthographic camera so the projected triangle can be inspected accurately.

The app reports coincident tips and tips beyond the opposite plate plane. The viewer does not animate deformation or calculate collision. The analysis panel checks rigid-body cable equilibrium and local stiffness. Member thicknesses and joints are illustrative.

## Verify / build

```sh
npm test
npm run build
```

Tests check 81 parameter combinations for strut length, equilateral projection and vertical tip pairing. `dist/` contains the bundled production app; serve it using any static HTTP server.

## Joint reinforcement

Six short round struts replace the filled gusset plates. Each runs from a flat triangular brace to the corresponding inclined strut, forming an open triangle using the existing members. “Joint brace length” controls the actual centreline length in mm, with an adjustable 20–90° angle from the plate plane (90° is vertical). The foot moves along the flat brace as the angle changes. Length is limited so the attachment stays within 80% of the main strut length and the foot stays on the triangle side. Illustrative diameter is 5 mm. Upper braces mirror lower braces. The layer toggle is “Joint brace struts”; export includes their endpoints and effective lengths. Joint strength is not assessed.

## Outer corner tension wires

Four vertical wires connect corresponding outer square-frame corners between the two plates. Their length follows plate separation and their positions follow plate width. They have an independent “Outer corner wires” layer toggle and are included in JSON export. Display diameter is 2.2 mm, illustrative only. The analysis panel separately evaluates tension-only equilibrium with specified equal corner tension.

## Named saves

Under Saved designs, enter a name and click Save named design. Select a saved name and click Load selected design to restore geometry, layer visibility and camera pose/zoom. Saving the same name updates that entry. Named snapshots are separate from the automatically saved working state and survive page reloads in the same browser and local URL. Clearing browser data removes them; use Export geometry JSON for a portable file backup.

## Equilibrium and local stability

`src/analysis.js` uses N, mm and kg. Fix the lower rigid assembly; assign all upper assembly mass to the top plate centre and a point payload to its plane. Input cable axial stiffness directly in N/mm and equal corner-wire tension in N. The selected inner cable tensions solve all six force/moment equations with nonnegative least squares. An exhaustive active-set search (at most six inner cables) selects a minimum-squared-tension feasible solution; a small numerical regularization handles redundancy, with full residual checks. No feasible nonnegative tension solution, near-zero cable length, wrong tip ordering, tips beyond the opposing plate plane, or nonpositive spring rest length prevent a feasible result.

For feasible poses the full six-DOF energy Hessian includes material stiffness, prestress geometric stiffness, rigid rotation second derivatives and dead gravity. A Jacobi eigensolver tests positive definiteness, scaling rotation by half table width. Zero-tension cables or near-zero eigenvalues are marginal, not certified stable. Linear relaxed lateral compliance is shown only for positive-definite cases.

Every input change retunes all cable rest lengths for that design load. This is NOT the response to adding load to cables of fixed rest lengths. Visibility toggles do not remove members. Open-brace parameters do not change rigid-body stiffness. No strength, buckling, joint flexibility, support tipping/sliding, collision or finite-displacement collapse is assessed. “Locally stable” is not a safety rating. Example defaults (5 kg assembly, 10 kg payload, 20 N per corner, 100 N/mm per cable) are assumptions, not measured values.

Tests independently compare the complete analytic Hessian against finite differences of the spring/gravity energy, check known stiffness and tension values, eccentric load moment balance, infeasible and slack cases, and eigenvalues. Reference: https://www.sciencedirect.com/science/article/pii/S0020740325009725

## Cable configurations

Select matching tips (3 inner cables), next adjacent tips (3 cyclic connections), or both adjacent tips (6 inner cables). Each lower tip connects to the next upper tip cyclically in the 3-adjacent case; the six-cable case adds the opposite cyclic direction. Four outer corner wires remain. Crossings are not connection nodes and finite cable diameter/collision is not assessed. Named saves and exported geometry retain the routing.

At 45°, 190 mm struts, 180 mm separation and 500 mm width, with the example load/tension settings, matching tips and six adjacent cables are locally stable in the ideal model; three cyclic cables cannot balance the yaw moment at the displayed pose. This does not rule out a different rotated equilibrium, which this fixed-pose check does not search for. Six-cable tensions may be redundant; the selected minimum-norm solution is not a search for the most stable prestress.

## Assembly inspection

The Assembly selector above the model isolates the top or bottom assembly. Each view retains that assembly’s square frame, flat braces and extensions, inclined struts, joint braces and optional plate surface. All connecting cables are hidden. The top assembly is translated down for inspection without changing its orientation (its arms still point downward). Geometry dimensions and analysis continue to refer to the complete table. Use orbit, Top, Front and Fit to inspect; the existing layer toggles remain active. These are assembly inspection views, not dimensioned fabrication drawings.

Custom configurations: select “Custom configuration” under Design family. Supports 2–6 legs per rigid assembly, straight or hook paths, square-relative root spread (100% reaches the frame), layout rotation, shared X/Z tip shifts, matching/offset/both-neighbour cables, and 0–8 equally spaced outer wires with adjustable spread. The original triangle family remains available and old saved designs default to it. New parameters are included in named saves and JSON exports.

In custom mode the reference angle/length controls specify vertical rise only; actual leg path lengths and cable length ranges appear below the viewer. A hook consists of an upright and horizontal arm, not a curved bend. Upright lean controls how much of the horizontal reach happens before the elbow; 0% makes it vertical and can overlap the opposite upright. The default is 25%. Inset outer wires require rigid plate attachment or additional support members. The equilibrium solver accounts for the actual outer-wire force and moment contributions, including asymmetric counts. It still assumes perfectly rigid assemblies: changing a leg path without changing cable endpoints cannot measure hook bending, strength, joint stiffness, or contact. Crossings are not connections.
