import { Prisma } from "@prisma/client";
type Db = Prisma.TransactionClient;
/** Friends who have to count before one membership charge is waived. */
export declare const REFERRAL_GOAL = 4;
/** Credits granted once, when a referred friend completes a first visit. */
export declare const REFERRAL_VISIT_CREDITS = 5;
export declare function friendQualifies(friendRupees: number, referrerRupees: number): boolean;
/** Paise taken off the next membership charge. Never more than the charge itself. */
export declare function waiverPaise(worthRupees: number, pricePaise: number): number;
export interface ReferralProgressView {
    joined: number;
    toUnlock: number;
    creditsEarned: number;
    worthRupees: number;
    monthReady: boolean;
    nextCycleStarted: boolean;
}
/**
 * Ring numbers for one cycle of 4.
 * Redeemed months stay consumed so the next four friends start a new ring.
 * An open month with nobody toward the next cycle shows 4, unlocked.
 */
export declare function referralProgressView(input: {
    qualified: number;
    openMonths: number;
    redeemedMonths: number;
    creditsGranted: number;
    openWorthRupees: number;
    gymMonthlyRupees: number;
}): ReferralProgressView;
export interface ReferralSettleResult {
    referrerId: string;
    creditsGranted: number;
    monthUnlocked: boolean;
    worthRupees: number;
}
/**
 * Records a referred friend's first visit once.
 * The friendId primary key is what stops a second credit grant.
 * Callers that already paid, before this table existed, must not call this.
 */
export declare function settleFirstReferralVisit(db: Db, friend: {
    id: string;
    name: string | null;
    referredByUserId: string | null;
}): Promise<ReferralSettleResult | null>;
export declare function referralSnapshot(userId: string): Promise<ReferralProgressView>;
/** Auto-completed visits never pass the staff desk, so the reward is settled here. */
export declare function settleReferralVisitIfNeeded(userId: string): Promise<void>;
export declare function notifyReferralReward(result: ReferralSettleResult | null): void;
/**
 * A desk undo of the friend's only visit stops counting them toward a free month.
 * Credits already granted stay in the wallet.
 */
export declare function noteReferralVisitUndone(db: Db, friendId: string): Promise<void>;
export declare function quotedFreeMonth(userId: string, pricePaise: number): Promise<{
    freeMonthId: string | null;
    waiverPaise: number;
    chargePaise: number;
}>;
export declare function redeemFreeMonth(db: Db, userId: string, freeMonthId: string): Promise<boolean>;
/** Uses one open month after a membership activates. Returns the paise waived. */
export declare function redeemOpenFreeMonth(db: Db, userId: string, pricePaise: number): Promise<number>;
export {};
//# sourceMappingURL=referralRewards.d.ts.map