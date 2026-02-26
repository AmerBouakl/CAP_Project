import React from 'react';
import { CalendarImputations } from '../shared/CalendarImputations';

/**
 * Project Manager: validate submitted imputations and send validated periods to Stratime.
 */
export const PMImputations: React.FC = () => (
  <CalendarImputations
    title="Stratime Validation Hub"
    subtitle="Validate submitted team imputations and dispatch validated periods to Stratime"
    homePath="/project-manager/dashboard"
    canEdit={false}
    canImpute={false}
    canValidate
    canSendToStraTIME
  />
);
