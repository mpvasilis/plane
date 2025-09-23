import { useContext } from "react";
// mobx store
import { StoreContext } from "@/contexts/store-context";
// types
import { ITeamPlanningStore } from "@/store/team-planning";

export const useTeamPlanning = (): ITeamPlanningStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useTeamPlanning must be used within StoreProvider");
  return context.teamPlanning;
};