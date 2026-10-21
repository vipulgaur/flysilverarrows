/** "instructor" = Certified Flight Instructor (CFI); "ground" = Ground Instructor. */
export type Role = "admin" | "instructor" | "ground" | "student";

export const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  instructor: "Flight Instructor (CFI)",
  ground: "Ground Instructor",
  student: "Student Pilot",
};

export interface User extends StudentDetails {
  id: string;
  name: string;
  email: string;
  phone?: string | undefined;
  /** Small profile photo stored as a data URL on the member record. */
  photoUrl?: string | undefined;
  role: Role;
  callsign?: string | undefined;
  programId?: string | undefined;
  instructorId?: string | undefined;
  licence?: string | undefined;
  stage?: string | undefined;
  speciality?: string | undefined;
  medicalClass?: 1 | 2 | undefined;
  medicalExpiry?: string | undefined;
  ratingExpiry?: string | undefined;
  icaoLevel?: number | undefined;
  priorMinutes?: number | undefined;
  status: "active" | "deleted";
  deletedBy?: string | undefined;
  deletedAt?: string | undefined;
  statusReason?: string | undefined;
}

export interface Aircraft {
  id: string;
  reg: string;
  type: string;
  hourlyRate: number;
  totalHours: number;
  tachHours: number;
  lastService?: string | undefined;
  grounded: boolean;
}

export interface MaintenanceItem {
  id: string;
  aircraftId: string;
  title: string;
  dueHours?: number | undefined;
  dueDate?: string | undefined;
  intervalHours?: number | undefined;
  completedAt?: string | undefined;
}

export interface Lesson {
  id: string;
  name: string;
  kind: "flight" | "ground";
  minutes: number;
}

export interface Program {
  id: string;
  name: string;
  lessons: Lesson[];
}

export type BookingType = "lesson" | "solo" | "maintenance";
export type BookingStatus = "scheduled" | "completed" | "cancelled";

export interface Booking {
  id: string;
  start: string;
  end: string;
  type: BookingType;
  status: BookingStatus;
  approvalStatus?: "pending" | "approved" | "declined" | undefined;
  requestedBy?: string | undefined;
  requestedAt?: string | undefined;
  reviewedBy?: string | undefined;
  reviewedAt?: string | undefined;
  decisionNotes?: string | undefined;
  aircraftId?: string | undefined;
  instructorId?: string | undefined;
  studentId?: string | undefined;
  lessonId?: string | undefined;
  route?: string | undefined;
  notes?: string | undefined;
}

export type FlightKind = "dual" | "solo" | "sim";

export interface Flight {
  id: string;
  date: string;
  offBlock: string;
  onBlock: string;
  minutes: number;
  kind?: FlightKind | undefined;
  ifrMinutes?: number | undefined;
  nightLandings?: number | undefined;
  tachStart?: number | undefined;
  tachEnd?: number | undefined;
  aircraftId: string;
  pilotId: string;
  instructorId?: string | undefined;
  lessonId?: string | undefined;
  bookingId?: string | undefined;
  landings: number;
  from: string;
  to: string;
  grade?: number | undefined;
  remarks?: string | undefined;
}

export interface Completion {
  id: string;
  studentId: string;
  lessonId: string;
  date: string;
  instructorId?: string | undefined;
  grade?: number | undefined;
  flightId?: string | undefined;
}

export type RescheduleReason = "weather" | "medical" | "academic" | "personal";
export const reasonLabel: Record<RescheduleReason, string> = {
  weather: "Weather deterioration",
  medical: "Medical / health issue",
  academic: "Academic conflict",
  personal: "Personal emergency",
};

export interface ChangeRequest {
  id: string;
  bookingId: string;
  studentId: string;
  instructorId?: string | undefined;
  reason: RescheduleReason;
  details: string;
  proposedStart: string;
  proposedEnd: string;
  status: "pending" | "approved" | "declined";
  reviewerId?: string | undefined;
  notes?: string | undefined;
  reviewedAt?: string | undefined;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entityType: "booking" | "aircraft" | "user" | "lesson" | "flight" | "lecture" | "exam" | "duty" | "program" | "maintenance";
  entityId?: string | undefined;
  details: string;
}

/** Student registration details (matching the school's "New student" form). */
export const STUDENT_DETAIL_KEYS = ["address", "postCode", "city", "country", "dateOfBirth", "gender", "placeOfBirth", "userReference", "caaRef", "emergencyName", "emergencyPhone", "emergencyRelation", "publicNote", "adminNote", "instructorNote"] as const;
export type StudentDetailKey = (typeof STUDENT_DETAIL_KEYS)[number];
export type StudentDetails = Partial<Record<StudentDetailKey, string>>;

export type ProfileChanges = Partial<Pick<User, "name" | "email" | "phone" | "callsign" | "licence" | "speciality" | "medicalClass" | "medicalExpiry" | "ratingExpiry" | "icaoLevel" | StudentDetailKey>>;

export interface ProfileRequest {
  id: string;
  userId: string;
  submittedBy: string;
  changes: ProfileChanges;
  before: ProfileChanges;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  reviewedAt?: string | undefined;
  reviewerId?: string | undefined;
  notes?: string | undefined;
}

export interface TheorySubject {
  id: string;
  code: string;
  name: string;
}

export interface ExamResult {
  id: string;
  studentId: string;
  subjectId: string;
  score: number;
  passed: boolean;
  signedBy: string;
  date: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
}

export interface Lecture {
  id: string;
  subjectId: string;
  title: string;
  start: string;
  end: string;
  roomId: string;
  instructorId: string;
  enrolled: string[];
  attended: string[];
  signedOff: boolean;
}

export interface DutyLog {
  id: string;
  instructorId: string;
  start: string;
  end?: string | undefined;
}

export interface LearningRecord {
  userId: string;
  chapterId: string;
  completed: boolean;
  bookmarked: boolean;
  notes: string;
  answers: Record<string, string>;
}

export interface AppData {
  learningRecords: LearningRecord[];
  users: User[];
  aircraft: Aircraft[];
  maintenance: MaintenanceItem[];
  programs: Program[];
  bookings: Booking[];
  flights: Flight[];
  completions: Completion[];
  requests: ChangeRequest[];
  activity: ActivityLog[];
  subjects: TheorySubject[];
  exams: ExamResult[];
  classrooms: Classroom[];
  lectures: Lecture[];
  duty: DutyLog[];
  profileRequests: ProfileRequest[];
  readNotificationIds: Record<string, string[]>;
}
