import React from 'react';
import { CalendarImputations } from '../shared/CalendarImputations';

/**
 * Coordinateur Dev – allocation & assignment with imputation view.
 * Can allocate and assign resources but does not impute hours themselves.
 */
export const DevCoordImputations: React.FC = () => (
  <CalendarImputations
    title="Time Entries & Allocation"
    subtitle="Track team time entries and workload distribution"
    homePath="/dev-coordinator/dashboard"
    canEdit={false}
    canImpute={false}
  />
);
