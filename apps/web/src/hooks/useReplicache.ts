import { useContext } from "react";
import { ReplicacheContext } from "@/components/sync/ReplicacheProvider";

export function useReplicache() {
    const { rep } = useContext(ReplicacheContext);
    return rep;
}
