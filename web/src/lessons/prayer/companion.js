// Ported into the app (add-on 0072) from relay/w1/0071-prayer/src/companion.js as it is: the same figure, poses,
// close-ups and motion. One addition, for leaving the page inside the app: dispose() stops the frame loop and the
// resize observer and gives the WebGL contexts back. The original comments follow.
// The prayer companion, first design «v1» (reply 0071 §4.1 (أ), Talal 22 October 05:06; kept as the approved look by
// add-on 0071-add6, 22 October 15:10): a figure with no facial features on a prayer rug, made here from simple geometry
// in three.js (MIT). Nothing is taken from PrayAlong: no code, no model, no asset.
// The body is a few smooth tubes (torso and a long loose robe) whose rings are rebuilt each frame from a handful of
// joint angles, so a posture is a short list of numbers and the change between two postures is slow and soft.
// v1-plus (add-on 0071-add6) adds, in the same style: shaped feet (heel, sole, five toes that bend at the ball), hands
// with fingers, the tawarruk, and the feet close-up seen by a second camera. The postures are checked by measuring
// the rendered side view (tools/measure.mjs, v1-plus/README.md); each detail's text is named where it is drawn.
// The figure faces +z (the qibla); its right side is -x; the ground is y = 0. The ball of the right foot stays where it
// is in every posture, as the feet do in prayer.
import * as THREE from 'three'

const D = Math.PI / 180
const L = { thigh: 0.43, shin: 0.42, foot: 0.148, toe: 0.05, spine1: 0.25, spine2: 0.25, neck: 0.14, headR: 0.105, upper: 0.29, fore: 0.25, hipHalf: 0.095, shoulderHalf: 0.165 }
const RIGHT = -1 // the figure's right side is -x when it faces +z
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const rotY = (v, deg) => { const a = deg * D, c = Math.cos(a), s = Math.sin(a); return V(v.x * c + v.z * s, v.y, -v.x * s + v.z * c) }
const rotZ = (v, deg) => { const a = deg * D, c = Math.cos(a), s = Math.sin(a); return V(v.x * c - v.y * s, v.x * s + v.y * c, v.z) }
// directions: pitch a in degrees, yaw y turns the forward part toward +x (the figure's left)
const down = (a, y = 0) => rotY(V(0, -Math.cos(a * D), Math.sin(a * D)), y) // from straight down, + forward
const up = (a) => V(0, Math.cos(a * D), Math.sin(a * D)) // from straight up, + forward
const footDir = (a, y = 0) => rotY(V(0, -Math.sin(a * D), Math.cos(a * D)), y) // below the forward horizontal; 180 points back
const BALL = V(RIGHT * L.hipHalf, 0.02, -0.05) // the right foot's ball (the joint at the root of the toes), on the rug
const KNEE_Y = 0.052 // a knee resting on the rug: its centre
const TOE_R = 0.0105 // a toe lying on the rug: its centre

// ---- postures ------------------------------------------------------------------------------------------------
// f: foot (ankle to ball), s: shin (knee to ankle), t: thigh (hip to knee), per side, with yaw y*; tb: the toes' bend
// at the ball ('ground' = laid on the rug, toward the qibla); pr: pelvis roll; trunk1/trunk2: lower and upper back;
// head: from straight up; yaw: head turn (negative is to the right); split: the robe's lower part around each shin
// (tawarruk only); hemAt: where the robe's lower part ends, from the knees (0) to the ankles (1). arms: where the hands rest.
const ZERO = { yfR: 0, ysR: 0, ytR: 0, ytL: 0, ysL: 0, yfL: 0, pr: 0, split: 0, hemAt: 1, protract: 0 }
// kneeling: the robe's lower part ends a little before the ankles (hemAt), so the upright foot shows behind it
const KNEEL_HEM = 0.82
const STANDING = { ...ZERO, fR: 24, sR: 0, tR: 0, tL: 0, sL: 0, fL: 24, tbR: 'ground', tbL: 'ground', trunk1: 0, trunk2: 0, head: 10, yaw: 0 }
// upright feet (sujud 3566 «وهما منصوبتان»; the right foot in iftirash 10906 «وينصب رجله اليمنى»): the heel up, the
// ball and the bent toes on the rug toward the qibla (3230's explanation, 10902's benefits 6 and 7)
const RUKU_PROTRACT = 0.035 // ruku: the shoulder joints along the back toward the neck, metres
const UPRIGHT = 88 // the ankle over the ball: the sole about 68° from the rug
export const POSES = {
  ready: { ...STANDING, head: 6, arms: 'side' },
  takbir: { ...STANDING, head: 8, arms: 'raise' },
  stand: { ...STANDING, head: 16, arms: 'chest' },
  raise: { ...STANDING, head: 8, arms: 'raise' },
  // after rising from bowing (add-on 0072-add6 item 7, Talal's decision on Ibn Baz 6987): the hands raised with the
  // rising (3095), then back on the chest once upright, as in the standing before bowing
  itidal: { ...STANDING, head: 16, arms: 'chest' },
  // the back level, the head in line with it (10906, 10902, 10902's benefits 3); the legs straight with no attributed
  // sentence (add-on 0071-add9 decision 5): the knees almost straight
  ruku: { ...STANDING, tR: 3, tL: 3, sR: -2, sL: -2, trunk1: 90, trunk2: 90, head: 90, arms: 'knees', protract: RUKU_PROTRACT },
  // forehead with the nose on the rug (10925, 3230): the head's lowest point 12° above its forward axis
  sujud: { ...STANDING, fR: UPRIGHT, fL: UPRIGHT, sR: 'knee', sL: 'knee', tR: 12, tL: 12, trunk1: 110, trunk2: 'touch', head: 102, yaw: 0, hemAt: KNEEL_HEM, arms: 'ground' },
  // iftirash: the left foot laid flat and sat upon, the right upright (10906, 10902, 65440)
  sit: { ...STANDING, fR: UPRIGHT, sR: 'knee', tR: 60, tL: 60, sL: -92, ysL: 11, fL: 165, yfL: 30, tbL: -6, trunk1: 4, trunk2: 0, head: 14, yaw: 0, hemAt: KNEEL_HEM, arms: 'thighs' },
}
POSES.tashahhud = { ...POSES.sit, head: 14, arms: 'thighsPoint' }
// the salam: the hands laid on the thighs (no text in our data has the pointing in the salam; 65440's explanation ties
// the fingers' form to the two tashahhuds)
POSES.taslim = { ...POSES.sit, head: 6, arms: 'thighs' }
POSES.tawarruk = tawarrukPose()
// add-on 0072-add13 (each prayer's steps): the salam of a three- or four-rakah prayer from the tawarruk, its hands laid
// on the thighs as in the salam above; and the standing up to the third rakah, the hands raised (65441, Ibn Baz
// 6797) and then on the chest, as the rising from bowing does (setPose below)
POSES.taslim_tw = { ...POSES.tawarruk, head: 6, arms: 'thighs' }
POSES.stand3 = { ...POSES.stand }

const NUM_KEYS = ['fR', 'sR', 'tR', 'tL', 'sL', 'fL', 'yfR', 'ysR', 'ytR', 'ytL', 'ysL', 'yfL', 'tbR', 'tbL', 'pr', 'split', 'hemAt', 'trunk1', 'trunk2', 'head', 'yaw', 'protract']

