import type { Application } from "../routes/launchOffer";
export type StoredGameResult = {
    level: number;
    outcome: string;
    you: number | null;
    zonofit: number | null;
};
export type EntryState = "missing" | "open" | "finished";
/** Whether this mobile already has a challenge entry. The phone is the primary key. */
export declare function launchGamePhoneTaken(phone: string): Promise<boolean>;
export declare function launchGameEntryState(phone: string): Promise<EntryState>;
/** Inserts one row. A second insert for the same phone returns "duplicate". */
export declare function insertLaunchGameEntry(application: Application, pid: string): Promise<"ok" | "duplicate">;
/** Drops an unfinished row so a failed sheet write does not burn the number. */
export declare function deleteOpenLaunchGameEntry(phone: string): Promise<void>;
/** Records the finished game once. A later update does not replace it. */
export declare function saveLaunchGameResult(phone: string, result: StoredGameResult): Promise<void>;
//# sourceMappingURL=launchGameEntries.d.ts.map