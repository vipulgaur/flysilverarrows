import type { AppData, Flight, ActivityLog, Completion } from "./types";

function at(dayOffset: number, hour: number, min = 0) {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}
const day = (o: number) => at(o, 12).slice(0, 10);
const pad = (n: number) => String(n).padStart(2, "0");

/** Builds a realistic historical logbook for a student. */
function history(pilotId: string, instructorId: string, count: number, startDay: number, lessonIds: string[], seedId: string): Flight[] {
  const out: Flight[] = [];
  for (let i = 0; i < count; i++) {
    const dayOff = startDay + Math.round((i * -startDay) / count);
    const solo = i > count * 0.7 && i % 2 === 0;
    const sim = i % 7 === 3;
    const mins = sim ? 60 : 70 + ((i * 17) % 50);
    const off = 8 + (i % 6);
    const end = off * 60 + mins;
    out.push({
      id: `${seedId}-${i}`,
      date: day(dayOff),
      offBlock: `${pad(off)}:00`,
      onBlock: `${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
      minutes: mins,
      kind: sim ? "sim" : solo ? "solo" : "dual",
      ifrMinutes: sim ? 50 : i % 5 === 0 ? 20 : 0,
      nightLandings: i % 9 === 4 ? 2 : 0,
      aircraftId: sim ? "a-sim" : i % 3 === 0 ? "a-2" : "a-1",
      pilotId,
      instructorId: solo ? undefined : instructorId,
      lessonId: lessonIds[i],
      landings: sim ? 0 : 1 + (i % 4),
      from: "EKAH",
      to: i % 6 === 5 ? "EKBI" : "EKAH",
      grade: lessonIds[i] ? 3 + (i % 3) : undefined,
      remarks: lessonIds[i] ? "Objectives met per CBTA norm." : undefined,
    });
  }
  return out;
}

export function seedData(): AppData {
  const ppl = ["l-1", "l-2", "l-3", "l-4", "l-5", "l-6", "l-7", "l-8", "l-9", "l-10"];
  const anaFlights = history("u-ana", "u-vpl", 24, -150, [undefined, "l-2", "l-3", undefined, "l-4", "l-5", undefined, "l-6", undefined, "l-7"] as string[], "fa");
  const arpFlights = history("u-arp", "u-vpl", 8, -50, [undefined, "l-2", "l-3"] as string[], "fb");
  const lnlFlights = history("u-lnl", "u-prn", 11, -70, [undefined, "l-2", "l-3", undefined, "l-4"] as string[], "fc");
  const flights = [...anaFlights, ...arpFlights, ...lnlFlights];
  const completions: Completion[] = flights
    .filter((f) => f.lessonId && (f.grade ?? 0) >= 3)
    .map((f) => ({ id: `c-${f.id}`, studentId: f.pilotId, lessonId: f.lessonId!, date: f.date, instructorId: f.instructorId, grade: f.grade, flightId: f.id }));
  completions.push(
    { id: "c-g1", studentId: "u-ana", lessonId: "l-1", date: day(-160), instructorId: "u-vpl", grade: undefined, flightId: undefined },
    { id: "c-g2", studentId: "u-arp", lessonId: "l-1", date: day(-55), instructorId: "u-vpl", grade: undefined, flightId: undefined },
  );

  const act = (o: number, h: number, m: number, a: Omit<ActivityLog, "id" | "at">): ActivityLog => ({ id: `act-${o}-${h}-${m}`, at: at(o, h, m), ...a });

  return {
    learningRecords: [],
    profileRequests: [],
    readNotificationIds: {},
    users: [
      { id: "u-admin", name: "Sakshi Gaur", email: "sakshi@silverarrows.aero", role: "admin", callsign: "SKG", status: "active" },
      { id: "u-vpl", name: "Vipul Aviation", email: "vipul@silverarrows.aero", role: "instructor", callsign: "VPL", licence: "FI(A) / IRI / CRI", stage: "Chief Flight Instructor", medicalClass: 1, medicalExpiry: day(301), ratingExpiry: day(300), priorMinutes: 4820 * 60, status: "active" },
      { id: "u-prn", name: "Priya Nair", email: "priya@silverarrows.aero", role: "instructor", callsign: "PRN", licence: "FI(A) / CRI", stage: "Flight Instructor", medicalClass: 1, medicalExpiry: day(41), ratingExpiry: day(190), priorMinutes: 1640 * 60, status: "active" },
      { id: "u-anj", name: "Anujay Singh", email: "anujay@silverarrows.aero", role: "ground", callsign: "ANJ", stage: "Chief Ground Instructor", speciality: "Meteorology", status: "active" },
      { id: "u-ana", name: "Ananya Sharma", email: "ananya@mail.com", role: "student", callsign: "ANA", licence: "DK.SPL.90214", stage: "Solo cross-country prep", programId: "p-ppl", instructorId: "u-vpl", medicalClass: 2, medicalExpiry: day(438), icaoLevel: 5, status: "active" },
      { id: "u-arp", name: "Aarav Patel", email: "aarav@mail.com", role: "student", callsign: "ARP", licence: "DK.SPL.90388", stage: "Pre-solo circuits", programId: "p-ppl", instructorId: "u-vpl", medicalClass: 2, medicalExpiry: day(52), icaoLevel: 4, status: "active" },
      { id: "u-lnl", name: "Liam Nielsen", email: "liam@mail.com", role: "student", callsign: "LNL", licence: "DK.SPL.90412", stage: "Upper air work", programId: "p-ppl", instructorId: "u-prn", medicalClass: 2, medicalExpiry: day(610), icaoLevel: 6, status: "active" },
      { id: "u-rhv", name: "Rohan Verma", email: "rohan@mail.com", role: "student", callsign: "RHV", programId: "p-night", instructorId: "u-prn", medicalClass: 2, medicalExpiry: day(-20), status: "deleted", deletedBy: "u-admin", deletedAt: at(-3, 17, 59), statusReason: "Soft-deleted by Admin Sakshi Gaur" },
    ],
    aircraft: [
      { id: "a-1", reg: "OY-AAA", type: "Cessna 172S", hourlyRate: 220, totalHours: 1050.5, tachHours: 1048.2, lastService: day(-12), grounded: false },
      { id: "a-2", reg: "OY-BBB", type: "Cessna 172S", hourlyRate: 220, totalHours: 320.5, tachHours: 318.9, lastService: day(-15), grounded: false },
      { id: "a-3", reg: "OY-CCC", type: "Diamond DA42", hourlyRate: 390, totalHours: 140.0, tachHours: 139.1, lastService: day(-15), grounded: false },
      { id: "a-sim", reg: "SIM-01", type: "ALSIM AL42 FNPT II", hourlyRate: 140, totalHours: 2210.0, tachHours: 2210.0, lastService: day(-40), grounded: false },
    ],
    maintenance: [
      { id: "m-1", aircraftId: "a-1", title: "50h inspection", dueHours: 1065.3, intervalHours: 50 },
      { id: "m-2", aircraftId: "a-2", title: "50h inspection", dueHours: 365, intervalHours: 50 },
      { id: "m-3", aircraftId: "a-3", title: "100h inspection", dueHours: 178, intervalHours: 100 },
      { id: "m-4", aircraftId: "a-3", title: "ARC renewal", dueDate: day(9) },
      { id: "m-5", aircraftId: "a-sim", title: "Annual qualification test", dueDate: day(120) },
    ],
    programs: [
      {
        id: "p-ppl",
        name: "EASA PPL(A) Integrated",
        lessons: [
          { id: "l-1", name: "Ex 1–2 Familiarisation & briefing", kind: "ground", minutes: 120 },
          { id: "l-2", name: "Ex 4 Effects of controls", kind: "flight", minutes: 60 },
          { id: "l-3", name: "Ex 6 Straight & level", kind: "flight", minutes: 60 },
          { id: "l-4", name: "Ex 7–8 Climbing & descending", kind: "flight", minutes: 60 },
          { id: "l-5", name: "Ex 10 Stalling", kind: "flight", minutes: 60 },
          { id: "l-6", name: "Ex 12–13 Circuits", kind: "flight", minutes: 75 },
          { id: "l-7", name: "Ex 14 First solo", kind: "flight", minutes: 30 },
          { id: "l-8", name: "Ex 18 Navigation", kind: "flight", minutes: 120 },
          { id: "l-9", name: "Solo cross-country", kind: "flight", minutes: 150 },
          { id: "l-10", name: "Navigation check ride", kind: "flight", minutes: 120 },
        ],
      },
      {
        id: "p-night",
        name: "Night Rating",
        lessons: [
          { id: "n-1", name: "Night theory", kind: "ground", minutes: 180 },
          { id: "n-2", name: "Night circuits", kind: "flight", minutes: 90 },
          { id: "n-3", name: "Night navigation", kind: "flight", minutes: 120 },
        ],
      },
    ],
    bookings: [
      { id: "BK-101", start: at(0, 15, 30), end: at(0, 17, 30), type: "lesson", status: "scheduled", aircraftId: "a-1", instructorId: "u-vpl", studentId: "u-arp", lessonId: "l-4", route: "EKAH → EKAH" },
      { id: "BK-102", start: at(2, 14), end: at(2, 16), type: "lesson", status: "scheduled", aircraftId: "a-1", instructorId: "u-vpl", studentId: "u-ana", lessonId: "l-8", route: "EKAH → EKAH" },
      { id: "BK-103", start: at(1, 10), end: at(1, 12), type: "lesson", status: "scheduled", aircraftId: "a-2", instructorId: "u-prn", studentId: "u-lnl", lessonId: "l-5", route: "EKAH → EKAH" },
      { id: "BK-104", start: at(3, 8), end: at(3, 12), type: "maintenance", status: "scheduled", aircraftId: "a-1", notes: "50h inspection" },
      { id: "BK-105", start: at(4, 9), end: at(4, 11), type: "lesson", status: "scheduled", aircraftId: "a-3", instructorId: "u-vpl", studentId: "u-ana", lessonId: "l-9", route: "EKAH → EKBI → EKAH" },
      { id: "BK-106", start: at(1, 13), end: at(1, 14), type: "lesson", status: "scheduled", aircraftId: "a-sim", instructorId: "u-prn", studentId: "u-arp", route: "SIM" },
    ],
    flights,
    completions,
    requests: [
      {
        id: "RQ-1",
        bookingId: "BK-102",
        studentId: "u-ana",
        instructorId: "u-vpl",
        reason: "weather",
        details: "Severe crosswind forecast at EKAH exceeds solo limit (22 kt).",
        proposedStart: at(3, 14),
        proposedEnd: at(3, 16),
        status: "pending",
        createdAt: at(0, 9, 32),
      },
    ],
    activity: [
      act(0, 9, 32, { actorId: "u-ana", actorName: "Ananya Sharma", actorRole: "student", action: "reschedule_requested", entityType: "booking", entityId: "BK-102", details: "Requested reschedule for BK-102 (reason: weather)" }),
      act(0, 9, 30, { actorId: "u-anj", actorName: "Anujay Singh", actorRole: "ground", action: "theory_exam_passed", entityType: "exam", details: "Signed off Meteorology exam for Aarav Patel (81%)" }),
      act(-1, 17, 25, { actorId: "u-vpl", actorName: "Vipul Aviation", actorRole: "instructor", action: "debrief_completed", entityType: "flight", details: "Completed post-flight debrief on OY-AAA (tach 1048.2 h)" }),
      act(-1, 16, 15, { actorId: "u-admin", actorName: "Sakshi Gaur", actorRole: "admin", action: "batch_entities_created", entityType: "aircraft", details: "Created 2 aircraft (OY-BBB, OY-CCC) via batch tool" }),
      act(-3, 17, 59, { actorId: "u-admin", actorName: "Sakshi Gaur", actorRole: "admin", action: "user_soft_deleted", entityType: "user", entityId: "u-rhv", details: "Soft-deleted Rohan Verma (medical expired, inactive)" }),
    ],
    subjects: [
      { id: "s-alw", code: "ALW", name: "Air Law" },
      { id: "s-hpl", code: "HPL", name: "Human Performance" },
      { id: "s-met", code: "MET", name: "Meteorology" },
      { id: "s-com", code: "COM", name: "Communications" },
      { id: "s-pof", code: "POF", name: "Principles of Flight" },
      { id: "s-ops", code: "OPS", name: "Operational Procedures" },
      { id: "s-fpp", code: "FPP", name: "Flight Performance & Planning" },
      { id: "s-agk", code: "AGK", name: "Aircraft General Knowledge" },
      { id: "s-nav", code: "NAV", name: "Navigation" },
    ],
    exams: [
      { id: "e-1", studentId: "u-ana", subjectId: "s-alw", score: 92, passed: true, signedBy: "u-anj", date: day(-90) },
      { id: "e-2", studentId: "u-ana", subjectId: "s-met", score: 88, passed: true, signedBy: "u-anj", date: day(-60) },
      { id: "e-3", studentId: "u-ana", subjectId: "s-nav", score: 95, passed: true, signedBy: "u-anj", date: day(-40) },
      { id: "e-4", studentId: "u-ana", subjectId: "s-agk", score: 84, passed: true, signedBy: "u-anj", date: day(-30) },
      { id: "e-5", studentId: "u-ana", subjectId: "s-com", score: 90, passed: true, signedBy: "u-anj", date: day(-20) },
      { id: "e-6", studentId: "u-ana", subjectId: "s-ops", score: 81, passed: true, signedBy: "u-anj", date: day(-10) },
      { id: "e-7", studentId: "u-arp", subjectId: "s-alw", score: 86, passed: true, signedBy: "u-anj", date: day(-25) },
      { id: "e-8", studentId: "u-arp", subjectId: "s-met", score: 81, passed: true, signedBy: "u-anj", date: day(0) },
      { id: "e-9", studentId: "u-lnl", subjectId: "s-alw", score: 90, passed: true, signedBy: "u-anj", date: day(-35) },
      { id: "e-10", studentId: "u-lnl", subjectId: "s-met", score: 68, passed: false, signedBy: "u-anj", date: day(-8) },
    ],
    classrooms: [
      { id: "r-alpha", name: "Briefing Room Alpha", capacity: 12 },
      { id: "r-bravo", name: "Briefing Room Bravo", capacity: 8 },
    ],
    lectures: [
      { id: "LC-1", subjectId: "s-met", title: "MET-01 Frontal systems", start: at(1, 9), end: at(1, 11, 30), roomId: "r-alpha", instructorId: "u-anj", enrolled: ["u-ana", "u-arp", "u-lnl"], attended: [], signedOff: false },
      { id: "LC-2", subjectId: "s-pof", title: "POF-02 Lift & drag", start: at(3, 13), end: at(3, 15), roomId: "r-bravo", instructorId: "u-anj", enrolled: ["u-ana", "u-lnl"], attended: [], signedOff: false },
      { id: "LC-0", subjectId: "s-alw", title: "ALW-04 Rules of the air", start: at(-2, 9), end: at(-2, 11), roomId: "r-alpha", instructorId: "u-anj", enrolled: ["u-ana", "u-arp", "u-lnl"], attended: ["u-ana", "u-lnl"], signedOff: true },
    ],
    duty: [{ id: "d-1", instructorId: "u-vpl", start: new Date(Date.now() - 228 * 60000).toISOString() }],
  };
}