// the shin angle that rests the knee on the rug, the ankle above the ball of an upright foot
function kneeShin(fDeg) {
  const ankle = BALL.clone().addScaledVector(footDir(fDeg), -L.foot)
  return -Math.acos((KNEE_Y - ankle.y) / L.shin) / D
}
// tawarruk (10902 «أخر رجله اليسرى وقعد متوركا على شقه الأيسر», its benefits 8 «يقدم رجله اليسرى ويخرجها من تحته،
// وينصب اليمنى، ويضع إليتيه على الأرض»): the seat on the rug, the right foot upright, the left foot brought out from
// under to the right side, under the right shin. Built from points, then turned into the posture's angles.
function tawarrukPose() {
  const p = { ...POSES.sit, arms: 'thighsPoint', head: 14, split: 1, tbL: -6 }
  const fR = UPRIGHT
  const ankleR = BALL.clone().addScaledVector(footDir(fR), -L.foot)
  const at = (O, len, x, y, sign) => { const dx = x - O.x, dy = y - O.y; return V(x, y, O.z + sign * Math.sqrt(Math.max(0, len * len - dx * dx - dy * dy))) }
  const kneeR = at(ankleR, L.shin, ankleR.x + 0.05, KNEE_Y, +1)
  const HIP_Y = 0.135
  const hipR = at(kneeR, L.thigh, ankleR.x + 0.18, HIP_Y, -1)
  const pr = -6 // the left hip a little lower: sitting on the left side
  const hipL = hipR.clone().add(rotZ(V(2 * L.hipHalf, 0, 0), pr))
  const kneeL = at(hipL, L.thigh, hipL.x + 0.03, KNEE_Y, +1)
  const ankleL = at(kneeL, L.shin, ankleR.x + 0.025, 0.056, -1)
  const fdir = V(-0.86, -0.2, -0.47).normalize()
  // angles from directions (branches chosen so the posture blends with the sitting one without turning round)
  const fwd = (v) => ({ a: Math.acos(-v.y) / D, y: Math.atan2(v.x, v.z) / D }) // down(), forward branch
  const back = (v) => ({ a: -Math.acos(-v.y) / D, y: Math.atan2(-v.x, -v.z) / D }) // down(), backward branch
  const sR = back(ankleR.clone().sub(kneeR).normalize())
  const tR = fwd(kneeR.clone().sub(hipR).normalize())
  const tL = fwd(kneeL.clone().sub(hipL).normalize())
  const sL = back(ankleL.clone().sub(kneeL).normalize())
  const fL = { a: 180 - Math.asin(-fdir.y) / D, y: Math.atan2(-fdir.x, -fdir.z) / D }
  Object.assign(p, { fR, yfR: 0, sR: sR.a, ysR: sR.y, tR: tR.a, ytR: tR.y, pr, tL: tL.a, ytL: tL.y, sL: sL.a, ysL: sL.y, fL: fL.a, yfL: fL.y })
  return p
}

// resolve the solved values: knees on the rug, toes on the rug, and the head resting on the rug in prostration
for (const p of Object.values(POSES)) {
  if (p.sR === 'knee') p.sR = kneeShin(p.fR)
  if (p.sL === 'knee') p.sL = kneeShin(p.fL)
  if (p.trunk2 === 'touch') {
    let lo = 100, hi = 175
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2
      const j = joints({ ...p, tbR: 0, tbL: 0, trunk2: m })
      if (headLowest(j) > 0.002) lo = m
      else hi = m
    }
    p.trunk2 = (lo + hi) / 2
  }
  for (const s of ['R', 'L']) {
    const k = 'tb' + s
    if (p[k] !== 'ground') continue
    const j = joints({ ...p, tbR: 0, tbL: 0 })
    const F = j.feet[s]
    let lo = -40, hi = 120
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2
      const t = F.f.clone().multiplyScalar(Math.cos(m * D)).addScaledVector(F.u, Math.sin(m * D))
      if (F.B.y + t.y * L.toe > TOE_R) hi = m // the tip rises as the toes bend up: too high, bend less
      else lo = m
    }
    p[k] = (lo + hi) / 2
  }
}

// ---- forward kinematics: joints from the posture numbers -------------------------------------------------------
function joints(p, breathe = 0) {
  const ballR = BALL.clone()
  const ankleR = ballR.clone().addScaledVector(footDir(p.fR, p.yfR), -L.foot)
  const kneeR = ankleR.clone().addScaledVector(down(p.sR, p.ysR), -L.shin)
  const hipR = kneeR.clone().addScaledVector(down(p.tR, p.ytR), -L.thigh)
  const half = rotZ(V(-RIGHT * L.hipHalf, 0, 0), p.pr)
  const pelvis = hipR.clone().add(half)
  const hipL = pelvis.clone().add(half)
  const kneeL = hipL.clone().addScaledVector(down(p.tL, p.ytL), L.thigh)
  const ankleL = kneeL.clone().addScaledVector(down(p.sL, p.ysL), L.shin)
  const ballL = ankleL.clone().addScaledVector(footDir(p.fL, p.yfL), L.foot)
  const mid = pelvis.clone().addScaledVector(up(p.trunk1), L.spine1)
  const neck = mid.clone().addScaledVector(up(p.trunk2), L.spine2)
  const spine = new THREE.QuadraticBezierCurve3(pelvis.clone(), mid.clone(), neck.clone())
  // protract: the shoulder joints carried along the back toward the neck (the shoulder blades drawn forward with the
  // reach of the arms to the knees in ruku, add-on 0072-add6 item 4); 0 in every other posture
  const tan = spine.getTangent(0.86).normalize()
  const sh = spine.getPoint(0.86).addScaledVector(tan, p.protract || 0)
  const shoulderR = sh.clone().add(V(RIGHT * L.shoulderHalf, 0, 0))
  const shoulderL = sh.clone().add(V(-RIGHT * L.shoulderHalf, 0, 0))
  const headQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.head * D, p.yaw * D, 0, 'YXZ'))
  const head = neck.clone().addScaledVector(up(p.head), L.neck)
  const feet = { R: footFrame(ankleR, ballR, p.yfR, p.tbR, kneeR), L: footFrame(ankleL, ballL, p.yfL, p.tbL, kneeL) }
  return { ballR, ankleR, kneeR, hipR, pelvis, hipL, kneeL, ankleL, ballL, mid, neck, spine, sh, shoulderR, shoulderL, head, headQ, breathe, trunk2: p.trunk2, feet }
}
// a foot's frame: f from the ankle to the ball, s the lateral axis (+x turned by the foot's yaw), u the top of the foot;
// the toes bend at the ball by tb toward the top of the foot
function footFrame(A, B, yaw, tb, knee) {
  const f = B.clone().sub(A).normalize()
  const s = rotY(V(1, 0, 0), yaw)
  s.addScaledVector(f, -s.dot(f)).normalize()
  const u = f.clone().cross(s).normalize()
  const bend = typeof tb === 'number' ? tb : 0
  const t = f.clone().multiplyScalar(Math.cos(bend * D)).addScaledVector(u, Math.sin(bend * D))
  return { A, B, f, s, u, t, shin: knee.clone().sub(A).normalize() }
}
// the egg-shaped head's lowest point (the head is a sphere of radius headR scaled 0.93, 1.04, 1 in its own frame)
function headLowest(j) { return headLowestPoint(j).y }
function headLowestPoint(j) {
  const inv = j.headQ.clone().invert()
  const dl = V(0, -1, 0).applyQuaternion(inv)
  const a = L.headR * 0.93, b = L.headR * 1.04, c = L.headR
  const k = Math.sqrt(a * a * dl.x * dl.x + b * b * dl.y * dl.y + c * c * dl.z * dl.z)
  const pl = V(a * a * dl.x / k, b * b * dl.y / k, c * c * dl.z / k)
  return j.head.clone().add(pl.applyQuaternion(j.headQ))
}

