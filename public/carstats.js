// Shared by the server (collision physics) and the controller (driving feel). Put this file in /public.
const CAR_STATS = {
    //          top speed   accel/frame   turn rate   mass   stability   hit radius
    //                                                       (spin resistance: higher = spins less)
    Small:  { max: 0.5,  accel: 0.012, turn: 0.045, mass: 1, stab: 1.0, radius: 1.8 },
    Large:  { max: 0.35, accel: 0.006, turn: 0.035, mass: 3, stab: 1.5, radius: 2.6 },   // heaviest
    Luxury: { max: 0.65, accel: 0.010, turn: 0.055, mass: 2, stab: 2.5, radius: 2.2 }    // lighter than Large, but built like a tank
  };
  
  // A, B = { carClass, posX, posZ, rotationAngle, speed }   (speed = signed speed along the car's heading)
  // Returns null if they aren't hitting, else the velocity change, spin and push-apart for each car.
  function resolveCollision(A, B, e = 0.45) {          // e = restitution. 0 = perfectly inelastic (stick together), higher = bouncier/funnier
    const sa = CAR_STATS[A.carClass] || CAR_STATS.Small, sb = CAR_STATS[B.carClass] || CAR_STATS.Small;
    const dx = B.posX - A.posX, dz = B.posZ - A.posZ, dist = Math.hypot(dx, dz), reach = sa.radius + sb.radius;
    if (dist >= reach || dist === 0) return null;
    const nx = dx / dist, nz = dz / dist;                                  // collision normal, A -> B
    const fa = { x: Math.sin(A.rotationAngle), z: Math.cos(A.rotationAngle) };
    const fb = { x: Math.sin(B.rotationAngle), z: Math.cos(B.rotationAngle) };
    const va = A.speed || 0, vb = B.speed || 0;
    const ua = va * (fa.x * nx + fa.z * nz), ub = vb * (fb.x * nx + fb.z * nz);   // speed along the normal
    if (ua - ub < 0.02) return null;                                       // not driving into each other
  
    // momentum is conserved; with e ~ 0 both cars leave moving at nearly the same velocity
    const M = sa.mass + sb.mass;
    const dua = sb.mass * (1 + e) * (ub - ua) / M;                         // change in A's velocity along n (negative)
    const dub = sa.mass * (1 + e) * (ua - ub) / M;                         // change in B's velocity along n (positive)
  
    // whoever carried more speed is the aggressor: they spin less, the car they hit spins more
    const pa = Math.abs(va), pb = Math.abs(vb);
    const roleA = pa > pb * 1.15 ? 0.6 : pb > pa * 1.15 ? 1.4 : 1;
    const roleB = pb > pa * 1.15 ? 0.6 : pa > pb * 1.15 ? 1.4 : 1;
  
    // spin ~ how hard your velocity got changed, softened by the car's stability
    const spinFor = (dv, role, stab, f, sx, sz) => {
      const w = Math.min(0.55, Math.abs(dv) * role / stab * 0.85);          // radians per frame
      if (w < 0.04) return 0;                                              // just a bump
      return (f.x * sz - f.z * sx >= 0 ? 1 : -1) * w;                      // direction depends on which side you were hit
    };
    const overlap = reach - dist;
    return {
      a: { dvx: dua * nx, dvz: dua * nz, spin: spinFor(dua, roleA, sa.stab, fa, nx, nz),    shoveX: -nx * overlap * sb.mass / M, shoveZ: -nz * overlap * sb.mass / M },
      b: { dvx: dub * nx, dvz: dub * nz, spin: spinFor(dub, roleB, sb.stab, fb, -nx, -nz), shoveX:  nx * overlap * sa.mass / M, shoveZ:  nz * overlap * sa.mass / M }
    };
  }
  
  if (typeof module !== 'undefined') module.exports = { CAR_STATS, resolveCollision };