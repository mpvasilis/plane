"use client";

import React from "react";

interface TeamPlanningLayoutProps {
  children: React.ReactNode;
}

const TeamPlanningLayout: React.FC<TeamPlanningLayoutProps> = ({ children }) => (
  <div className="h-full w-full">
    {children}
  </div>
);

export default TeamPlanningLayout;