// ---- hands: where they go, which way the palm faces, and the fingers -------------------------------------------
// fingers: curl per finger [base, middle, tip] in degrees toward the palm; spread in degrees toward the thumb side;
// thumb: abduction from the hand's axis, its lean toward the palm, its curl. Arrays so two placements can blend.
const KG = { c: [-2.5, -2, 2, 5], s: 16 } // the straight-arm ruku grip: each finger's base curl, and the spread (degrees)
const F = {
  relaxed: { curl: [[10, 14, 8], [11, 16, 9], [12, 17, 9], [12, 17, 9]], spread: [4, 0, -3, -7], thumb: [32, 22, 6, 12, 10] },
  // extended, the fingertips up: بلا شاهد في مصادرنا (no text in our data, add-on 0071-add7); drawn as approved, no text attributed
  extended: { curl: [[0, 2, 1], [0, 2, 1], [0, 2, 1], [0, 2, 1]], spread: [2, 0, -2, -4], thumb: [24, 10, 0, 4, 2] },
  // ruku: the fingers spread, gripping the knee (10928, its explanation «يقبض على ركبتيه بكفيه ويفرج بين أصابعه»)
  grip: { curl: [[8, 12, 8], [11, 14, 8], [16, 20, 12], [24, 32, 18]], spread: [13, 3, -8, -19], thumb: [52, 34, 10, 18, 14] },
  // ruku with the arms straight (add-on 0072-add6 item 4): the palm on the front of the knee, the fingers spread over it
  // and the top of the shin, following the robe
  gripKnee: { curl: KG.c.map((c) => [c, c * 1.4, c]), spread: [KG.s, 4, -KG.s * 0.7, -KG.s * 1.5], thumb: [50, 30, 8, 14, 10] },
  // sujud: the palms flat, the fingers together toward the qibla (10928 «وإذا سجد ضم أصابعه», 10927's explanation)
  flat: { curl: [[0, 3, 2], [0, 3, 2], [0, 3, 2], [0, 3, 2]], spread: [1, 0, -1, -2], thumb: [16, 4, 0, 4, 2] },
  // sitting: the hand laid on the thigh, the fingertips toward the knee (10941 and its explanation)
  laid: { curl: [[6, 8, 5], [6, 8, 5], [6, 9, 5], [6, 9, 5]], spread: [3, 0, -2, -5], thumb: [26, 8, 2, 6, 4] },
  // the tashahhud, the right hand, in the first form (add-on 0071-add9 decision 4): the fingers closed and the index
  // pointing (Ibn Umar «وعقد ثلاثة وخمسين وأشار بالسبابة», as 10941's explanation quotes it; 65459 «ورفع إصبعه اليمنى التي
  // تلي الإبهام»), the thumb closed onto the middle finger's middle bone. The second form, the ring of the thumb and middle finger (10941, 65440), is shown in text, not drawn.
  point: { curl: [[-6, 2, 0], [86, 96, 52], [86, 96, 52], [86, 94, 50]], spread: [2, 0, -3, -6], thumb: [18, 62, 26, 34, 24], ring: 1 },
  // the second form, kept for comparison only (not used by any posture)
  pointRing: { curl: [[-6, 2, 0], [52, 68, 30], [84, 96, 52], [86, 94, 50]], spread: [2, 0, -3, -6], thumb: [40, 40, 10, 20, 20], ring: 1 },
  // qiyam: the left hand under, the right hand over its back, wrist and forearm (10909 and its explanation)
  chest: { curl: [[12, 16, 10], [13, 18, 10], [14, 18, 10], [14, 18, 10]], spread: [2, 0, -2, -4], thumb: [26, 18, 4, 10, 8] },
}
const lerpF = (A, B, e) => ({
  curl: A.curl.map((c, i) => c.map((v, k) => lerp(v, B.curl[i][k], e))),
  spread: A.spread.map((v, i) => lerp(v, B.spread[i], e)),
  thumb: A.thumb.map((v, i) => lerp(v, B.thumb[i], e)),
  ring: lerp(A.ring || 0, B.ring || 0, e),
})
// the hand's measures (a 1.70 m figure): wrist to knuckles, the fingers' bones, their radii, and their places
const HAND = {
  palm: 0.088,
  fingers: [
    { off: 0.026, base: 0.086, len: [0.037, 0.023, 0.019], r: [0.0088, 0.0082, 0.0074] },
    { off: 0.0085, base: 0.089, len: [0.041, 0.026, 0.02], r: [0.0089, 0.0083, 0.0075] },
    { off: -0.009, base: 0.086, len: [0.038, 0.024, 0.019], r: [0.0086, 0.008, 0.0072] },
    { off: -0.025, base: 0.079, len: [0.03, 0.019, 0.017], r: [0.0078, 0.0072, 0.0066] },
  ],
  thumb: { len: [0.034, 0.03, 0.024], r: [0.0115, 0.0102, 0.0092] },
}

// where each hand goes, for each arm placement: the wrist w, the hand's direction d (wrist to knuckles), the palm's
// normal n (the way the palm faces), the elbow's pole, and the fingers
function handTargets(kind, j, side, robe) {
  const s = side // -1 right, +1 left
  const sh = s === RIGHT ? j.shoulderR : j.shoulderL
  const medial = V(-s, 0, 0)
  switch (kind) {
    case 'side':
      return { w: sh.clone().add(V(s * 0.035, -0.53, 0.04)), d: V(0, -1, 0.05), n: medial.clone().add(V(0, 0, 0.15)), pole: V(0, 0, -1), f: F.relaxed }
    case 'raise': {
      // takbir (3095, 10902: the hands level with the shoulders; 10908, 65440: with the ears; 10908's explanation:
      // the fingertips by the tops of the ears, the thumbs by the earlobes, the palms by the shoulders). The way the palm
      // faces: بلا شاهد في مصادرنا, so the palm is left in its neutral turn (toward the head), not turned to the qibla.
      return { w: sh.clone().add(V(-s * 0.012, -0.02, 0.1)), d: V(-s * 0.03, 1, 0.04), n: medial.clone(), pole: V(s * 0.4, -1, -0.15), f: F.extended }
    }
    case 'chest': {
      // qiyam: on the chest (10909 «على صدره»), the right hand over the left hand, its wrist and forearm (10909 and its
      // explanation «على ظهر كفه اليسرى والرسغ والساعد»; 65442; 65440 «أخذ شماله بيمينه»)
      const cy = sh.y - 0.135
      const front = j.pelvis.z + TORSO_FRONT
      if (s === RIGHT) return { w: V(0.004, cy + 0.012, front + 0.05), d: V(1, 0.06, 0.03), n: V(0, -0.05, -1), pole: V(-1, -0.7, -0.2), f: F.chest }
      return { w: V(0.072, cy - 0.006, front + 0.019), d: V(-1, 0.03, 0.04), n: V(0, 0, -1), pole: V(1, -0.7, -0.2), f: F.laid }
    }
    case 'knees': {
      // ruku: the palms on the knees (10902 «ويضع راحتيه على ركبتيه», 65440), gripping them with the fingers spread
      // (10928 and its explanation); the palm on the robe over the kneecap. Add-on 0072-add6 item 4: the arms straight
      // («وتّر يديه», Abu Dawud 734 by its reference; 10902 «أمكن يديه من ركبتيه» as Bukhari 828), so the palm sits on the
      // front of the knee with the wrist just above the knee joint and the fingers over the top of the shin, and the
      // elbows turned out, away from the sides
      const k = s === RIGHT ? j.kneeR : j.kneeL
      const n = V(-s * KNEE_PALM.turn, KNEE_PALM.dz, -1).normalize()
      const d = V(0, -1, -KNEE_PALM.dz).normalize()
      const palmC = V(k.x + s * KNEE_PALM.x, k.y + KNEE_PALM.y, k.z + robe.kneeFront + KNEE_PALM.z)
      return { w: palmC.clone().addScaledVector(d, -0.046), d, n, pole: V(s * 1, 0.25, -0.5), f: F.gripKnee }
    }
    case 'ground': {
      // sujud: the palms flat on the rug, fingers toward the qibla (10902's benefits 5), the head between the hands
      // (65440 «وضع رأسه بذلك المنزل من بين يديه»); the forearms off the rug (10927) and the arms away from the sides
      // (3220, 10902)
      // the wrist low enough that the palm's underside rests on the rug (src/measure.js, the seven places)
      const z = j.head.z - 0.05
      return { w: V(s * 0.205, 0.015, z - 0.046), d: V(-s * 0.04, -0.02, 1), n: V(0, -1, 0), pole: V(s * SUJUD_POLE.x, SUJUD_POLE.y, -0.2), f: F.flat }
    }
    case 'thighs':
    case 'thighsPoint': {
      // sitting: each hand on its thigh, the fingertips reaching the knee (10941 and its explanation)
      const k = s === RIGHT ? j.kneeR : j.kneeL
      const hip = s === RIGHT ? j.hipR : j.hipL
      const along = k.clone().sub(hip).normalize()
      const nrm = along.clone().cross(V(1, 0, 0)).normalize()
      if (nrm.y < 0) nrm.negate()
      const palmC = hip.clone().lerp(k, 0.64).addScaledVector(nrm, robe.thighTop(hip.clone().lerp(k, 0.64)) + 0.017)
      const d = along.clone().addScaledVector(nrm, -0.12).normalize()
      const point = kind === 'thighsPoint' && s === RIGHT
      return { w: palmC.clone().addScaledVector(d, -0.046), d, n: nrm.clone().negate(), pole: V(s * 0.3, -1, -0.6), f: point ? F.point : F.laid }
    }
  }
  return { w: sh.clone().add(V(0, -0.5, 0)), d: V(0, -1, 0), n: medial, pole: V(0, 0, -1), f: F.relaxed }
}
const TORSO_FRONT = 0.118 // the chest's front, ahead of the spine (TORSO profile depth near the shoulders)
// ruku: the palm's centre from the knee joint (x outward, y up, z ahead of the robe's front over the knee)
// sujud: the elbow's pole (add-on 0072-add6 item 14: the elbows raised clearly from the rug, 10927 «وارفع مرفقيك»)
const SUJUD_POLE = { x: 0.6, y: 1.4 }
const KNEE_PALM = { x: 0.016, y: -0.04, z: 0.006, dz: 0.1, turn: 0.15 }

