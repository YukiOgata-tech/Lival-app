// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
// すべての関数を asia-northeast1 に固定（クライアントと一致させる）
setGlobalOptions({ region: "asia-northeast1" });
export * from "./onFriendRequestAccept";
export {scheduleRoomAutoEnd, endRoomByTask} from "./autoEnd";
export {onGroupSessionEnded} from "./groupSessionEnd";
export {onRoomInviteCreated} from "./onRoomInviteCreated";
export {settleOnRequest} from "./settleOnRequest";
export {eduAIClassify} from "./eduAI-classify";
export {eduAIPlannerChat} from "./eduAI-planner";
export {eduAICounselorChat} from "./eduAI-counselor";
export {eduAITutorChat} from "./eduAI-tutor";
export {ping} from "./ping";
export {whoami} from "./whoami";
export {initializeUserData} from "./initializeUserData";
export {migrateExistingUsers} from "./migrations/user-migration";
export {setSupabaseRoleOnCreate} from "./auth-supabase-claims";
export {ensureSupabaseAuthenticatedClaim} from "./ensure-supabase-role";
