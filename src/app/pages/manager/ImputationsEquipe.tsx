import React from 'react';
import { CalendarImputations } from '../shared/CalendarImputations';

export const ImputationsEquipe: React.FC = () => (
  <CalendarImputations
    title="Team Time Entries"
    subtitle="View and monitor team time entries"
    homePath="/manager/dashboard"
    canEdit={false}
    canImpute={false}
  />
);