function ik(S, T, a, b, pole) {
  const d0 = T.clone().sub(S)
  let d = d0.length()
  const dir = d0.normalize()
  d = Math.min(Math.max(d, Math.abs(a - b) + 1e-3), a + b - 1e-3)
  const cosA = (a * a + d * d - b * b) / (2 * a * d)
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA))
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir))
  if (perp.lengthSq() < 1e-8) perp.set(0, 0, -1)
  perp.normalize()
  const E = S.clone().addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA)
  const W = S.clone().addScaledVector(dir, d)
  return { E, W }
}

// ---- tubes: rings around a centre line, with rounded ends -------------------------------------------------------
class Tube {
  constructor(material, rings = 22, seg = 30) {
    this.rings = rings
    this.seg = seg
    const g = new THREE.BufferGeometry()
    this.pos = new Float32Array(rings * (seg + 1) * 3)
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    const idx = []
    for (let r = 0; r < rings - 1; r++)
      for (let k = 0; k < seg; k++) {
        const a = r * (seg + 1) + k, b = a + seg + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    g.setIndex(idx)
    this.geometry = g
    this.mesh = new THREE.Mesh(g, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.frustumCulled = false
  }
  // at(u) -> {c: centre, t: tangent}, size(u) -> [wx, wd]; u from 0 to 1, caps beyond both ends.
  update(at, size, capA, capB, lateral = V(1, 0, 0)) {
    const { rings, seg, pos } = this
    const nA = 5, nB = 5, nBody = rings - nA - nB
    let o = 0
    const tmpN = V(), tmpB = V()
    for (let r = 0; r < rings; r++) {
      let u, f, push = 0
      if (r < nA) {
        const q = 1 - r / nA // 1..>0
        u = 0; f = Math.sqrt(Math.max(0, 1 - q * q)); push = -capA * q
      } else if (r >= rings - nB) {
        const q = (r - (rings - nB) + 1) / nB
        u = 1; f = Math.sqrt(Math.max(0, 1 - q * q)); push = capB * q
      } else {
        u = (r - nA) / (nBody - 1); f = 1
      }
      const { c, t } = at(u)
      const [wx, wd] = size(u)
      tmpN.copy(lateral).addScaledVector(t, -lateral.dot(t)).normalize()
      tmpB.crossVectors(tmpN, t).normalize()
      for (let k = 0; k <= seg; k++) {
        const ang = (k / seg) * Math.PI * 2
        const x = Math.cos(ang) * wx * f, y = Math.sin(ang) * wd * f
        pos[o++] = c.x + t.x * push + tmpN.x * x + tmpB.x * y
        pos[o++] = c.y + t.y * push + tmpN.y * x + tmpB.y * y
        pos[o++] = c.z + t.z * push + tmpN.z * x + tmpB.z * y
      }
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.computeVertexNormals()
  }
}

const lerp = (a, b, t) => a + (b - a) * t
const lerpProfile = (pts, u) => {
  for (let i = 1; i < pts.length; i++) {
    if (u <= pts[i][0]) {
      const [u0, a0, b0] = pts[i - 1], [u1, a1, b1] = pts[i]
      const k = (u - u0) / (u1 - u0 || 1)
      const s = k * k * (3 - 2 * k)
      return [lerp(a0, a1, s), lerp(b0, b1, s)]
    }
  }
  const last = pts[pts.length - 1]
  return [last[1], last[2]]
}
const TORSO = [[0, 0.172, 0.13], [0.18, 0.176, 0.127], [0.45, 0.158, 0.112], [0.72, 0.172, 0.118], [0.86, 0.182, 0.112], [0.95, 0.13, 0.095], [1, 0.06, 0.055]]
// the foot's body from the heel to the ball: [u, half width, half height]
const FOOT = [[0, 0.03, 0.03], [0.3, 0.033, 0.035], [0.65, 0.04, 0.027], [1, 0.044, 0.018]]
// the toes from the big toe to the little toe: offset toward the inner side, forward, length, radius, fan
const TOES = [[0.026, 0.008, 0.048, 0.0125, 0.03], [0.007, 0.006, 0.04, 0.0088, 0], [-0.008, 0, 0.036, 0.0083, -0.03], [-0.021, -0.008, 0.032, 0.0079, -0.06], [-0.032, -0.017, 0.026, 0.0073, -0.1]]
// the robe's measures (as v1): the upper part around both thighs, the lower part around both shins
const ROBE = { upW: [0.166, 0.19], upD: [0.122, 0.112], lowW: [0.19, 0.205], lowD: [0.112, 0.125] }

// ---- the scene --------------------------------------------------------------------------------------------------
const THEMES = {
  day: { robe: 0xf2ede3, skin: 0xc79e7c, hair: 0x3a2e28, cap: 0xfbfaf6, hemiSky: 0xe4eef9, hemiGround: 0xcbb795, hemi: 1.55, key: 0xfff0db, keyI: 2.3, fill: 0xd6e4ff, fillI: 0.55, floor: [236, 228, 210], shadow: 0.2, exposure: 1.0, dot: 0x2f8f86, arrow: 0xffffff },
  night: { robe: 0xf3ecdc, skin: 0xc29a78, hair: 0x3a2e28, cap: 0xfbf7ee, hemiSky: 0xc3c8de, hemiGround: 0x54442c, hemi: 1.6, key: 0xfff4e4, keyI: 2.2, fill: 0xffd59a, fillI: 0.8, floor: [58, 80, 140], shadow: 0.34, exposure: 1.05, dot: 0x5fd0c4, arrow: 0xfff6dc },
}

function rugTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 1024
  const g = c.getContext('2d')
  const W = c.width, H = c.height
  g.fillStyle = '#c9a24a'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1e3a6b'; g.fillRect(14, 14, W - 28, H - 28)
  g.strokeStyle = '#e8cf8c'; g.lineWidth = 3; g.strokeRect(26, 26, W - 52, H - 52)
  // border band: small eight-pointed stars, gold and turquoise in turn
  const star = (x, y, r, col) => {
    g.fillStyle = col
    g.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.5 : r
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath(); g.fill()
  }
  for (let y = 60, i = 0; y < H - 40; y += 46, i++) {
    star(52, y, 13, i % 2 ? '#3a8c84' : '#c9a24a')
    star(W - 52, y, 13, i % 2 ? '#c9a24a' : '#3a8c84')
  }
  g.strokeStyle = '#e8cf8c'; g.lineWidth = 3; g.strokeRect(78, 78, W - 156, H - 156)
  // the mihrab arch at the front end (canvas bottom is the qibla side)
  const x0 = 104, x1 = W - 104, yBase = 330, yTop = H - 110
  g.fillStyle = '#244779'
  g.beginPath()
  g.moveTo(x0, yBase)
  g.lineTo(x0, yTop - 200)
  g.quadraticCurveTo(x0, yTop - 40, W / 2, yTop)
  g.quadraticCurveTo(x1, yTop - 40, x1, yTop - 200)
  g.lineTo(x1, yBase)
  g.closePath(); g.fill()
  g.strokeStyle = '#c9a24a'; g.lineWidth = 5; g.stroke()
  g.strokeStyle = '#e8cf8c'; g.lineWidth = 2
  g.beginPath()
  g.moveTo(x0 + 16, yBase + 12)
  g.lineTo(x0 + 16, yTop - 206)
  g.quadraticCurveTo(x0 + 16, yTop - 62, W / 2, yTop - 22)
  g.quadraticCurveTo(x1 - 16, yTop - 62, x1 - 16, yTop - 206)
  g.lineTo(x1 - 16, yBase + 12)
  g.stroke()
  star(W / 2, yTop - 150, 34, '#c9a24a')
  star(W / 2, yTop - 150, 17, '#244779')
  star(W / 2, 200, 24, '#3a8c84')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function floorTexture(rgb) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128)
  gr.addColorStop(0, `rgba(${rgb.join(',')},0.95)`)
  gr.addColorStop(0.55, `rgba(${rgb.join(',')},0.55)`)
  gr.addColorStop(1, `rgba(${rgb.join(',')},0)`)
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function newRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  r.outputColorSpace = THREE.SRGBColorSpace
  r.toneMapping = THREE.NeutralToneMapping
  r.shadowMap.enabled = true
  r.shadowMap.type = THREE.PCFShadowMap
  return r
}

export function createCompanion(canvas, opts = {}) {
  const renderer = newRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(-2.2, 4.2, 3.0)
  key.target.position.set(0, 0.4, 0.4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 6
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.8, bottom: -1.2, near: 0.5, far: 10 })
  scene.add(key, key.target)
  const fill = new THREE.DirectionalLight(0xffffff, 0.5)
  fill.position.set(2.5, 2, -2)
  scene.add(fill)

