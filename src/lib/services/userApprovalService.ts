import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export interface UserApprovalRequest {
    id: string;
    userId: string;
    email: string;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewReason?: string;
    [key: string]: any;
}

/**
 * Service to handle user approval logic
 */
export class UserApprovalService {
    /**
     * Fetch pending user approval requests
     * @param limit - Maximum number of requests to fetch
     * @returns List of pending requests and total count
     */
    static async getPendingApprovals(limit = 50): Promise<{ approvals: UserApprovalRequest[]; totalPending: number }> {
        try {
            const pendingSnapshot = await adminDb
                .collection("userApprovals")
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(limit)
                .get();

            const approvals = pendingSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || doc.data().createdAt,
            })) as UserApprovalRequest[];

            const countSnapshot = await adminDb
                .collection("userApprovals")
                .where("status", "==", "pending")
                .count()
                .get();

            return {
                approvals,
                totalPending: countSnapshot.data().count,
            };
        } catch (error) {
            logger.error({ error }, "Error fetching pending user approvals");
            throw error;
        }
    }

    /**
     * Process an approval request (approve or reject)
     * @param approvalId - ID of the approval document
     * @param action - 'approve' or 'reject'
     * @param adminUserId - ID of the admin performing the review
     * @param reason - Optional reason for rejection/approval
     */
    static async processApproval(
        approvalId: string,
        action: "approve" | "reject",
        adminUserId: string,
        reason?: string
    ): Promise<boolean> {
        try {
            const approvalRef = adminDb.collection("userApprovals").doc(approvalId);
            const approvalDoc = await approvalRef.get();

            if (!approvalDoc.exists) {
                throw new Error("Approval request not found");
            }

            const status = action === "approve" ? "approved" : "rejected";

            await approvalRef.update({
                status,
                reviewedBy: adminUserId,
                reviewedAt: new Date(),
                reviewReason: reason || null,
            });

            logger.info(
                { approvalId, action, adminUserId },
                "User approval status updated"
            );

            return true;
        } catch (error) {
            logger.error({ error, approvalId, action }, "Error processing user approval");
            throw error;
        }
    }
}
