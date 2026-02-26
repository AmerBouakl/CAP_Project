import React from 'react';
import { CalendarImputations } from '../shared/CalendarImputations';

export const MesImputations: React.FC = () => (
  <CalendarImputations
    title="My Time Entries"
    subtitle="Log your working hours using the bi-weekly calendar"
    homePath="/consultant-tech/dashboard"
    canEdit={true}
    canImpute={true}
  />
);

