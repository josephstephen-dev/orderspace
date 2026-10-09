import type { MembershipRole } from '../../generated/prisma/enums';

/** Who is performing a member-management action, and with what authority. */
export interface ActingMember {
    userId: string;
    role: MembershipRole;
}
