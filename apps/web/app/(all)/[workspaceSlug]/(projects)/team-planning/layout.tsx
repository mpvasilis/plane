import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Planning",
  description: "Plan and manage team workload across the week",
};

interface TeamPlanningLayoutProps {
  children: ReactNode;
}

export default function TeamPlanningLayout({ children }: TeamPlanningLayoutProps) {
  return children;
}