  const mat = (c, rough = 0.86) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 })
  const robeM = mat(0xffffff), skinM = mat(0xffffff, 0.7), hairM = mat(0xffffff, 0.95), capM = mat(0xffffff, 0.9)

  // floor glow, rug, and a shadow catcher
  const floorMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -0.002, 0.4)
  scene.add(floor)
  const shadowCatch = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.2 }))
  shadowCatch.rotation.x = -Math.PI / 2
  shadowCatch.position.set(0, -0.001, 0.4)
  shadowCatch.receiveShadow = true
  scene.add(shadowCatch)
  const rug = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.008, 1.62), [mat(0xb08d3c), mat(0xb08d3c), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.95 }), mat(0xb08d3c), mat(0xb08d3c), mat(0xb08d3c)])
  rug.position.set(0, -0.004, 0.4)
  rug.receiveShadow = true
  scene.add(rug)

  const fig = new THREE.Group()
  scene.add(fig)
  const torso = new Tube(robeM, 26, 32)
  const robeUp = new Tube(robeM, 20, 32)
  const robeLow = new Tube(robeM, 20, 32)
  const robeLow2 = new Tube(robeM, 20, 32) // tawarruk: the robe around the left shin
  fig.add(torso.mesh, robeUp.mesh, robeLow.mesh, robeLow2.mesh)

  const mk = (geo, m) => {
    const x = new THREE.Mesh(geo, m)
    x.castShadow = true
    x.receiveShadow = true
    fig.add(x)
    return x
  }
  const unitCyl = (r0, r1) => new THREE.CylinderGeometry(r1, r0, 1, 20, 1, true)
  const sph = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h)
  const limb = (r0, r1, m, seg) => ({ cyl: mk(unitCyl(r0, r1), m), a: mk(sph(r0, seg, seg ? seg * 0.66 : 16), m), b: mk(sph(r1, seg, seg ? seg * 0.66 : 16), m), r0, r1 })
  const place = (l, A, B) => {
    const d = B.clone().sub(A)
    const len = d.length()
    l.cyl.position.copy(A).addScaledVector(d, 0.5)
    l.cyl.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize())
    l.cyl.scale.set(1, len, 1)
    l.a.position.copy(A)
    l.b.position.copy(B)
  }

  // hands: a palm, four fingers of three bones, and a thumb
  const unitSph = sph(1, 28, 18)
  const makeHand = () => ({
    palm: mk(unitSph, skinM),
    wrist: limb(0.024, 0.026, skinM, 16),
    fingers: HAND.fingers.map((fg) => fg.r.map((r, k) => limb(r, fg.r[k + 1] ?? r * 0.9, skinM, 12))),
    thumb: HAND.thumb.r.map((r, k) => limb(r, HAND.thumb.r[k + 1] ?? r * 0.9, skinM, 12)),
  })
  const arms = [RIGHT, -RIGHT].map((side) => ({ side, upper: limb(0.058, 0.05, robeM), fore: limb(0.05, 0.058, robeM), hand: makeHand() }))
  // feet: a heel-to-ball body, five toes, and the ankle under the robe
  const makeFoot = () => ({ body: new Tube(skinM, 16, 20), ankle: limb(0.034, 0.032, skinM, 16), toes: TOES.map(([, , , r]) => limb(r, r * 0.86, skinM, 12)) })
  const feet = { R: makeFoot(), L: makeFoot() }
  fig.add(feet.R.body.mesh, feet.L.body.mesh)
  const neck = limb(0.046, 0.046, skinM)

  // head: no facial features; hair at the back and a cap on top show which way the head is turned
  const headG = new THREE.Group()
  fig.add(headG)
  const hm = (geo, m) => {
    const x = new THREE.Mesh(geo, m)
    x.castShadow = true
    headG.add(x)
    return x
  }
  const skull = hm(sph(L.headR), skinM)
  skull.scale.set(0.93, 1.04, 1)
  // the hair is the same rounded head shifted back a little: where the two meet is a soft hairline
  const hair = hm(sph(L.headR), hairM)
  hair.scale.set(0.95, 1.03, 0.97)
  hair.position.set(0, 0.014, -0.024)
  const cap = hm(new THREE.SphereGeometry(L.headR * 1.06, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), capM)
  cap.scale.set(0.93, 1.04, 1)
  cap.position.y = 0.004
  cap.rotation.x = -0.12

  // ---- the feet close-up: markers seen only by the second camera (layer 1) ----
  const markers = new THREE.Group()
  const dotM = new THREE.MeshBasicMaterial({ color: 0x2f8f86 })
  const dots = [0, 1].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.014, 24, 16), dotM))
  const ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  const rings = dots.map(() => new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 32), ringM))
  const arrowShape = new THREE.Shape()
  const aw = 0.02, ah = 0.055, al = 0.26
  arrowShape.moveTo(-aw / 2, 0); arrowShape.lineTo(aw / 2, 0); arrowShape.lineTo(aw / 2, al - ah); arrowShape.lineTo(aw * 1.6, al - ah)
  arrowShape.lineTo(0, al); arrowShape.lineTo(-aw * 1.6, al - ah); arrowShape.lineTo(-aw / 2, al - ah); arrowShape.closePath()
  const arrowM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), arrowM)
  arrow.rotation.x = Math.PI / 2 // lies on the floor, pointing +z (the qibla)
  markers.add(...dots, ...rings, arrow)
  markers.traverse((o) => o.layers.set(1))
  scene.add(markers)
  const feetCam = new THREE.PerspectiveCamera(28, 16 / 10, 0.02, 10)
  feetCam.layers.enable(1)
  // the seven places of prostration (10925, 3230): the forehead with the nose, the two palms, the two knees, the tips of
  // the two feet; seven dots on layer 2, each on its contact place (sevenContacts), drawn over everything as a diagram.
  // One colour for all seven, with a white ring and a dark edge, so each dot stands out on the light robe and on the
  // dark rug alike (no single plain colour reaches 3:1 against both; see v1-plus/README.md). Fully opaque (opacity 1) but in
  // the transparent pass, so they are drawn after the see-through figure; not tone-mapped: on screen they are these colours.
  const SEVEN_FILL = 0xd9480f, SEVEN_RING = 0xffffff, SEVEN_EDGE = 0x1e1e1e
  const seven = new THREE.Group()
  const sevenDots = [0, 1, 2, 3, 4, 5, 6].map(() => {
    const g = new THREE.Group()
    const disc = (r, color, order, z) => {
      const x = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, toneMapped: false, transparent: true, opacity: 1 }))
      x.renderOrder = order
      x.position.z = z
      g.add(x)
    }
    disc(0.03, SEVEN_EDGE, 20, 0)
    disc(0.026, SEVEN_RING, 21, 0.001)
    disc(0.019, SEVEN_FILL, 22, 0.002)
    seven.add(g)
    return g
  })
  seven.traverse((o) => o.layers.set(2))
  scene.add(seven)
  const sevenCam = new THREE.PerspectiveCamera(30, 16 / 10, 0.05, 20)
  sevenCam.layers.enable(2)
  const handCam = new THREE.PerspectiveCamera(28, 16 / 10, 0.01, 10)
  // the close-ups, each with its own canvas, renderer, camera and mode: 'feet' (sit, sujud, tawarruk), 'seven' (sujud),
  // 'hand' (the right hand in the tashahhud)
  const views = { feet: { cam: feetCam }, seven: { cam: sevenCam }, hand: { cam: handCam } }

  let theme = opts.theme || 'day'
  function setTheme(name) {
    theme = name
    const T = THEMES[name]
    robeM.color.setHex(T.robe); skinM.color.setHex(T.skin); hairM.color.setHex(T.hair); capM.color.setHex(T.cap)
    hemi.color.setHex(T.hemiSky); hemi.groundColor.setHex(T.hemiGround); hemi.intensity = T.hemi
    key.color.setHex(T.key); key.intensity = T.keyI
    fill.color.setHex(T.fill); fill.intensity = T.fillI
    if (floorMat.map) floorMat.map.dispose()
    floorMat.map = floorTexture(T.floor); floorMat.needsUpdate = true
    shadowCatch.material.opacity = T.shadow
    renderer.toneMappingExposure = T.exposure
    for (const v of Object.values(views)) if (v.renderer) v.renderer.toneMappingExposure = T.exposure
    dotM.color.setHex(T.dot); arrowM.color.setHex(T.arrow); ringM.color.setHex(T.arrow)
    requestRender()
  }

  // ---- posture state and interpolation ----
  let from = { ...POSES.ready }, to = { ...POSES.ready }
  let t0 = 0, dur = 1, animating = false
  let seq = null // taslim keyframes
  const reduced = () => opts.reducedMotion?.() ?? false

  function poseAt(k) {
    const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)))
    const p = {}
    for (const n of NUM_KEYS) p[n] = lerp(from[n], to[n], e)
    p.armsFrom = from.arms; p.armsTo = to.arms; p.e = e
    return p
  }

  // the robe over the knees and thighs, for the hands that rest on it
  const robeInfo = (j) => {
    const kneeMid = j.kneeR.clone().add(j.kneeL).multiplyScalar(0.5)
    const halfX = Math.abs(j.kneeR.x - kneeMid.x)
    return {
      kneeFront: ROBE.lowD[0] * Math.sqrt(Math.max(0, 1 - (halfX / ROBE.lowW[0]) ** 2)),
      thighTop: (P) => {
        const u = Math.min(1, Math.max(0, P.clone().sub(j.pelvis).dot(kneeMid.clone().sub(j.pelvis).normalize()) / kneeMid.distanceTo(j.pelvis)))
        const c = j.pelvis.clone().lerp(kneeMid, u)
        const w = lerp(ROBE.upW[0], ROBE.upW[1], Math.sqrt(u)), dd = lerp(ROBE.upD[0], ROBE.upD[1], u)
        return dd * Math.sqrt(Math.max(0, 1 - ((P.x - c.x) / w) ** 2))
      },
    }
  }

  let last = null // the last built posture, for the close-up and the measurements
  function build(p, time) {
    const breathe = reduced() || opts.still ? 0 : Math.sin(time / 760) * 0.006
    const j = joints(p, breathe)
    placeCamera(j)
    // torso along the curved spine
    torso.update((u) => ({ c: j.spine.getPoint(u), t: j.spine.getTangent(u).normalize() }),
      (u) => { const [a, b] = lerpProfile(TORSO, u); const k = 1 + breathe * (u > 0.5 ? 1 : 0.3); return [a * k, b * k] }, 0.12, 0.02)
    // the robe: hips to knees, and knees to ankles, each around both legs (in tawarruk, the lower part around each shin)
    const kneeMid = j.kneeR.clone().add(j.kneeL).multiplyScalar(0.5)
    const ankleMid = j.ankleR.clone().add(j.ankleL).multiplyScalar(0.5)
    const hipC = j.pelvis.clone()
    const seg = (A, B) => { const t = B.clone().sub(A).normalize(); return (u) => ({ c: A.clone().lerp(B, u), t }) }
    robeUp.update(seg(hipC, kneeMid), (u) => [lerp(ROBE.upW[0], ROBE.upW[1], Math.sqrt(u)) + Math.sin(Math.PI * u) * 0.006, lerp(ROBE.upD[0], ROBE.upD[1], u)], 0.06, 0.07)
    const ha = p.hemAt
    const hem = kneeMid.clone().lerp(ankleMid.clone().add(V(0, 0.03, 0)), ha)
    const sp = p.split
    const hemR = j.kneeR.clone().lerp(j.ankleR.clone().addScaledVector(j.feet.R.shin, 0.02), ha), hemL = j.kneeL.clone().lerp(j.ankleL.clone().addScaledVector(j.feet.L.shin, 0.02), ha)
    const A1 = kneeMid.clone().lerp(j.kneeR, sp), B1 = hem.clone().lerp(hemR, sp)
    const lowSize = (u) => [lerp(lerp(ROBE.lowW[0], ROBE.lowW[1], u), lerp(0.1, 0.085, u), sp), lerp(lerp(ROBE.lowD[0], ROBE.lowD[1], u), lerp(0.085, 0.075, u), sp)]
    // the hem's end: flat when standing (as v1), a little rounded when kneeling, where the close-up sees it from behind
    const capHem = lerp(0.045, 0.012, Math.min(1, Math.max(0, (ha - KNEEL_HEM) / (1 - KNEEL_HEM))))
    robeLow.update(seg(A1, B1), lowSize, lerp(0.07, 0.05, sp), lerp(capHem, 0.03, sp))
    robeLow2.mesh.visible = sp > 0.02
    if (robeLow2.mesh.visible) robeLow2.update(seg(kneeMid.clone().lerp(j.kneeL, sp), hem.clone().lerp(hemL, sp)), lowSize, lerp(0.07, 0.05, sp), lerp(capHem, 0.03, sp))
    // feet
    const feetPts = {}
    for (const s of ['R', 'L']) feetPts[s] = buildFoot(feet[s], j.feet[s], s === 'R' ? RIGHT : -RIGHT)
    // head and neck
    place(neck, j.neck, j.head.clone().addScaledVector(up(p.head), -0.04))
    headG.position.copy(j.head)
    headG.quaternion.copy(j.headQ)
    // arms: blend the two placements' targets, then solve the elbow, then the hand and its fingers
    const robe = robeInfo(j)
    const handPts = {}
    for (const arm of arms) {
      const A = handTargets(p.armsFrom, j, arm.side, robe), B = handTargets(p.armsTo, j, arm.side, robe)
      const w = A.w.clone().lerp(B.w, p.e)
      const d = A.d.clone().lerp(B.d, p.e).normalize()
      const n = A.n.clone().normalize().lerp(B.n.clone().normalize(), p.e)
      const pole = A.pole.clone().lerp(B.pole, p.e).normalize()
      const S = arm.side === RIGHT ? j.shoulderR : j.shoulderL
      const { E, W } = ik(S, w, L.upper, L.fore, pole)
      place(arm.upper, S, E)
      place(arm.fore, E, W)
      handPts[arm.side === RIGHT ? 'R' : 'L'] = { S, E, W, ...buildHand(arm.hand, arm.side, W, d, n, lerpF(A.f, B.f, p.e)) }
    }
    last = { j, p, hands: handPts, feet: feetPts, headLowest: headLowest(j), headLow: headLowestPoint(j) }
  }

  // a foot: the body from the heel to the ball along the sole, the toes from the ball, the ankle into the robe
  function buildFoot(parts, Fr, side) {
    const { A, B, f, s, u, t } = Fr
    const heel = A.clone().addScaledVector(f, -0.018).addScaledVector(u, -0.06)
    const midC = A.clone().addScaledVector(f, 0.085).addScaledVector(u, -0.03)
    const curve = new THREE.QuadraticBezierCurve3(heel, midC, B.clone())
    parts.body.update((k) => ({ c: curve.getPoint(k), t: curve.getTangent(k).normalize() }), (k) => lerpProfile(FOOT, k), 0.03, 0.012, s)
    place(parts.ankle, A.clone().addScaledVector(Fr.shin, 0.12), A.clone().addScaledVector(u, -0.004))
    const inner = s.clone().multiplyScalar(side === RIGHT ? 1 : -1) // toward the other foot (the big toe's side)
    const tips = [], bases = []
    TOES.forEach(([off, fw, len, r, fan], i) => {
      const base = B.clone().addScaledVector(inner, off).addScaledVector(t, fw).addScaledVector(u, -0.002)
      let dir = t.clone().addScaledVector(inner, fan).normalize()
      if (B.y < 0.045) {
        // the ball on the rug: each toe rests its tip on the rug, whatever its length
        const flat = V(dir.x, 0, dir.z).normalize(), sinA = Math.min(0.95, Math.max(-0.95, (base.y - r * 0.86) / len))
        dir = flat.multiplyScalar(Math.sqrt(1 - sinA * sinA)).add(V(0, -sinA, 0))
      }
      const tip = base.clone().addScaledVector(dir, len)
      place(parts.toes[i], base, tip)
      tips.push(tip); bases.push(base)
    })
    return { A, B, heel, f, s, u, t, tips, bases, radii: TOES.map((x) => x[3] * 0.86) }
  }

  // a hand: palm, fingers and thumb from the wrist W, the direction d, the palm's normal n and the finger angles
  function buildHand(parts, side, W, d0, n0, fg) {
    const d = d0.clone().normalize()
    const n = n0.clone().addScaledVector(d, -n0.dot(d)).normalize()
    const sTh = side === RIGHT ? d.clone().cross(n) : n.clone().cross(d) // toward the thumb
    const palmC = W.clone().addScaledVector(d, 0.046).addScaledVector(n, -0.002)
    parts.palm.position.copy(palmC)
    parts.palm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d.clone().cross(n), d, n)) // right-handed for both hands
    parts.palm.scale.set(0.039, 0.05, 0.0155)
    place(parts.wrist, W.clone().addScaledVector(d, -0.025), W.clone().addScaledVector(d, 0.012))
    const fingers = []
    HAND.fingers.forEach((h, i) => {
      const sp = fg.spread[i] * D
      let dir = d.clone().multiplyScalar(Math.cos(sp)).addScaledVector(sTh, Math.sin(sp)).normalize()
      const axis = dir.clone().cross(n).normalize()
      let P = W.clone().addScaledVector(d, h.base).addScaledVector(sTh, h.off).addScaledVector(n, -0.003)
      const pts = [P.clone()]
      h.len.forEach((len, k) => {
        dir = dir.clone().applyAxisAngle(axis, fg.curl[i][k] * D)
        const Q = P.clone().addScaledVector(dir, len)
        place(parts.fingers[i][k], P, Q)
        P = Q
        pts.push(Q.clone())
      })
      fingers.push(pts)
    })
    // the thumb: from the root of the palm on the thumb's side, out by its abduction and toward the palm by its lean
    const [ab, lean, c0, c1, c2] = fg.thumb
    const T0 = W.clone().addScaledVector(d, 0.022).addScaledVector(sTh, 0.021).addScaledVector(n, 0.004)
    let tdir = d.clone().multiplyScalar(Math.cos(ab * D)).addScaledVector(sTh, Math.sin(ab * D)).normalize()
    tdir.addScaledVector(n, Math.tan(lean * D)).normalize()
    const taxis = tdir.clone().cross(sTh.clone().negate().add(n).normalize()).normalize()
    let P = T0.clone()
    const tpts = [P.clone()]
    const ringTarget = fingers[1][1].clone().lerp(fingers[1][2], 0.5).addScaledVector(n, 0.012)
    HAND.thumb.len.forEach((len, k) => {
      tdir = tdir.clone().applyAxisAngle(taxis, [c0, c1, c2][k] * D)
      let Q = P.clone().addScaledVector(tdir, len)
      if (k === 1 && fg.ring > 0.01) {
        // the ring with the middle finger: the last two bones reach for the middle finger's middle bone
        const { E, W: T } = ik(P, ringTarget, len, HAND.thumb.len[2], n.clone().negate().add(sTh))
        const E2 = Q.clone().lerp(E, fg.ring), T2 = P.clone().addScaledVector(tdir, len).addScaledVector(tdir, HAND.thumb.len[2]).lerp(T, fg.ring)
        place(parts.thumb[1], P, E2)
        place(parts.thumb[2], E2, T2)
        tpts.push(E2.clone(), T2.clone())
        P = T2
        return
      }
      if (k === 2 && fg.ring > 0.01) return
      place(parts.thumb[k], P, Q)
      P = Q
      tpts.push(Q.clone())
    })
    return { d, n, sTh, palmC, fingers, thumb: tpts }
  }

  // camera: three-quarters from the figure's right and front, framing both standing and prostration
  function frame() {
    const w = canvas.clientWidth || 390, h = canvas.clientHeight || 320
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  // The camera comes a little closer and lower as the figure goes down, so kneeling and prostration read as clearly
  // as standing; it follows the hips, so it moves as softly as the figure does.
  function placeCamera(j) {
    const low = Math.min(1, Math.max(0, (0.92 - j.pelvis.y) / 0.6))
    const e = low * low * (3 - 2 * low)
    const target = V(j.pelvis.x * 0.8, lerp(0.62, 0.3, e), lerp(0.38, 0.46, e))
    const dir = V(-0.78, lerp(0.2, 0.34, e), 0.62).normalize()
    const dist = (camera.aspect < 1.05 ? 1.12 : 1) * lerp(5.0, 3.9, e)
    camera.position.copy(target).addScaledVector(dir, dist)
    camera.lookAt(target)
  }

  // ---- the feet close-up ----
  function placeFeetCam() {
    const { feet: Fp } = last
    const R = Fp.R, Lf = Fp.L
    let target, offset
    const feetMode = views.feet.mode
    if (feetMode === 'sujud') {
      // from the right, a little behind and above: the right foot upright in profile, its toes bent on the rug toward
      // the qibla, the left foot beside it
      target = R.B.clone().lerp(Lf.B, 0.3).add(V(-0.02, 0.075, -0.02))
      offset = V(-0.9, 0.32, -0.24).setLength(0.8)
    } else if (feetMode === 'tawarruk') {
      // from the right and a little in front: the left foot coming out from under the right shin
      target = R.B.clone().lerp(Lf.B, 0.5).add(V(0.0, 0.06, 0.0))
      offset = V(-0.9, 0.42, -0.18).setLength(0.9)
    } else {
      // from the right and a little behind: the right foot upright, the left laid flat under the seat
      target = R.B.clone().lerp(Lf.B, 0.42).add(V(0, 0.075, -0.01))
      offset = V(-0.86, 0.3, -0.42).setLength(0.8)
    }
    feetCam.position.copy(target).add(offset)
    feetCam.lookAt(target)
    feetCam.updateMatrixWorld()
  }
  function placeMarkers() {
    const feetMode = views.feet.mode
    dots.forEach((d, i) => { d.visible = rings[i].visible = false })
    arrow.visible = !!feetMode
    if (!feetMode) return
    const show = (i, Fd) => {
      // on the top of the bent toes of an upright foot
      const p = Fd.B.clone().lerp(Fd.tips[1], 0.62).addScaledVector(Fd.u, 0.012).add(V(0, 0.016, 0))
      dots[i].position.copy(p)
      rings[i].position.copy(p); rings[i].quaternion.copy(feetCam.quaternion)
      dots[i].visible = rings[i].visible = true
    }
    show(0, last.feet.R)
    if (feetMode === 'sujud') show(1, last.feet.L)
    // on the rug to the right of the feet (beyond the outermost toe), pointing to the qibla
    const B = last.feet.R.B
    const outer = Math.min(B.x, ...last.feet.R.tips.map((q) => q.x), ...last.feet.L.tips.map((q) => q.x))
    arrow.position.set(outer - 0.08, 0.004, B.z - 0.07)
    arrow.updateMatrixWorld()
  }
  // the seven-places camera: from the figure's right and above (azimuth 270° from the qibla, elevation SEVEN_EL), framed
  // to the whole figure with its seven contacts. No camera sees all seven contacts on an opaque figure (the palms under the
  // forearms, the knees under the trunk, the forehead under the head; checked by casting rays at 1,656 directions, at most
  // 4 of 7 in view), so in this close-up alone the figure is drawn see-through (SEVEN_GHOST) and the contacts show.
  const SEVEN_AZ = 270, SEVEN_EL = 58, SEVEN_GHOST = 0.4
  function placeSevenCam() {
    const { j, hands, feet: Fp } = last
    const a = SEVEN_AZ * D, e = SEVEN_EL * D
    const dir = V(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
    const tubePts = (t) => { const p = t.pos, out = []; for (let i = 0; i < p.length; i += 9) out.push(V(p[i], p[i + 1], p[i + 2])); return out }
    const pts = [...tubePts(torso), ...tubePts(robeUp), ...tubePts(robeLow), ...sevenContacts(),
      j.head.clone().add(V(0, L.headR, 0)), j.head.clone().add(V(0, 0, L.headR)), j.head.clone().add(V(0, 0, -L.headR)),
      ...[hands.R, hands.L].flatMap((h) => h.fingers.map((f) => f[3])), ...[Fp.R, Fp.L].flatMap((f) => [f.B, ...f.tips])]
    let tgt = V(j.pelvis.x, 0.2, (j.pelvis.z + j.head.z) / 2), dist = 1.5
    for (let it = 0; it < 4; it++) {
      sevenCam.position.copy(tgt).addScaledVector(dir, dist)
      sevenCam.lookAt(tgt)
      sevenCam.updateMatrixWorld()
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1
      for (const P of pts) { const q = P.clone().project(sevenCam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y) }
      const z = tgt.clone().project(sevenCam).z
      tgt = V((x0 + x1) / 2, (y0 + y1) / 2, z).unproject(sevenCam)
      dist *= Math.max((x1 - x0) / 2 / 0.84, (y1 - y0) / 2 / 0.8)
    }
    sevenCam.position.copy(tgt).addScaledVector(dir, dist)
    sevenCam.lookAt(tgt)
    sevenCam.updateMatrixWorld()
  }
  // the figure's materials and how they were, to put back after the see-through render
  const ghostMats = new Map()
  fig.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => ghostMats.set(m, { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite })) })
  function ghost(on) {
    for (const [m, was] of ghostMats) {
      m.transparent = on ? true : was.transparent
      m.opacity = on ? was.opacity * SEVEN_GHOST : was.opacity
      m.depthWrite = on ? false : was.depthWrite
      m.needsUpdate = true
    }
  }
  // the seven places where the body meets the rug, from the same points the measurements use (src/measure.js): the
  // head's lowest point (the forehead with the nose), the palms' centres, the robe's lowest point under each knee joint,
  // the second toes' tips; each brought down to the rug's top (y = 0)
  function sevenContacts() {
    const { j, hands, feet: Fp, headLow } = last
    const knee = (k) => {
      // the robe's points within 4 cm of the knee joint, horizontally, that rest on the rug (≤ 1 cm): their centre
      let sx = 0, sz = 0, n = 0
      for (const t of [robeLow, robeLow2]) {
        if (!t.mesh.visible) continue
        const a = t.pos
        for (let i = 0; i < a.length; i += 3) {
          const dx = a[i] - k.x, dz = a[i + 2] - k.z
          if (a[i + 1] > 0.01 || dx * dx + dz * dz > 0.04 * 0.04) continue
          sx += a[i]; sz += a[i + 2]; n++
        }
      }
      return n ? V(sx / n, 0, sz / n) : V(k.x, 0, k.z)
    }
    const down = (P) => V(P.x, 0, P.z)
    return [down(headLow), down(hands.R.palmC), down(hands.L.palmC), knee(j.kneeR), knee(j.kneeL), down(Fp.R.tips[1]), down(Fp.L.tips[1])]
  }
  function placeSeven() {
    const pts = sevenContacts()
    sevenDots.forEach((g, i) => { g.position.copy(pts[i]); g.quaternion.copy(sevenCam.quaternion); g.updateMatrixWorld() })
    return pts
  }
  function placeHandCam() {
    // the right hand from the right, in front and above
    const target = last.hands.R.palmC.clone().add(V(0, 0.012, 0.03))
    handCam.position.copy(target).add(V(-0.75, 0.75, 0.55).setLength(0.42))
    handCam.lookAt(target)
    handCam.updateMatrixWorld()
  }
  const proj = (P, cam) => { const p = P.clone().project(cam); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 } }
  function renderViews() {
    const out = { feet: null, seven: null, hand: null }
    if (!last) return out
    for (const [name, v] of Object.entries(views)) {
      if (!v.renderer || !v.mode) continue
      const w = v.canvas.clientWidth || 320, h = v.canvas.clientHeight || 200
      v.renderer.setSize(w, h, false)
      v.cam.aspect = w / h
      v.cam.updateProjectionMatrix()
      if (name === 'feet') {
        placeFeetCam(); placeMarkers()
        v.renderer.render(scene, feetCam)
        out.feet = proj(V(0, 0.26, 0).applyMatrix4(arrow.matrixWorld), feetCam)
      } else if (name === 'seven') {
        placeSevenCam()
        const pts = placeSeven()
        ghost(true)
        v.renderer.render(scene, sevenCam)
        ghost(false)
        out.seven = pts.map((P) => proj(P, sevenCam))
      } else {
        placeHandCam()
        v.renderer.render(scene, handCam)
        out.hand = true
      }
    }
    return out
  }

  let raf = 0, needs = true, disposed = false
  function requestRender() {
    if (disposed) return
    needs = true
    if (!raf) raf = requestAnimationFrame(loop)
  }
  let lastViews = { feet: null, seven: null, hand: null }
  function loop(time) {
    raf = 0
    if (disposed) return
    let k = 1
    if (animating) {
      k = dur ? (time - t0) / dur : 1
      if (k >= 1) {
        k = 1
        animating = false
        if (seq && seq.length) {
          const next = seq.shift()
          go(next.pose, next.dur, next.hold)
        } else seq = null
      }
    }
    build(poseAt(k), time)
    renderer.render(scene, camera)
    lastViews = renderViews()
    if (opts.onFeet) opts.onFeet(lastViews.feet)
    if (opts.onViews) opts.onViews(lastViews)
    const idle = !reduced() && !opts.still
    if (animating || idle || needs) {
      needs = false
      if (animating || idle) raf = requestAnimationFrame(loop)
    }
  }

  // A new movement starts from wherever the figure is now, even halfway through another one.
  function go(target, ms, hold = 0) {
    const p = poseAt(animating ? (performance.now() - t0) / dur : 1)
    const cur = { arms: p.e < 0.5 ? from.arms : to.arms }
    for (const n of NUM_KEYS) cur[n] = p[n]
    from = cur
    to = { ...target }
    t0 = performance.now() + hold
    dur = ms
    animating = true
    requestRender()
  }

  function setPose(name, { instant = false } = {}) {
    seq = null
    const target = POSES[name] || POSES.stand
    const instantNow = instant || reduced() || opts.still
    if (name === 'taslim' || name === 'taslim_tw') {
      const base = POSES[name]
      const right = { ...base, yaw: -62 }, left = { ...base, yaw: 62 }
      if (instantNow) {
        from = { ...right }; to = { ...right }; animating = false
        requestRender()
        return
      }
      go(base, 1500)
      seq = [{ pose: right, dur: 1300, hold: 300 }, { pose: left, dur: 2200, hold: 1300 }, { pose: base, dur: 1500, hold: 1300 }]
      return
    }
    if (instantNow) {
      from = { ...target }; to = { ...target }; animating = false
      requestRender()
      return
    }
    if (name === 'itidal' || name === 'stand3') {
      go(POSES.raise, 1500)
      seq = [{ pose: POSES[name], dur: 1300, hold: 700 }]
      return
    }
    go(target, 1500)
  }

  // the measurements' view of the figure (tools/measure.mjs): every joint and the meshes' points, in world space
  function measure() {
    const pts = (tube) => { const a = tube.pos, out = []; for (let i = 0; i < a.length; i += 3) out.push(V(a[i], a[i + 1], a[i + 2])); return out }
    const headPts = []
    headG.updateMatrixWorld(true)
    for (const m of [skull, hair, cap]) {
      const pa = m.geometry.attributes.position
      for (let i = 0; i < pa.count; i++) headPts.push(V().fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld))
    }
    return { ...last, L, torso: pts(torso), robeUp: pts(robeUp), robeLow: pts(robeLow), robeLow2: robeLow2.mesh.visible ? pts(robeLow2) : [], head: headPts,
      footBody: { R: pts(feet.R.body), L: pts(feet.L.body) } }
  }

  frame()
  setTheme(theme)
  const ro = new ResizeObserver(() => { frame(); requestRender() })
  ro.observe(canvas)
  return {
    setPose,
    setTheme,
    replay(prev, name) {
      setPose(prev, { instant: true })
      setTimeout(() => { if (!disposed) setPose(name) }, 60)
    },
    // the app: the page is left (lessons/<id>/lesson.js destroy)
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      for (const r of [renderer, ...Object.values(views).map((v) => v.renderer)]) {
        if (!r) continue
        r.dispose()
        r.forceContextLoss()
      }
    },
    get ready() { return true },
    // renders now; returns where the close-ups' labels go: { feet: {x, y}, seven: [{x, y} × 7], hand }
    renderNow() { build(poseAt(1), performance.now()); renderer.render(scene, camera); lastViews = renderViews(); return lastViews },
    // a close-up on its own canvas: name 'feet' (mode 'sit', 'sujud', 'tawarruk'), 'seven' (mode 'sujud'), 'hand'
    // (mode 'tashahhud'); a null mode stops it
    attachView(name, c2, mode) {
      const v = views[name]
      if (c2 && c2 !== v.canvas) {
        v.canvas = c2
        v.renderer = newRenderer(c2)
        v.renderer.toneMappingExposure = THEMES[theme].exposure
      }
      v.mode = mode
      requestRender()
    },
    attachFeet(c2, mode) { this.attachView('feet', c2, mode) },
    get feet() { return lastViews.feet },
    measure,
    // the seven contact places and the seven-places camera (src/measure.js checks that each is in view)
    sevenContacts() { return last ? sevenContacts() : null },
    sevenCamera() { placeSevenCam(); return sevenCam },
    scene, renderer, camera, markers,
  }
}
