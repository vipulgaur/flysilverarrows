import chapterOneSource from "@/content/learning/chapter-01.md?raw";
import chapterTwoSource from "@/content/learning/chapter-02.md?raw";
import chapterThreeSource from "@/content/learning/chapter-03.md?raw";
import chapterFourSource from "@/content/learning/chapter-04.md?raw";
import { parseLearningSource, type LearningSection } from "./learning-source";
export type { LearningBlock, LearningSection, LearningFigure } from "./learning-source";
export interface LearningChapter { id: string; number: number; title: string; page: string; sections: LearningSection[]; children: { label: string; title: string; page: string }[] }
export const courseTitle = "Private Pilot Ground School";
export const courseSubtitle = "Volume 1 · Flying Training";
const chapter = (number: number, title: string, page: string, children: LearningChapter["children"] = []): LearningChapter => ({ id: `chapter-${String(number).padStart(2, "0")}`, number, title, page, children, sections: number === 1 ? parseLearningSource(chapterOneSource) : number === 2 ? parseLearningSource(chapterTwoSource) : number === 3 ? parseLearningSource(chapterThreeSource) : number === 4 ? parseLearningSource(chapterFourSource) : [] });
const sub = (label: string, title: string, page: string) => ({ label, title, page });
export const learningChapters: LearningChapter[] = [
 chapter(1, "Aircraft Familiarisation", "1"),
 chapter(2, "Before and After Flight", "13", [sub("2a", "Preparation for Flight", "13"), sub("2b", "Starting and Stopping the Engine", "19"), sub("2c", "Post-Flight Actions", "23")]),
 chapter(3, "Air Experience", "25"),
 chapter(4, "The Controls", "29", [sub("4a", "The Primary Effect of Each Main Flight Control", "29"), sub("4b", "The Further Effect of Each Main Flight Control", "40"), sub("4c", "The Art of Trimming", "45"), sub("4d", "The Effect of Airspeed and Slipstream", "49"), sub("4e", "The Effects of Power Changes", "53"), sub("4f", "The Effect of Using Flaps", "57"), sub("4g", "Carburettor Heat", "60"), sub("4h", "The Mixture Control", "62"), sub("4i", "Using the Radio", "64"), sub("4j", "Cabin Heating and Ventilation", "68")]),
 chapter(5, "Taxiing an Aeroplane", "69"),
 chapter(6, "Straight and Level", "77", [sub("6a", "Flying Straight and Level in Balance at Constant Power", "77"), sub("6b", "Flying Straight and Level in Balance at a Selected Airspeed", "91"), sub("6c", "Cruising with Flap Extended", "96")]),
 chapter(7, "Climbing", "103"),
 chapter(8, "Descending", "115", [sub("8a", "The Glide", "115"), sub("8b", "The Powered Descent", "124"), sub("8c", "Use of Flap in the Descent", "128"), sub("8d", "The Sideslip", "133")]),
 chapter(9, "Turning", "137", [sub("9a", "The Medium Level Turn", "137"), sub("9b", "The Climbing Turn", "148"), sub("9c", "Descending Turns", "152"), sub("9d", "Turning onto Selected Headings", "164")]),
 chapter(10, "Stalling and Slow Flight", "167", [sub("10a", "Slow Flying", "167"), sub("10b", "Stalling", "173")]),
 chapter(11, "Spinning", "187", [sub("11a", "Incipient Spins", "187"), sub("11b", "Full Spins", "189")]),
 chapter(12, "Standard Take-Off and Climb to Downwind Leg", "197"),
 chapter(13, "Circuits, Approaches and Landings", "215", [sub("13a", "The Circuit, Powered Approach and Normal Landing", "215"), sub("13b", "The Go-Around", "232"), sub("13c", "Departing and Joining the Circuit", "236"), sub("13d", "The Flapless Approach and Landing", "243"), sub("13e", "The Glide Approach and Landing", "245"), sub("13f", "Crosswind Operations", "250"), sub("13g", "Short-Field Operations", "266"), sub("13h", "Soft-Field Operations", "270")]),
 chapter(14, "First Solo", "273"),
 chapter(15, "Advanced Turning", "275", [sub("15a", "The Steep Level Turn", "275"), sub("15b", "Recovery from Unusual Attitudes", "283"), sub("15c", "The Steep Descending Turn", "286")]),
 chapter(16, "The Forced Landing Without Power", "289"),
 chapter(17, "Precautionary Landings", "307", [sub("17a", "The Precautionary Search and Landing", "307"), sub("17b", "Ditching in Water", "313")]),
 chapter(18, "Pilot Navigation", "315", [sub("18a", "Pilot Navigation", "315"), sub("18b", "Navigation at Lower Levels and in Reduced Visibility", "336")]),
 chapter(19, "Instrument Flying", "347"),
];
export const bookExtras = [{ title: "Introduction", page: "ix" }, { title: "Appendix 1 — The PPL(A) Skill Test", page: "383" }, { title: "Index", page: "387" }];
export const availableChapters = learningChapters.filter(c => c.sections.length > 0);
export function chapterById(id: string) { return learningChapters.find(c => c.id === id); }
export const learningMeta = (title: string, description: string) => ({ meta: [
 { title: `${title} — SilverArrows Learning` }, { name: "description", content: description },
 { property: "og:title", content: `${title} — SilverArrows Learning` }, { property: "og:description", content: description },
 { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] });
